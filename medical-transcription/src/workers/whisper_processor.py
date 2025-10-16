#!/usr/bin/env python3
"""
Whisper Processor - faster-whisper integration
Handles actual audio transcription with GPU/CPU fallback
"""

import os
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import json

import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

@dataclass
class Segment:
    """Transcription segment with timing and confidence"""
    id: int
    start: float
    end: float
    text: str
    confidence: float
    no_speech_prob: float

class WhisperProcessor:
    """Whisper transcription processor with GPU/CPU fallback"""
    
    def __init__(
        self,
        model_size: str = "large-v3",
        device: str = "auto",
        compute_type: str = "auto"
    ):
        """
        Initialize Whisper processor
        
        Args:
            model_size: Model size (tiny, base, small, medium, large-v2, large-v3)
            device: Device to use (auto, cuda, cpu)
            compute_type: Compute type (auto, float16, int8, int8_float16)
        """
        self.model_size = model_size
        self.model = None
        self.device_used = None
        self.compute_type_used = None
        
        self._initialize_model(device, compute_type)
    
    def _initialize_model(self, device: str, compute_type: str):
        """Initialize faster-whisper model with fallback strategy"""
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            logger.error("faster-whisper not installed. Run: pip install faster-whisper")
            raise ImportError(
                "faster-whisper is required. Install it with: "
                "pip install faster-whisper"
            ) from e
        
        # Auto-detect device and compute type
        if device == "auto":
            device = self._detect_device()
        
        if compute_type == "auto":
            compute_type = self._detect_compute_type(device)
        
        logger.info(f"Initializing Whisper model: {self.model_size}")
        logger.info(f"Device: {device}, Compute type: {compute_type}")
        
        try:
            # Try with specified settings
            self.model = WhisperModel(
                self.model_size,
                device=device,
                compute_type=compute_type
            )
            self.device_used = device
            self.compute_type_used = compute_type
            logger.info(f"✅ Model loaded successfully on {device}")
            
        except Exception as e:
            logger.warning(f"Failed to load model on {device}: {e}")
            
            # Fallback to CPU
            if device != "cpu":
                logger.info("Falling back to CPU...")
                try:
                    self.model = WhisperModel(
                        self.model_size,
                        device="cpu",
                        compute_type="int8"
                    )
                    self.device_used = "cpu"
                    self.compute_type_used = "int8"
                    logger.info("✅ Model loaded on CPU (fallback)")
                except Exception as e2:
                    logger.error(f"Failed to load model on CPU: {e2}")
                    raise RuntimeError(f"Could not load Whisper model: {e2}") from e2
            else:
                raise RuntimeError(f"Could not load Whisper model: {e}") from e
    
    def _detect_device(self) -> str:
        """Detect best available device"""
        try:
            import torch
            if torch.cuda.is_available():
                logger.info(f"CUDA available: {torch.cuda.get_device_name(0)}")
                return "cuda"
        except Exception as e:
            logger.debug(f"CUDA check failed: {e}")
        
        logger.info("Using CPU device")
        return "cpu"
    
    def _detect_compute_type(self, device: str) -> str:
        """Detect best compute type for device"""
        if device == "cuda":
            # NVIDIA GPU: use float16 for speed
            return "float16"
        else:
            # CPU: use int8 for memory efficiency
            return "int8"
    
    def transcribe_audio(
        self,
        audio_data: bytes,
        language: str = "ja",
        task: str = "transcribe",
        vad_filter: bool = True,
        beam_size: int = 5,
        best_of: int = 5,
        temperature: float = 0.0,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio data
        
        Args:
            audio_data: Audio file bytes (any format supported by soundfile)
            language: Language code (ja, en, etc.)
            task: Task type (transcribe or translate)
            vad_filter: Enable Voice Activity Detection
            beam_size: Beam search size
            best_of: Number of candidates when sampling
            temperature: Temperature for sampling (0.0 = deterministic)
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dict with transcript, segments, language, and metadata
        """
        if self.model is None:
            raise RuntimeError("Whisper model not initialized")
        
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name
            try:
                # Write audio data to temp file
                tmp_file.write(audio_data)
                tmp_file.flush()
                
                logger.info(f"Transcribing audio file: {os.path.getsize(tmp_path)} bytes")
                
                # Transcribe with faster-whisper
                segments_iter, info = self.model.transcribe(
                    tmp_path,
                    language=language,
                    task=task,
                    vad_filter=vad_filter,
                    beam_size=beam_size,
                    best_of=best_of,
                    temperature=temperature,
                    word_timestamps=True  # Enable word-level timestamps
                )
                
                # Process segments
                segments = []
                full_text_parts = []
                total_confidence = 0.0
                segment_count = 0
                
                logger.info("Processing segments...")
                for i, segment in enumerate(segments_iter):
                    seg_dict = {
                        'id': i,
                        'start': segment.start,
                        'end': segment.end,
                        'text': segment.text.strip(),
                        'confidence': segment.avg_logprob,  # Log probability as confidence
                        'no_speech_prob': segment.no_speech_prob,
                        'words': []
                    }
                    
                    # Add word-level timestamps if available
                    if hasattr(segment, 'words') and segment.words:
                        seg_dict['words'] = [
                            {
                                'word': word.word,
                                'start': word.start,
                                'end': word.end,
                                'confidence': word.probability
                            }
                            for word in segment.words
                        ]
                    
                    segments.append(seg_dict)
                    full_text_parts.append(segment.text.strip())
                    
                    total_confidence += segment.avg_logprob
                    segment_count += 1
                    
                    # Call progress callback every 10 segments
                    if progress_callback and i % 10 == 0:
                        progress_callback(i)
                    
                    logger.debug(f"Segment {i}: {segment.start:.2f}s - {segment.end:.2f}s")
                
                # Calculate average confidence
                avg_confidence = total_confidence / segment_count if segment_count > 0 else 0.0
                
                # Combine full text
                full_text = '\n'.join(full_text_parts)
                
                logger.info(f"Transcription complete: {segment_count} segments")
                logger.info(f"Detected language: {info.language} (probability: {info.language_probability:.2f})")
                logger.info(f"Average confidence: {avg_confidence:.2f}")
                
                result = {
                    'text': full_text,
                    'segments': segments,
                    'language': info.language,
                    'language_probability': info.language_probability,
                    'duration': info.duration,
                    'confidence': avg_confidence,
                    'model': {
                        'name': self.model_size,
                        'device': self.device_used,
                        'compute_type': self.compute_type_used
                    }
                }
                
                return result
                
            finally:
                # Clean up temp file
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file: {e}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model_size': self.model_size,
            'device': self.device_used,
            'compute_type': self.compute_type_used,
            'loaded': self.model is not None
        }


def test_whisper_processor():
    """Test the Whisper processor with a simple audio file"""
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage: python whisper_processor.py <audio_file>")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(f"Error: File not found: {audio_file}")
        sys.exit(1)
    
    print(f"Testing Whisper processor with: {audio_file}")
    
    # Read audio file
    with open(audio_file, 'rb') as f:
        audio_data = f.read()
    
    # Initialize processor
    processor = WhisperProcessor(
        model_size="base",  # Use smaller model for testing
        device="auto",
        compute_type="auto"
    )
    
    print("\nModel info:")
    print(json.dumps(processor.get_model_info(), indent=2))
    
    # Transcribe
    print("\nTranscribing...")
    result = processor.transcribe_audio(audio_data, language="ja")
    
    print("\n" + "="*80)
    print("TRANSCRIPTION RESULT")
    print("="*80)
    print(f"\nLanguage: {result['language']} (prob: {result['language_probability']:.2%})")
    print(f"Duration: {result['duration']:.2f}s")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"\nFull text:\n{result['text']}")
    print(f"\nSegments: {len(result['segments'])}")
    
    # Show first 3 segments
    for seg in result['segments'][:3]:
        print(f"\n[{seg['start']:.2f}s - {seg['end']:.2f}s] {seg['text']}")
        if seg['words']:
            print(f"  Words: {len(seg['words'])}")


if __name__ == "__main__":
    test_whisper_processor()

