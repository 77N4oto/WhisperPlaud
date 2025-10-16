#!/usr/bin/env python3
"""
Simplified Medical Transcription Processor (Local Development)
Minimal dependencies for testing core functionality
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
import tempfile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleMedicalProcessor:
    def __init__(self):
        """Initialize the simplified processor"""
        
        # Medical dictionary
        self.medical_dict = {
            'corrections': {
                'オゼンビック': 'オゼンピック',
                'おぜんびっく': 'オゼンピック', 
                'セマグルタイド': 'セマグルチド',
                'マンジャロー': 'マンジャロ',
                'チルゼパタイド': 'チルゼパチド',
                'トルシティ': 'トルリシティ',
                'えーわんしー': 'HbA1c',
                'ヘモグロビンA1C': 'HbA1c',
                'じーえるぴーわん': 'GLP-1',
                'えすじーえるてぃーつー': 'SGLT2',
            }
        }
        
    def apply_medical_corrections(self, text: str) -> tuple[str, List[str]]:
        """Apply medical term corrections and track changes"""
        corrected_text = text
        applied_corrections = []
        
        for wrong, correct in self.medical_dict['corrections'].items():
            if wrong in corrected_text:
                corrected_text = corrected_text.replace(wrong, correct)
                applied_corrections.append(f"{wrong} → {correct}")
        
        return corrected_text, applied_corrections
    
    def process_transcription(self, text: str, segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process actual Whisper transcription with medical corrections
        
        Args:
            text: Full transcription text from Whisper
            segments: List of segments with timing information
            
        Returns:
            Dict with corrected text, segments, and metadata
        """
        logger.info("Processing Whisper transcription with medical corrections...")
        
        # Apply medical corrections to full text
        corrected_text, corrections_applied = self.apply_medical_corrections(text)
        
        # Apply corrections to each segment
        corrected_segments = []
        for segment in segments:
            seg_text = segment.get('text', '')
            corrected_seg_text, _ = self.apply_medical_corrections(seg_text)
            
            corrected_segment = {
                'id': segment.get('id'),
                'start': segment.get('start'),
                'end': segment.get('end'),
                'text': corrected_seg_text,
                'original_text': seg_text,
                'confidence': segment.get('confidence'),
                'no_speech_prob': segment.get('no_speech_prob'),
                'words': segment.get('words', [])
            }
            corrected_segments.append(corrected_segment)
        
        result = {
            'corrected_text': corrected_text,
            'original_text': text,
            'segments': corrected_segments,
            'corrections': corrections_applied,
            'corrections_count': len(corrections_applied)
        }
        
        logger.info(f"Applied {len(corrections_applied)} medical term corrections")
        return result
    
    def generate_simple_summary(self, text: str) -> Dict[str, str]:
        """Generate simple summaries (placeholder)"""
        word_count = len(text.split())
        
        return {
            'short': f"医療面談記録（約{word_count}語）。主要な内容を含む。",
            'medium': f"医療面談記録の要約：\n- 語数: {word_count}語\n- 医療用語補正適用済み\n- 詳細な内容は原文を参照",
            'long': f"詳細要約：\n医療面談の記録です。\n語数: {word_count}語\n医療用語の自動補正が適用されています。\n具体的な内容については原文をご確認ください。"
        }
    
    def process_mock_transcription(self, text: str) -> Dict[str, Any]:
        """Process mock transcription for testing"""
        
        logger.info("Starting mock transcription processing...")
        
        # Apply medical corrections
        corrected_text, corrections_applied = self.apply_medical_corrections(text)
        
        # Generate summaries
        summaries = self.generate_simple_summary(corrected_text)
        
        # Mock segments
        segments = [
            {
                'start': 0.0,
                'end': 10.0,
                'text': corrected_text[:100] + "..." if len(corrected_text) > 100 else corrected_text,
                'speaker': 'SPEAKER_00'
            }
        ]
        
        # Mock speakers
        speakers = {
            'SPEAKER_00': {
                'id': 'SPEAKER_00',
                'label': '医師',
                'segments_count': 1,
                'total_duration': 10.0
            }
        }
        
        result = {
            'language': 'ja',
            'text': corrected_text,
            'segments': segments,
            'words': [],
            'speakers': speakers,
            'corrections': corrections_applied,
            'confidence': 0.95,
            'summaries': summaries,
            'processing_info': {
                'model': 'mock-processor',
                'device': 'cpu',
                'duration': 10.0,
                'processing_time': time.strftime('%Y-%m-%d %H:%M:%S')
            }
        }
        
        logger.info("Mock transcription processing completed")
        return result

def test_processor():
    """Test the processor with sample medical text"""
    
    processor = SimpleMedicalProcessor()
    
    # Sample medical text with common errors
    sample_text = """
    患者さんの糖尿病の状態についてお話しします。
    現在オゼンビックを使用していて、えーわんしーの値は7.2%です。
    じーえるぴーわんの薬剤として、マンジャローも検討しています。
    セマグルタイドの効果は良好で、体重も減少傾向にあります。
    """
    
    print("=== Medical Transcription Processor Test ===")
    print(f"Original text: {sample_text.strip()}")
    print()
    
    result = processor.process_mock_transcription(sample_text)
    
    print(f"Corrected text: {result['text'].strip()}")
    print(f"Applied corrections: {result['corrections']}")
    print(f"Confidence: {result['confidence']}")
    print()
    
    print("=== Summaries ===")
    print(f"Short: {result['summaries']['short']}")
    print(f"Medium: {result['summaries']['medium']}")
    print(f"Long: {result['summaries']['long']}")
    print()
    
    print("=== Speakers ===")
    for speaker_id, speaker_info in result['speakers'].items():
        print(f"{speaker_id}: {speaker_info['label']} ({speaker_info['segments_count']} segments)")
    
    print("\n=== Test Completed Successfully! ===")

if __name__ == "__main__":
    test_processor()


