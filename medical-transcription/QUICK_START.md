# WhisperPlaud クイックスタートガイド

最速で動かすための最小限の手順を説明します。

## ⚡ 5分で動かす（最小構成）

### 前提条件
- Node.js 20+
- Python 3.11+
- Docker Desktop

---

### ステップ1: 依存パッケージのインストール

```powershell
# プロジェクトルートに移動
cd WhisperPlaud

# Node.js依存（Next.js）
cd medical-transcription
npm install

# Prismaセットアップ
npx prisma generate
npx prisma migrate dev

# Python仮想環境（軽量モード）
cd ..
python -m venv whisper-env
.\whisper-env\Scripts\Activate.ps1
pip install redis boto3 requests python-dotenv numpy
```

---

### ステップ2: 環境変数の設定

`medical-transcription/.env.local` を作成：

```bash
# 認証（重要: $ を \$ にエスケープ）
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
JWT_SECRET=dev-secret-key-change-in-production

# データベース
DATABASE_URL=file:./prisma/transcription.db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=medical-transcription
S3_REGION=us-east-1

# Whisper（軽量モード）
WHISPER_MODEL_SIZE=large-v3
```

---

### ステップ3: Dockerコンテナ起動

```powershell
# プロジェクトルートから
docker compose up -d redis minio
```

---

### ステップ4: アプリケーション起動

#### Terminal 1: Next.js

```powershell
cd medical-transcription
npm run dev
```

#### Terminal 2: Pythonワーカー（モックモード）

```powershell
.\whisper-env\Scripts\Activate.ps1
python medical-transcription/src/workers/transcription_worker.py
```

---

### ステップ5: ブラウザで確認

1. http://localhost:3000/login にアクセス
2. ログイン: `admin` / `test123`
3. 音声ファイルをドラッグ&ドロップ
4. 処理進捗を確認

**注意**: この状態ではまだモック処理です。実際のWhisper文字起こしを使うには下記の「完全版セットアップ」を参照してください。

---

## 🚀 完全版セットアップ（Whisper統合）

### 追加の前提条件
- **GPU推奨**: NVIDIA CUDA対応GPU（RTX 3060 12GB等）
- **メモリ**: 16GB RAM以上推奨

---

### ステップ1: Whisper依存のインストール

```powershell
.\whisper-env\Scripts\Activate.ps1

# GPU環境（推奨）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install faster-whisper soundfile librosa

# CPU環境（フォールバック）
pip install torch torchvision torchaudio
pip install faster-whisper soundfile librosa
```

---

### ステップ2: GPU確認

```powershell
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

**期待される出力（GPU環境）**:
```
CUDA: True
GPU: NVIDIA GeForce RTX 3060
```

---

### ステップ3: .env.local を更新

```bash
# Whisperモデル（GPU環境）
WHISPER_MODEL_SIZE=large-v3  # 最高精度

# Whisperモデル（CPU環境）
WHISPER_MODEL_SIZE=large-v3  # 軽量
```

---

### ステップ4: 単体テスト

```powershell
# テスト用音声ファイルを用意（MP3, WAV, M4A等）
cd medical-transcription
python src/workers/whisper_processor.py path/to/test_audio.mp3
```

**期待される出力**:
```
Initializing Whisper model: large-v3
✅ Model loaded successfully on cuda
Transcribing...
Language: ja (prob: 98.45%)
Duration: 45.23s
Full text:
こんにちは、今日は糖尿病の治療についてお話しします。...
```

---

### ステップ5: 統合テスト

1. Docker起動: `docker compose up -d redis minio`
2. Next.js起動: `cd medical-transcription && npm run dev`
3. ワーカー起動: `python medical-transcription/src/workers/transcription_worker.py`
4. ブラウザで http://localhost:3000/login
5. 音声ファイルをアップロード

**期待される処理フロー**:
```
2% - Loading AI model...
5% - Downloading audio file...
10-70% - Transcribing audio with Whisper...
75% - Applying medical term corrections...
90% - Saving transcript...
100% - Completed
```

---

## 🔧 トラブルシューティング

### 問題: ログインできない

**原因**: 環境変数の `$` エスケープ忘れ

**解決方法**:
`.env.local` のパスワードハッシュを以下のように修正：
```bash
AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
```

---

### 問題: "ModuleNotFoundError: No module named 'faster_whisper'"

**原因**: Whisper依存がインストールされていない

**解決方法**:
```powershell
.\whisper-env\Scripts\Activate.ps1
pip install faster-whisper soundfile librosa
```

---

### 問題: "CUDA out of memory"

**原因**: GPUメモリ不足

**解決方法**:
`.env.local` でモデルサイズを小さくする：
```bash
WHISPER_MODEL_SIZE=medium  # または base
```

---

### 問題: 文字起こしが極端に遅い

**原因**: CPU環境で large モデルを使用している

**解決方法**:
`.env.local` でモデルサイズを小さくする：
```bash
WHISPER_MODEL_SIZE=large-v3  # CPU環境推奨
```

---

## 📚 詳細ドキュメント

- **Whisper詳細セットアップ**: `WHISPER_SETUP.md`
- **プロジェクト引き継ぎ**: `HANDOFF_TO_NEXT_AGENT.md`
- **仕様書**: `docs/SRS.md`
- **アーキテクチャ**: `docs/C4.md`

---

## 🎯 次のステップ

Whisper統合が完了したら、以下の機能を追加できます：

1. **話者分離（pyannote）** - 複数話者の自動識別
2. **要約生成（Ollama）** - 短/中/長の3種類の要約
3. **全文検索（SQLite FTS5）** - 原文+メタデータ検索

詳細は `HANDOFF_TO_NEXT_AGENT.md` を参照してください。

---

**セットアップ完了！実際の音声ファイルでテストしてください 🎉**

