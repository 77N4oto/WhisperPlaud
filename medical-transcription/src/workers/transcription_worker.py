#!/usr/bin/env python3
"""
WhisperX Transcription Worker - Medical Audio Transcription

This worker processes audio transcription jobs using WhisperX, which integrates:
- Whisper large-v2/v3 for high-quality transcription
- Word-level timestamp alignment (phoneme-based)
- pyannote.audio for speaker diarization (built-in)
- Medical term correction

Key Features:
- GPU-accelerated (CUDA required, 6GB+ VRAM recommended)
- Real-time progress updates via Redis pub/sub
- Speaker diarization with automatic speaker assignment
- Medical term correction using custom dictionary
- S3/MinIO integration for audio and transcript storage

Environment Variables:
- HF_TOKEN: Hugging Face token for pyannote (required)
- WHISPER_MODEL_SIZE: Model size (default: large-v2)
- REDIS_URL: Redis connection string
- S3_ENDPOINT: MinIO/S3 endpoint URL
- S3_ACCESS_KEY, S3_SECRET_KEY: S3 credentials
- S3_BUCKET: S3 bucket name

System Requirements:
- NVIDIA GPU with CUDA 11.8+
- 6GB+ VRAM
- FFmpeg installed

Usage:
    python transcription_worker.py

Author: WhisperPlaud Project
Date: 2025-10-17
"""

import os
import sys
import json
import time
import logging
import signal
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

import redis
import boto3
from botocore.config import Config
from dotenv import load_dotenv
import torch
import whisperx

# Add parent directories to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from project root
env_path = project_root / '.env'
env_local_path = project_root / 'medical-transcription' / '.env.local'

if env_local_path.exists():
    load_dotenv(env_local_path)
    print(f"[Worker] Loaded .env.local from: {env_local_path}")
elif env_path.exists():
    load_dotenv(env_path)
    print(f"[Worker] Loaded .env from: {env_path}")
else:
    print("[Worker] No .env file found, using system environment variables")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class WhisperXTranscriptionWorker:
    """
    WhisperX-based transcription worker with integrated speaker diarization
    """
    
    def __init__(self):
        """Initialize WhisperX worker"""
        logger.info("=" * 60)
        logger.info("WhisperX Transcription Worker Starting")
        logger.info("=" * 60)
        
        # Validate environment variables
        self._validate_environment()
        
        # Initialize Redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.Redis.from_url(
            redis_url,
            decode_responses=True
        )
        logger.info(f"Connected to Redis: {redis_url}")
        
        # Initialize S3/MinIO client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY'),
            config=Config(signature_version='s3v4')
        )
        self.s3_bucket = os.getenv('S3_BUCKET', 'medical-transcription')
        logger.info(f"Connected to S3: {os.getenv('S3_ENDPOINT')}")
        
        # Check GPU availability
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        if self.device == "cpu":
            raise RuntimeError(
                "WhisperX requires CUDA GPU. CPU mode is not supported. "
                "Please ensure NVIDIA GPU with CUDA 11.8+ is available."
            )
        
        logger.info(f"Using device: {self.device}")
        logger.info(f"CUDA available: {torch.cuda.is_available()}")
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        # Model configuration
        self.model_size = os.getenv('WHISPER_MODEL_SIZE', 'large-v2')
        self.compute_type = "float16"  # GPU optimization
        
        # Lazy-loaded models
        self.whisper_model = None
        self.align_model = None
        self.align_metadata = None
        self.diarize_model = None
        self.current_language = None
        
        # Load medical dictionary
        self.medical_dict = self._load_medical_dictionary()
        logger.info(f"Loaded {len(self.medical_dict)} medical terms")
        
        # Graceful shutdown handling
        self.running = True
        signal.signal(signal.SIGINT, self._shutdown_handler)
        signal.signal(signal.SIGTERM, self._shutdown_handler)
        
        logger.info("Worker initialization complete")
    
    def _validate_environment(self):
        """Validate required environment variables"""
        required_vars = {
            'HF_TOKEN': 'Hugging Face token for pyannote (get from https://huggingface.co/settings/tokens)',
            'REDIS_URL': 'Redis connection URL',
            'S3_ENDPOINT': 'S3/MinIO endpoint',
            'S3_ACCESS_KEY': 'S3 access key',
            'S3_SECRET_KEY': 'S3 secret key',
            'S3_BUCKET': 'S3 bucket name',
        }
        
        missing = []
        for var, description in required_vars.items():
            if not os.getenv(var):
                missing.append(f"{var}: {description}")
        
        if missing:
            error_msg = "Missing required environment variables:\n" + "\n".join(f"  - {m}" for m in missing)
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    def _shutdown_handler(self, signum, frame):
        """Handle graceful shutdown"""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    def _load_medical_dictionary(self) -> Dict[str, str]:
        """Load medical term correction dictionary"""
        dict_path = project_root / 'medical-transcription' / 'medical_dictionary.json'
        if dict_path.exists():
            with open(dict_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        logger.warning(f"Medical dictionary not found at {dict_path}")
        return {}
    
    def _load_whisper_model(self):
        """Load WhisperX model (lazy loading)"""
        if self.whisper_model is None:
            logger.info(f"Loading WhisperX model: {self.model_size}...")
            self.whisper_model = whisperx.load_model(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type
            )
            logger.info("WhisperX model loaded successfully")
    
    def _load_align_model(self, language_code: str):
        """Load alignment model for word-level timestamps"""
        if self.align_model is None or self.current_language != language_code:
            logger.info(f"Loading alignment model for language: {language_code}...")
            self.align_model, self.align_metadata = whisperx.load_align_model(
                language_code=language_code,
                device=self.device
            )
            self.current_language = language_code
            logger.info("Alignment model loaded successfully")
    
    def _load_diarize_model(self):
        """Load speaker diarization model (pyannote)"""
        if self.diarize_model is None:
            logger.info("Loading speaker diarization model (pyannote)...")
            hf_token = os.getenv('HF_TOKEN')
            self.diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=hf_token,
                device=self.device
            )
            logger.info("Diarization model loaded successfully")
    
    def transcribe(self, audio_path: str, job_id: str) -> Dict[str, Any]:
        """
        Transcribe audio file with speaker diarization
        
        Args:
            audio_path: Path to audio file
            job_id: Job ID for progress tracking
            
        Returns:
            Dictionary containing transcription results
        """
        logger.info(f"Starting transcription for job {job_id}")
        start_time = time.time()
        
        try:
            # Phase 1: Load audio (10%)
            self._publish_progress(job_id, 10, "音声ファイル読み込み中...")
            audio = whisperx.load_audio(audio_path)
            audio_duration = len(audio) / 16000.0  # 16kHz sample rate
            logger.info(f"Audio loaded: {audio_duration:.1f}s duration")
            
            # Phase 2: Transcribe (20-50%)
            self._publish_progress(job_id, 20, "文字起こし処理中（Whisper）...")
            self._load_whisper_model()
            
            result = self.whisper_model.transcribe(
                audio,
                batch_size=16,  # GPU optimization
                language="ja"   # Japanese (or auto-detect)
            )
            
            logger.info(f"Transcription complete: {len(result.get('segments', []))} segments")
            
            # Phase 3: Align for word-level timestamps (50-70%)
            self._publish_progress(job_id, 50, "単語レベルアライメント中...")
            language_code = result.get("language", "ja")
            self._load_align_model(language_code)
            
            result = whisperx.align(
                result["segments"],
                self.align_model,
                self.align_metadata,
                audio,
                device=self.device
            )
            
            logger.info("Word-level alignment complete")
            
            # Phase 4: Speaker diarization (70-85%)
            self._publish_progress(job_id, 70, "話者分離処理中（pyannote）...")
            self._load_diarize_model()
            
            diarize_segments = self.diarize_model(audio)
            result = whisperx.assign_word_speakers(diarize_segments, result)
            
            logger.info("Speaker diarization complete")
            
            # Phase 5: Medical term correction (85-95%)
            self._publish_progress(job_id, 85, "医療用語補正中...")
            corrected_text, corrections = self._apply_medical_corrections(result)
            
            logger.info(f"Applied {len(corrections)} medical corrections")
            
            # Phase 6: Format results (95-100%)
            self._publish_progress(job_id, 95, "結果整形中...")
            
            output = {
                "language": language_code,
                "text": corrected_text,
                "segments": result.get("segments", []),
                "word_segments": result.get("word_segments", []),
                "speakers": self._extract_speakers(result),
                "corrections": corrections,
                "duration": audio_duration,
                "model": self.model_size,
                "processing_time": time.time() - start_time,
            }
            
            # Calculate confidence score
            confidence_scores = [
                seg.get("score", 0.0) 
                for seg in result.get("segments", [])
                if "score" in seg
            ]
            if confidence_scores:
                output["confidence"] = sum(confidence_scores) / len(confidence_scores)
            
            logger.info(f"Transcription complete in {output['processing_time']:.1f}s")
            self._publish_progress(job_id, 100, "完了")
            
            return output
            
        except Exception as e:
            logger.error(f"Transcription failed for job {job_id}: {e}", exc_info=True)
            self._publish_error(job_id, str(e))
            raise
    
    def _apply_medical_corrections(self, result: Dict) -> tuple[str, List[str]]:
        """
        Apply medical term corrections to transcription
        
        Args:
            result: WhisperX result dictionary
            
        Returns:
            Tuple of (corrected_text, list_of_corrections)
        """
        full_text = ""
        corrections = []
        
        for segment in result.get("segments", []):
            text = segment.get("text", "")
            
            # Apply dictionary corrections
            for wrong, correct in self.medical_dict.items():
                if wrong in text:
                    text = text.replace(wrong, correct)
                    corrections.append(f"{wrong} → {correct}")
            
            full_text += text + " "
        
        return full_text.strip(), corrections
    
    def _extract_speakers(self, result: Dict) -> Dict[str, Any]:
        """
        Extract speaker information from WhisperX result
        
        Args:
            result: WhisperX result with speaker assignments
            
        Returns:
            Dictionary mapping speaker IDs to their utterances
        """
        speakers = {}
        
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                speaker = word.get("speaker", "UNKNOWN")
                
                if speaker not in speakers:
                    speakers[speaker] = {
                        "id": speaker,
                        "words": [],
                        "total_duration": 0.0,
                        "word_count": 0,
                    }
                
                speakers[speaker]["words"].append({
                    "word": word.get("word"),
                    "start": word.get("start"),
                    "end": word.get("end"),
                    "score": word.get("score", 0.0),
                })
                
                speakers[speaker]["word_count"] += 1
                speakers[speaker]["total_duration"] += (
                    word.get("end", 0) - word.get("start", 0)
                )
        
        return speakers
    
    def _publish_progress(self, job_id: str, progress: int, phase: str):
        """Publish job progress to Redis pub/sub"""
        message = {
            'jobId': job_id,
            'status': 'processing' if progress < 100 else 'completed',
            'progress': progress,
            'phase': phase,
            'timestamp': time.time()
        }
        self.redis_client.publish('job:progress', json.dumps(message))
        logger.info(f"Progress [{job_id}]: {progress}% - {phase}")
    
    def _publish_error(self, job_id: str, error: str):
        """Publish job error to Redis pub/sub"""
        message = {
            'jobId': job_id,
            'status': 'failed',
            'error': error,
            'timestamp': time.time()
        }
        self.redis_client.publish('job:progress', json.dumps(message))
        logger.error(f"Job failed [{job_id}]: {error}")
    
    def process_job(self, job_data: Dict[str, Any]):
        """
        Process a transcription job
        
        Args:
            job_data: Job data from Redis pub/sub
        """
        job_id = job_data.get('jobId')
        file_id = job_data.get('fileId')
        s3_key = job_data.get('s3Key')
        
        logger.info(f"Processing job {job_id} for file {file_id}")
        
        try:
            # Download audio from S3
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
                audio_path = tmp_file.name
                logger.info(f"Downloading from S3: {s3_key}")
                self.s3_client.download_file(self.s3_bucket, s3_key, audio_path)
            
            # Transcribe
            result = self.transcribe(audio_path, job_id)
            
            # Upload result to S3
            transcript_key = f"transcripts/{file_id}.json"
            logger.info(f"Uploading transcript to S3: {transcript_key}")
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=transcript_key,
                Body=json.dumps(result, ensure_ascii=False, indent=2),
                ContentType='application/json'
            )
            
            logger.info(f"Job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            raise
        finally:
            # Cleanup temp file
            if 'audio_path' in locals() and os.path.exists(audio_path):
                os.unlink(audio_path)
    
    def run(self):
        """Run worker main loop"""
        logger.info("Worker is ready and listening for jobs...")
        
        pubsub = self.redis_client.pubsub()
        pubsub.subscribe('job:new')
        
        logger.info("Subscribed to Redis channel: job:new")
        logger.info("Waiting for transcription jobs...")
        
        for message in pubsub.listen():
            if not self.running:
                logger.info("Worker shutting down...")
                break
            
            if message['type'] == 'message':
                try:
                    job_data = json.loads(message['data'])
                    self.process_job(job_data)
                except Exception as e:
                    logger.error(f"Error processing job: {e}", exc_info=True)


def main():
    """Main entry point"""
    try:
        worker = WhisperXTranscriptionWorker()
        worker.run()
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
    except Exception as e:
        logger.error(f"Worker crashed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
