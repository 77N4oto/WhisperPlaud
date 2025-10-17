# WhisperX セットアップガイド

このドキュメントは、WhisperXを使用した文字起こしワーカーのセットアップ手順を説明します。

---

## 📋 システム要件

### 必須
- **NVIDIA GPU** - CUDA 11.8以降対応
- **VRAM** - 6GB以上推奨（最低4GB）
- **OS** - Windows 10/11
- **Python** - 3.11以降
- **FFmpeg** - システムにインストール済み

### 推奨スペック
- **GPU**: NVIDIA RTX 3060 (12GB VRAM) 以上
- **RAM**: 16GB以上
- **ストレージ**: 10GB以上の空き容量（モデルダウンロード用）

---

## 🔧 セットアップ手順

### Step 1: CUDA Toolkitのインストール

1. NVIDIA公式サイトからCUDA Toolkit 11.8以降をダウンロード
   - https://developer.nvidia.com/cuda-downloads

2. インストーラーを実行してCUDAをインストール

3. 環境変数の確認（PowerShellで実行）
   ```powershell
   nvcc --version
   ```
   
   CUDAバージョンが表示されればOK

---

### Step 2: FFmpegのインストール

PowerShellで以下を実行：

```powershell
# wingetを使用（Windows 11 / Windows 10 最新版）
winget install ffmpeg

# または、Chocolateyを使用
choco install ffmpeg

# インストール確認
ffmpeg -version
```

---

### Step 3: Hugging Face Token の取得

WhisperXの話者分離機能（pyannote.audio）には、Hugging Face Tokenが必要です。

1. Hugging Faceアカウントを作成（無料）
   - https://huggingface.co/join

2. Tokenを生成
   - https://huggingface.co/settings/tokens
   - "New token" をクリック
   - Name: `whisperplaud-worker`
   - Role: `read` （読み取り専用でOK）
   - "Generate a token" をクリック

3. Tokenをコピー（`hf_xxxxxxxxxxxxxxxxxxxxx` の形式）

---

### Step 4: 環境変数の設定

`.env.local` ファイルに以下を追加：

```bash
# Hugging Face Token
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx

# WhisperX設定（オプション）
WHISPER_MODEL_SIZE=large-v2  # または large-v3
WHISPER_DEVICE=auto          # 自動でCUDAを使用
```

---

### Step 5: Python依存関係のインストール

```powershell
# 仮想環境のアクティベート
.\whisper-pyannote-env\Scripts\Activate.ps1

# WhisperXと依存関係をインストール
pip install -r medical-transcription/requirements-worker.txt

# GPU確認
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

**期待される出力**:
```
CUDA available: True
GPU: NVIDIA GeForce RTX 3060
```

---

### Step 6: 動作確認

```powershell
# Pythonワーカーを起動
python medical-transcription/src/workers/transcription_worker.py
```

**正常起動の場合**:
```
[Worker] Loaded .env.local from: ...
Connected to Redis: redis://localhost:6379
Connected to S3: http://localhost:9000
Using device: cuda
CUDA available: True
GPU: NVIDIA GeForce RTX 3060
VRAM: 12.0 GB
Loaded 10 medical terms
Worker initialization complete
Worker is ready and listening for jobs...
Subscribed to Redis channel: job:new
Waiting for transcription jobs...
```

---

## 🚨 トラブルシューティング

### GPU/CUDAが認識されない

```powershell
# CUDAインストール確認
nvcc --version

# PyTorchのCUDA対応確認
python -c "import torch; print(torch.version.cuda)"

# 再インストール（CUDA 11.8用）
pip uninstall torch torchaudio
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### FFmpegが見つからない

```powershell
# FFmpegのパス確認
where.exe ffmpeg

# 環境変数PATHに追加（システムプロパティ → 環境変数）
```

### Hugging Face Token エラー

```
ValueError: HF_TOKEN not set
```

→ `.env.local` に `HF_TOKEN=hf_xxx...` を追加してください

### VRAM不足エラー

```
RuntimeError: CUDA out of memory
```

→ より小さいモデルに変更：
```bash
WHISPER_MODEL_SIZE=medium  # または small
```

---

## 📊 モデルサイズとVRAM要件

| モデル | VRAM必要量 | 精度 | 処理速度 |
|--------|-----------|------|---------|
| small  | 2-3GB     | 中   | 速い    |
| medium | 4-5GB     | 高   | 普通    |
| large-v2 | 6-8GB   | 最高 | やや遅い |
| large-v3 | 6-8GB   | 最高 | やや遅い |

**推奨**: `large-v2`（精度と速度のバランスが良い）

---

## 🎯 次のステップ

1. ✅ WhisperXセットアップ完了
2. ✅ ワーカー起動確認
3. ⏭️ Webアプリから音声ファイルをアップロードしてテスト
4. ⏭️ 文字起こし結果と話者分離を確認

---

## 📚 参考リンク

- **WhisperX GitHub**: https://github.com/m-bain/whisperX
- **pyannote.audio**: https://github.com/pyannote/pyannote-audio
- **CUDA Toolkit**: https://developer.nvidia.com/cuda-toolkit
- **Hugging Face**: https://huggingface.co/

---

**セットアップ完了後は、`docs/HANDOFF.md` の「次の手」に従って開発を進めてください！**

