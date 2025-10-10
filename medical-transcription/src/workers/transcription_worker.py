#!/usr/bin/env python3
"""
Transcription Worker - Simple Redis Pub/Sub
Processes transcription jobs from Redis channel
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

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        
        logger.info("Transcription worker initialized")
        logger.info(f"Redis: {redis_url}")
        logger.info(f"S3: {os.getenv('S3_ENDPOINT')}")
        logger.info(f"Bucket: {self.s3_bucket}")
    
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
    
    def process_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a transcription job"""
        file_id = job_data.get('fileId')
        s3_key = job_data.get('s3Key')
        job_id = job_data.get('jobId')
        
        logger.info(f"Processing job {job_id} for file {file_id}")
        
        try:
            # Update progress: Starting
            self.update_job_progress(job_id, 5, 'Downloading audio file...')
            
            # Download audio file
            audio_data = self.download_from_s3(s3_key)
            if not audio_data:
                raise Exception("Failed to download audio file")
            
            # Update progress: Transcribing
            self.update_job_progress(job_id, 30, 'Transcribing audio...')
            time.sleep(2)  # Simulate processing
            
            # Mock transcription (replace with actual Whisper later)
            mock_text = f"医療面談の記録です。患者さんの糖尿病についてオゼンビックの使用状況を確認しました。えーわんしーの値は良好です。"
            
            # Update progress: Applying corrections
            self.update_job_progress(job_id, 70, 'Applying medical term corrections...')
            time.sleep(1)
            
            # Process with medical corrections
            result = self.processor.process_mock_transcription(mock_text)
            
            # Upload transcript result
            self.update_job_progress(job_id, 90, 'Saving transcript...')
            transcript_key = f"transcripts/{file_id}.json"
            transcript_data = json.dumps(result, ensure_ascii=False, indent=2).encode('utf-8')
            
            if not self.upload_to_s3(transcript_key, transcript_data):
                raise Exception("Failed to upload transcript")
            
            # Complete
            self.update_job_progress(job_id, 100, 'Completed', 'completed')
            
            return {
                'success': True,
                'transcriptKey': transcript_key,
                'result': result
            }
            
        except Exception as e:
            logger.error(f"Job processing failed: {e}")
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
