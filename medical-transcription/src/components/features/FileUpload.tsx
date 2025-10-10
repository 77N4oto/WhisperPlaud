"use client";

import { useRef, useState, useCallback } from 'react';

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    // @ts-expect-error - typing noise across TS/DOM versions
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  jobId?: string;
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFileUpload(file));
  }, []);

  const handleSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => handleFileUpload(file));
    
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  async function handleFileUpload(file: File) {
    const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Add upload to list
    setUploads(prev => [...prev, {
      fileName: file.name,
      progress: 0,
      status: 'uploading',
      message: 'Preparing upload...'
    }]);

    try {
      // Step 1: Get presigned URL
      updateUpload(uploadId, { progress: 5, message: 'Getting upload URL...' });

      const prep = await fetchWithTimeout('/api/files/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
        }),
      }, 20000);
      
      if (!prep.ok) {
        throw new Error('Failed to prepare upload');
      }
      
      const { fileId, uploadUrl } = await prep.json();

      // Step 2: Upload to S3
      updateUpload(uploadId, { progress: 10, message: 'Uploading to storage...' });

      const xhr = new XMLHttpRequest();
      
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
            updateUpload(uploadId, { 
              progress: percentComplete, 
              message: `Uploading: ${Math.round((e.loaded / e.total) * 100)}%` 
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      // Step 3: Notify completion
      updateUpload(uploadId, { progress: 95, message: 'Finalizing...' });

      const done = await fetchWithTimeout('/api/files/upload', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }, 15000);
      
      if (!done.ok) {
        throw new Error('Failed to finalize upload');
      }

      const result = await done.json();
      
      updateUpload(uploadId, { 
        progress: 100, 
        status: 'completed',
        message: 'Upload complete!',
        jobId: result.jobId
      });

      // Notify FileList to refresh immediately
      console.log('[FileUpload] Dispatching fileUploaded event', { fileName: file.name, fileId });
      window.dispatchEvent(new CustomEvent('fileUploaded', { detail: { fileName: file.name, fileId } }));

      // Remove from list after 3 seconds
      setTimeout(() => {
        setUploads(prev => prev.filter((_, i) => i !== 0));
      }, 3000);

    } catch (error: any) {
      updateUpload(uploadId, { 
        progress: 0,
        status: 'error',
        message: error.message || 'Upload failed'
      });

      // Remove error after 5 seconds
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.fileName !== file.name));
      }, 5000);
    }
  }

  function updateUpload(id: string, update: Partial<UploadProgress>) {
    setUploads(prev => {
      const index = prev.findIndex((_, i) => `${Date.now()}_${i}` === id);
      if (index === -1) return prev;
      
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], ...update };
      return newUploads;
    });
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          ref={inputRef} 
          type="file" 
          accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a" 
          onChange={handleSelectFile}
          multiple
          className="hidden"
        />
        
        <div className="space-y-3">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
              ファイルを選択
            </span>
            {' '}またはここにドラッグ&ドロップ
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-500">
            音声・動画ファイル (MP3, MP4, WAV, M4A など) 最大500MB
          </p>
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {upload.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {upload.message}
                  </p>
                </div>
                
                <div className="ml-4">
                  {upload.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                  {upload.status === 'completed' && (
                    <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {upload.status === 'error' && (
                    <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {upload.status === 'uploading' && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
