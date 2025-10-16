# Whisper設定統一: large-v3 + GPU

## 📋 変更内容

すべての設定ファイルとコードを**large-v3モデル + GPU（自動検出）**に統一しました。

---

## ✅ 修正したファイル

### 1. **環境変数ファイル**

#### `.env.local`
```env
WHISPER_MODEL_SIZE=large-v3
WHISPER_DEVICE=auto
```

#### `.env`
```env
WHISPER_MODEL_SIZE=large-v3
WHISPER_DEVICE=auto
WHISPER_COMPUTE_TYPE=float16
```

### 2. **Pythonコード**

#### `src/workers/transcription_worker.py`
```python
# デフォルト値を large-v3 に統一
self.whisper_model_size = os.getenv('WHISPER_MODEL_SIZE', 'large-v3')
self.whisper_device = os.getenv('WHISPER_DEVICE', 'auto')
```

### 3. **ドキュメント**

- ✅ `QUICK_START.md` - 例示をlarge-v3に更新
- ✅ `WHISPER_SETUP.md` - 例示をlarge-v3に更新
- ✅ `README.md` - すでにlarge-v3が推奨

---

## 🎯 統一後の設定

| 項目 | 値 | 説明 |
|------|-----|------|
| **モデル** | `large-v3` | OpenAI Whisperの最新・最高精度モデル |
| **デバイス** | `auto` | CUDA GPU利用可能なら自動選択、なければCPU |
| **計算型** | `float16` | GPU使用時の高速化（CUDA専用） |
| **モデルサイズ** | 約3GB | ダウンロード・初回ロードに時間がかかる |
| **メモリ使用量** | 4-6GB (GPU) | RTX 3060 12GBで快適に動作 |

---

## 🔧 デバイス自動選択の挙動

### `WHISPER_DEVICE=auto` の場合

1. **CUDA GPU利用可能** → `cuda` + `float16`
2. **CUDAなし** → `cpu` + `int8`

### whisper_processor.pyの実装

```python
def _initialize_model(self):
    from faster_whisper import WhisperModel
    
    # デバイス・計算型の決定
    if self.device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
    # ...
    
    self.model = WhisperModel(
        self.model_size,
        device=device,
        compute_type=compute_type
    )
```

---

## 📊 large-v3 モデルの特徴

### メリット

- ✅ **最高精度**: WER（Word Error Rate）が最も低い
- ✅ **多言語対応**: 99言語に対応
- ✅ **医療用語**: 専門用語の認識率が高い
- ✅ **タイムスタンプ精度**: セグメント分割が正確

### デメリット

- ⚠️ **初回ダウンロード**: 約3GB（1回のみ）
- ⚠️ **メモリ使用量**: GPU VRAM 4-6GB必要
- ⚠️ **処理時間**: baseモデルの2-3倍（GPU使用時）
- ⚠️ **CPU処理**: 非常に遅い（実用的でない）

---

## 🖥️ ハードウェア要件

### 推奨環境（GPU）

| GPU | VRAM | 処理速度 | 状態 |
|-----|------|---------|------|
| **RTX 3060** | 12GB | 5-10x リアルタイム | ✅ 快適 |
| RTX 2060 | 6GB | 3-5x リアルタイム | ✅ 良好 |
| GTX 1660 | 6GB | 2-4x リアルタイム | ⚠️ やや遅い |

### CPU環境

| CPU | 処理速度 | 状態 |
|-----|---------|------|
| i7-12700 | 0.2-0.5x リアルタイム | ❌ 非推奨 |
| i9-13900 | 0.3-0.7x リアルタイム | ❌ 非推奨 |

**注**: large-v3をCPUで使用すると、10分の音声に30-50分かかります。

---

## 🚀 Workerの起動方法

### GPU環境（推奨）

```powershell
# 仮想環境アクティベート
C:\Users\user\Desktop\Git\WhisperPlaud\whisper-env\Scripts\Activate.ps1

# ワーカーディレクトリに移動
cd C:\Users\user\Desktop\Git\WhisperPlaud\medical-transcription\src\workers

# Workerを起動（GPUは自動検出）
python transcription_worker.py
```

**期待されるログ**:
```
INFO:__main__:Transcription worker initialized
INFO:__main__:Whisper model: large-v3
INFO:__main__:Worker started. Subscribing to 'job:new' channel...
INFO:__main__:Waiting for jobs...
```

初回起動時:
```
INFO:__main__:Initializing Whisper model: large-v3
Downloading model... (約3GB、5-10分)
INFO:__main__:Whisper model initialized: {'model_size': 'large-v3', 'device': 'cuda', 'compute_type': 'float16'}
```

---

## 🎤 使用方法

1. **ブラウザでログイン**: http://localhost:3000/login
   - ユーザー名: `admin`
   - パスワード: `test123`

2. **音声ファイルをアップロード**
   - 対応形式: MP3, MP4, WAV, M4A
   - 推奨サイズ: 1-10分の音声

3. **文字起こし処理**
   - GPU使用時: リアルタイムの5-10倍速
   - 進捗がリアルタイムで表示
   - 完了後、右パネルに結果が表示

---

## 🐛 トラブルシューティング

### GPU が認識されない

```powershell
# CUDA確認
python -c "import torch; print(torch.cuda.is_available())"
# True が表示されればOK
```

### モデルダウンロードが遅い

- 初回のみ約3GB（5-10分）
- `~/.cache/huggingface/` に保存される
- 2回目以降は即座にロード

### メモリ不足エラー

```
CUDA out of memory
```

→ 小さいモデルに変更:
```env
# .env.local
WHISPER_MODEL_SIZE=medium  # または small
```

---

## 📁 関連ファイル

- `medical-transcription/.env.local` - ローカル環境変数（優先度：高）
- `medical-transcription/.env` - デフォルト環境変数
- `medical-transcription/src/workers/transcription_worker.py` - Worker本体
- `medical-transcription/src/workers/whisper_processor.py` - Whisperラッパー

---

**更新日時**: 2025-10-16 14:00  
**ステータス**: ✅ 統一完了 - large-v3 + GPU

