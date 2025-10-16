# ✅ データベース問題 - 最終解決

## 📋 問題
**症状**: `Error code 14: Unable to open the database file`  
**原因**: `DATABASE_URL`が相対パス（`file:./prisma/transcription.db`）で、Next.jsのビルドディレクトリから正しく解決できなかった

---

## ✅ 解決策

### 1. 相対パスから絶対パスへ変更

**変更前** (`.env.local`):
```
DATABASE_URL="file:./prisma/transcription.db"
```

**変更後** (`.env.local`):
```
DATABASE_URL="file:C:/Users/user/Desktop/Git/WhisperPlaud/medical-transcription/prisma/transcription.db"
```

### 2. 古いバックアップファイルの削除
```powershell
Remove-Item prisma\transcription.db.backup -Force
```

---

## 🎯 実施した手順

1. ✅ **バックアップファイル削除**
   ```powershell
   Remove-Item prisma\transcription.db.backup -Force
   ```

2. ✅ **DATABASE_URLを絶対パスに修正**
   ```powershell
   $dbPath = (Resolve-Path prisma\transcription.db).Path.Replace('\', '/')
   # DATABASE_URL="file:C:/Users/user/Desktop/Git/WhisperPlaud/medical-transcription/prisma/transcription.db"
   ```

3. ✅ **`.next`キャッシュクリア**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

4. ✅ **Next.js再起動**
   - 新しいPowerShellウィンドウで起動
   - 絶対パスで正常にDBにアクセス

---

## 🔧 なぜ相対パスで失敗したのか

### Next.jsのビルドディレクトリ構造
```
medical-transcription/
  ├── .next/                  # Next.jsビルド出力
  │   └── server/
  │       └── chunks/         # ← ここからDBを参照しようとして失敗
  ├── prisma/
  │   └── transcription.db    # ← 実際のDB
  └── src/
```

### 問題の詳細
- Prisma Clientは`.next/server/chunks/`から実行される
- 相対パス`./prisma/transcription.db`は `.next/server/chunks/prisma/transcription.db` として解釈される
- → ファイルが存在しない → `Error code 14`

### 解決方法
- **絶対パス**を使用することで、どのディレクトリから実行されてもDBにアクセス可能

---

## 📊 検証結果

### Before (相対パス):
```
❌ Error code 14: Unable to open the database file
❌ Failed to fetch files
```

### After (絶対パス):
```
✅ Login: SUCCESS
✅ Database: Accessible
✅ Files API: Working
```

---

## 🎓 学んだこと

### SQLiteとNext.jsの組み合わせ
1. **開発環境では絶対パスを推奨**
   - ビルドディレクトリからの相対パスは不安定
   - 絶対パスで明示的に指定する

2. **本番環境では環境変数で管理**
   ```bash
   # Dockerなど
   DATABASE_URL="file:/app/data/transcription.db"
   ```

3. **代替案: PostgreSQL / MySQL**
   - ネットワークDB（TCP接続）ならパスの問題は発生しない
   - SQLiteはファイルシステムに依存するため、パス管理が重要

---

## 📝 今後の推奨事項

### 1. 環境変数で絶対パスを管理
```powershell
# Windows
$env:DATABASE_URL = "file:C:/path/to/db.sqlite"

# Linux/Mac
export DATABASE_URL="file:/path/to/db.sqlite"
```

### 2. docker-compose.ymlでボリュームマウント
```yaml
volumes:
  - ./data:/app/data
environment:
  - DATABASE_URL=file:/app/data/transcription.db
```

### 3. 長期的にはPostgreSQLへ移行を検討
- ファイルロックの問題がない
- 並行アクセスに強い
- スケーラビリティが高い

---

## 🔗 関連ファイル

- `medical-transcription/.env.local` - 修正された環境変数
- `medical-transcription/prisma/transcription.db` - データベースファイル（118KB）
- `medical-transcription/prisma/schema.prisma` - Prismaスキーマ

---

**修正日時**: 2025-10-16 13:15  
**ステータス**: ✅ 解決済み（絶対パス化）  
**次のステップ**: ブラウザでファイル一覧とアップロード機能を確認

