export function Sidebar() {
  return (
    <div className="p-4 space-y-2">
      <div className="font-semibold">メニュー</div>
      <nav className="text-sm space-y-1">
        <a href="/dashboard" className="block hover:underline">ダッシュボード</a>
        <a href="#" className="block text-gray-400 pointer-events-none">辞書（後続）</a>
        <a href="#" className="block text-gray-400 pointer-events-none">設定（後続）</a>
      </nav>
    </div>
  );
}
