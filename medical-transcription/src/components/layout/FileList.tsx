'use client';

import { useEffect, useState } from 'react';

type FileItem = {
  id: string;
  originalName: string;
  status: string;
  uploadedAt: string;
};

export function FileList({ onSelectFile }: { onSelectFile: (id: string) => void }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/files')
      .then((r) => r.json())
      .then((d) => mounted && setFiles(d.files ?? []))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="p-4">
      <div className="text-sm font-semibold mb-2">ファイル一覧</div>
      <ul className="space-y-1">
        {files.map((f) => (
          <li key={f.id} className="flex justify-between text-sm">
            <button className="text-left hover:underline" onClick={() => onSelectFile(f.id)}>
              {f.originalName}
            </button>
            <span className="text-gray-500">{f.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

