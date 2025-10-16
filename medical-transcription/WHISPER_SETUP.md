# Whisper統合セットアップガイド

このガイドでは、faster-whisperを使った実際の音声文字起こし機能のセットアップ方法を説明します。

## 📋 前提条件

- **Python 3.11+**
- **仮想環境**: `whisper-pyannote-env`（既存）
- **GPU（推奨）**: NVIDIA CUDA対応GPU（RTX 3060 12GB等）
- **メモリ**: 最低8GB RAM（large-v3モデル使用時は16GB推奨）

---

## 🚀 セットアップ手順

### 1. Python仮想環境のアクティベート

```powershell
# プロジェクトルートから
.\whisper-env\Scripts\Activate.ps1
```

### 2. 依存パッケージのインストール

#### CUDA対応GPU環境（推奨）

```powershell
# PyTorch (CUDA 11.8対応)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Whisperと音声処理ライブラリ
pip install -r medical-transcription/requirements-worker.txt
```

#### CPU環境（フォールバック）

```powershell
# PyTorch (CPU版)
pip install torch torchvision torchaudio

# Whisperと音声処理ライブラリ
pip install -r medical-transcription/requirements-worker.txt
```

### 3. GPU対応の確認

```powershell
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

**期待される出力（GPU環境）**:
```
CUDA available: True
GPU: NVIDIA GeForce RTX 3060
```

---

## 🎯 Whisperモデルサイズの選択

| モデル | パラメータ数 | VRAM使用量 | 速度 | 精度 | 推奨用途 |
|--------|-------------|-----------|------|------|---------|
| `tiny` | 39M | ~1GB | 最速 | 低 | テスト用 |
| `base` | 74M | ~1GB | 高速 | 中 | 軽量処理 |
| `small` | 244M | ~2GB | 中速 | 中 | バランス型 |
| `medium` | 769M | ~5GB | 中速 | 高 | 高精度 |
| `large-v2` | 1550M | ~10GB | 低速 | 最高 | 最高精度 |
| `large-v3` | 1550M | ~10GB | 低速 | 最高 | **医療用推奨** |

### モデルサイズの設定方法

`.env.local` に以下を追加：

```bash
# Whisper model size: tiny, base, small, medium, large-v2, large-v3
WHISPER_MODEL_SIZE=large-v3
```

**推奨設定**:
- **本番環境（GPU）**: `large-v3`（最高精度）
- **開発環境（GPU）**: `medium`（バランス）
- **テスト環境（CPU）**: `base`（軽量）

---

## 🧪 テスト方法

### 1. Whisper Processorの単体テスト

```powershell
# テスト用音声ファイルを用意（MP3, WAV, M4A等）
# 例: test_audio.mp3

cd medical-transcription
python src/workers/whisper_processor.py path/to/test_audio.mp3
```

**期待される出力**:
```
Testing Whisper processor with: test_audio.mp3
Initializing Whisper model: large-v3
Device: cuda, Compute type: float16
✅ Model loaded successfully on cuda

Model info:
{
  "model_size": "large-v3",
  "device": "cuda",
  "compute_type": "float16",
  "loaded": true
}

Transcribing...
================================================================================
TRANSCRIPTION RESULT
================================================================================

Language: ja (prob: 98.45%)
Duration: 45.23s
Confidence: -0.35

Full text:
こんにちは、今日は糖尿病の治療についてお話しします。...

Segments: 15
```

### 2. ワーカー全体の統合テスト

#### ステップ1: Docker起動

```powershell
# プロジェクトルートから
docker compose up -d redis minio
```

#### ステップ2: Next.js開発サーバー起動

```powershell
# Terminal 1
cd medical-transcription
npm run dev
```

#### ステップ3: Pythonワーカー起動

```powershell
# Terminal 2
.\whisper-env\Scripts\Activate.ps1
python medical-transcription/src/workers/transcription_worker.py
```

**期待されるログ出力**:
```
INFO - Transcription worker initialized
INFO - Redis: redis://localhost:6379
INFO - S3: http://localhost:9000
INFO - Bucket: medical-transcription
INFO - Whisper model: large-v3
INFO - Worker started. Subscribing to 'job:new' channel...
INFO - Waiting for jobs...
```

#### ステップ4: ファイルアップロードと文字起こし

1. ブラウザで `http://localhost:3000/login` にアクセス
2. ログイン: `admin` / `test123`
3. 音声ファイル（MP3/WAV/M4A）をドラッグ&ドロップ
4. 処理の進捗をリアルタイムで確認

**期待される処理フロー**:
```
2% - Loading AI model...
5% - Downloading audio file...
10% - Transcribing audio with Whisper...
15-70% - Processing audio segments... (X)
75% - Applying medical term corrections...
90% - Saving transcript...
100% - Completed
```

---

## 🔧 トラブルシューティング

### 問題1: `ModuleNotFoundError: No module named 'faster_whisper'`

**原因**: 依存パッケージがインストールされていない

**解決方法**:
```powershell
.\whisper-env\Scripts\Activate.ps1
pip install -r medical-transcription/requirements-worker.txt
```

---

### 問題2: `CUDA out of memory`

**原因**: GPUメモリ不足

**解決方法**:
1. `.env.local` でモデルサイズを小さくする:
   ```bash
   WHISPER_MODEL_SIZE=medium  # または base
   ```

2. または、CPU環境にフォールバック（自動）

---

### 問題3: 文字起こしが極端に遅い（CPU環境）

**原因**: CPUでの処理は非常に遅い（GPU比で10-20倍）

**解決方法**:
1. モデルサイズを小さくする: `base` または `tiny`
2. GPU環境を用意する（推奨）
3. より短い音声ファイルでテストする

---

### 問題4: 日本語が正しく認識されない

**原因**: モデルサイズが小さすぎる、または言語設定が間違っている

**解決方法**:
1. `medium` 以上のモデルを使用
2. `whisper_processor.py` の `language='ja'` を確認

---

## 📊 パフォーマンス目安

### GPU環境（RTX 3060 12GB）

| モデル | 1分音声の処理時間 | VRAM使用量 |
|--------|------------------|-----------|
| `base` | ~5秒 | ~1.5GB |
| `medium` | ~15秒 | ~5GB |
| `large-v3` | ~30秒 | ~10GB |

### CPU環境（i7-12700）

| モデル | 1分音声の処理時間 |
|--------|------------------|
| `tiny` | ~1分 |
| `base` | ~2分 |
| `small` | ~5分 |
| `medium` | ~15分 |

---

## 🎯 次のステップ

Whisper統合が完了したら、以下の機能を追加できます：

1. **話者分離（pyannote）** - 複数話者の自動識別
2. **要約生成（Ollama）** - 短/中/長の3種類の要約
3. **全文検索（SQLite FTS5）** - 原文+メタデータ検索
4. **UIの改善** - セグメントタイムライン、話者ラベル編集

---

## 📝 設定ファイル参考

### `.env.local` 完全版

```bash
# 認証
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
JWT_SECRET=dev-secret-key-change-in-production

# データベース
DATABASE_URL=file:./prisma/transcription.db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3互換)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=medical-transcription
S3_REGION=us-east-1

# Whisper設定
WHISPER_MODEL_SIZE=large-v3  # tiny, base, small, medium, large-v2, large-v3
```

---

## 🔗 参考資料

- **faster-whisper**: https://github.com/SYSTRAN/faster-whisper
- **Whisper公式**: https://github.com/openai/whisper
- **PyTorch CUDA**: https://pytorch.org/get-started/locally/
- **医療用語辞書**: `medical-transcription/medical_dictionary.json`

---

**セットアップ完了後は、実際の音声ファイルで動作確認してください！** 🎉

