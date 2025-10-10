'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileUpload } from '@/components/features/FileUpload';
import { FileList } from '@/components/features/FileList';
import { DetailPanel } from '@/components/layout/DetailPanel';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    searchParams.get('fileId')
  );

  useEffect(() => {
    // Check authentication on client side
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/files');
        if (res.status === 401) {
          router.push('/login');
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleFileClick = (fileId: string) => {
    setSelectedFileId(fileId);
    // Update URL with file ID
    router.push(`/dashboard?fileId=${fileId}`, { scroll: false });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              音声ファイルをアップロードして文字起こしを開始します
            </p>
          </div>

          {/* Upload Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ファイルアップロード</h2>
            <FileUpload />
          </div>

          {/* File List Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ファイル一覧</h2>
            <FileList onFileClick={handleFileClick} />
          </div>

          {/* PLAUD Note */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">PLAUD共有リンクについて</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  PLAUD共有リンクはログインが必要です。現状は通常のファイルアップロードをご利用ください（自動取得は後続でオプション対応）。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="w-[500px] border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
        {selectedFileId ? (
          <DetailPanel selectedFileId={selectedFileId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>ファイルを選択してください</p>
          </div>
        )}
      </div>
    </div>
  );
}

