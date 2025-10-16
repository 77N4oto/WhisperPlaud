#!/usr/bin/env python3
"""
Transcription Worker - Medical Audio Transcription with Whisper

This worker processes audio transcription jobs using faster-whisper (large-v3 model).
It subscribes to Redis pub/sub channels for new jobs and publishes progress updates.

Key Features:
- GPU-accelerated transcription (CUDA 12.1) with CPU fallback
- Real-time progress updates via Redis pub/sub
- Medical term correction using custom dictionary
- S3/MinIO integration for audio and transcript storage
- Automatic environment variable loading from project root

Environment Variables:
- WHISPER_MODEL_SIZE: Model size (default: large-v3)
- WHISPER_DEVICE: Device preference (auto/cuda/cpu, default: auto)
- REDIS_URL: Redis connection string
- S3_ENDPOINT: MinIO/S3 endpoint URL
- S3_ACCESS_KEY, S3_SECRET_KEY: S3 credentials
- S3_BUCKET: S3 bucket name

Usage:
    python transcription_worker.py

Author: WhisperPlaud Project
Date: 2025-10-16
"""

import os
import sys
import json
import time
import logging
import signal
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

import redis
import boto3
from botocore.config import Config
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from simple_processor import SimpleMedicalProcessor
from whisper_processor import WhisperProcessor

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables from project root
# Look for .env.local first (takes precedence), then .env
project_root = Path(__file__).parent.parent.parent
env_local_path = project_root / '.env.local'
env_path = project_root / '.env'

if env_local_path.exists():
    load_dotenv(env_local_path)
    logger.info(f"Loaded environment from: {env_local_path}")
elif env_path.exists():
    load_dotenv(env_path)
    logger.info(f"Loaded environment from: {env_path}")
else:
    load_dotenv()  # Load from current directory or system env
    logger.warning("No .env or .env.local found in project root")

class TranscriptionWorker:
    def __init__(self):
        """Initialize the transcription worker"""
        self.running = True
        
        # Redis connection for pub/sub
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.pubsub = self.redis_client.pubsub()
        
        # S3/MinIO client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT', 'http://localhost:9000'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY', 'minioadmin'),
            aws_secret_access_key=os.getenv('S3_SECRET_KEY', 'minioadmin'),
            config=Config(signature_version='s3v4'),
            region_name=os.getenv('S3_REGION', 'us-east-1')
        )
        self.s3_bucket = os.getenv('S3_BUCKET', 'medical-transcription')
        
        # Medical processor
        self.processor = SimpleMedicalProcessor()
        
        # Whisper processor (lazy initialization for faster startup)
        self.whisper_processor = None
        self.whisper_model_size = os.getenv('WHISPER_MODEL_SIZE', 'large-v3')
        self.whisper_device = os.getenv('WHISPER_DEVICE', 'auto')
        
        logger.info("Transcription worker initialized")
        logger.info(f"Redis: {redis_url}")
        logger.info(f"S3: {os.getenv('S3_ENDPOINT')}")
        logger.info(f"Bucket: {self.s3_bucket}")
        logger.info(f"Whisper model: {self.whisper_model_size}")
    
    def update_job_progress(self, job_id: str, progress: int, phase: str, status: str = 'processing'):
        """Update job progress in database via Redis pub/sub"""
        try:
            message = json.dumps({
                'jobId': job_id,
                'status': status,
                'progress': progress,
                'phase': phase,
                'timestamp': datetime.utcnow().isoformat()
            })
            self.redis_client.publish('job:progress', message)
            logger.info(f"[Job {job_id}] {progress}% - {phase}")
        except Exception as e:
            logger.error(f"Failed to update job progress: {e}")
    
    def download_from_s3(self, s3_key: str) -> Optional[bytes]:
        """Download file from S3/MinIO"""
        try:
            logger.info(f"Downloading from S3: {s3_key}")
            response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=s3_key)
            data = response['Body'].read()
            logger.info(f"Downloaded {len(data)} bytes")
            return data
        except Exception as e:
            logger.error(f"Failed to download from S3: {e}")
            return None
    
    def upload_to_s3(self, key: str, data: bytes, content_type: str = 'application/json') -> bool:
        """Upload file to S3/MinIO"""
        try:
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=key,
                Body=data,
                ContentType=content_type
            )
            logger.info(f"Uploaded to S3: {key}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            return False
    
    def initialize_whisper(self):
        """Initialize Whisper model (lazy initialization)"""
        if self.whisper_processor is None:
            try:
                logger.info(f"Initializing Whisper model: {self.whisper_model_size}")
                logger.info(f"Device preference: {self.whisper_device}")
                self.whisper_processor = WhisperProcessor(
                    model_size=self.whisper_model_size,
                    device=self.whisper_device,
                    compute_type="auto"
                )
                logger.info(f"Whisper model initialized: {self.whisper_processor.get_model_info()}")
            except Exception as e:
                logger.error(f"Failed to initialize Whisper: {e}")
                raise
    
    def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a transcription job"""
        file_id = job_data.get('fileId')
        s3_key = job_data.get('s3Key')
        job_id = job_data.get('jobId')
        
        logger.info(f"Processing job {job_id} for file {file_id}")
        
        try:
            # Initialize Whisper model if not already done
            if self.whisper_processor is None:
                self.update_job_progress(job_id, 2, 'Loading AI model...')
                self.initialize_whisper()
            
            # Update progress: Starting
            self.update_job_progress(job_id, 5, 'Downloading audio file...')
            
            # Download audio file
            audio_data = self.download_from_s3(s3_key)
            if not audio_data:
                raise Exception("Failed to download audio file")
            
            # Update progress: Transcribing
            self.update_job_progress(job_id, 10, 'Transcribing audio with Whisper...')
            
            # Progress callback for Whisper
            def whisper_progress(segment_count: int):
                # Map segment progress to 10-70% range
                progress = min(10 + (segment_count * 2), 70)
                self.update_job_progress(job_id, progress, f'Processing audio segments... ({segment_count})')
            
            # Actual Whisper transcription
            whisper_result = self.whisper_processor.transcribe_audio(
                audio_data,
                language='ja',
                task='transcribe',
                vad_filter=True,
                progress_callback=whisper_progress
            )
            
            logger.info(f"Whisper transcription complete: {len(whisper_result['segments'])} segments")
            
            # Update progress: Applying corrections
            self.update_job_progress(job_id, 75, 'Applying medical term corrections...')
            
            # Process with medical corrections
            corrected_result = self.processor.process_transcription(
                whisper_result['text'],
                whisper_result['segments']
            )
            
            # Merge Whisper metadata with corrections
            final_result = {
                'text': corrected_result['corrected_text'],
                'original_text': whisper_result['text'],
                'segments': corrected_result['segments'],
                'language': whisper_result['language'],
                'language_probability': whisper_result['language_probability'],
                'duration': whisper_result['duration'],
                'confidence': whisper_result['confidence'],
                'corrections': corrected_result.get('corrections', []),
                'model_info': whisper_result['model'],
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Upload transcript result
            self.update_job_progress(job_id, 90, 'Saving transcript...')
            transcript_key = f"transcripts/{file_id}.json"
            transcript_data = json.dumps(final_result, ensure_ascii=False, indent=2).encode('utf-8')
            
            if not self.upload_to_s3(transcript_key, transcript_data):
                raise Exception("Failed to upload transcript")
            
            logger.info(f"Transcript uploaded successfully to {transcript_key}")
            
            # Complete
            logger.info(f"Updating job to 100% completion...")
            self.update_job_progress(job_id, 100, 'Completed', 'completed')
            logger.info(f"Progress update sent to Redis")
            
            logger.info(f"Job {job_id} completed successfully")
            
            return {
                'success': True,
                'transcriptKey': transcript_key,
                'result': final_result
            }
            
        except Exception as e:
            logger.error(f"Job processing failed: {e}", exc_info=True)
            self.update_job_progress(job_id, 0, f'Error: {str(e)}', 'failed')
            return {
                'success': False,
                'error': str(e)
            }
    
    def handle_message(self, message):
        """Handle incoming job message"""
        try:
            if message['type'] != 'message':
                return
            
            job_data = json.loads(message['data'])
            logger.info(f"Received job: {job_data}")
            
            self.process_job(job_data)
            
        except Exception as e:
            logger.error(f"Failed to handle message: {e}")
    
    def run(self):
        """Main worker loop"""
        logger.info("Worker started. Subscribing to 'job:new' channel...")
        
        # Subscribe to new job channel
        self.pubsub.subscribe('job:new')
        
        logger.info("Waiting for jobs...")
        
        try:
            for message in self.pubsub.listen():
                if not self.running:
                    break
                self.handle_message(message)
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
        finally:
            self.pubsub.close()
            logger.info("Worker stopped")
    
    def shutdown(self, signum, frame):
        """Handle shutdown signal"""
        logger.info(f"Received signal {signum}")
        self.running = False

def main():
    """Main entry point"""
    worker = TranscriptionWorker()
    
    # Register signal handlers
    signal.signal(signal.SIGINT, worker.shutdown)
    signal.signal(signal.SIGTERM, worker.shutdown)
    
    # Run worker
    worker.run()

if __name__ == "__main__":
    main()
