# 🐳 Docker セットアップガイド（推奨）

このガイドでは、Dockerを使用したWhisperPlaudの簡単なセットアップ方法を説明します。

**利点**:
- ✅ CUDA/CUDAツールキットの手動インストール不要
- ✅ FFmpegの手動インストール不要
- ✅ Python環境の手動セットアップ不要
- ✅ 依存関係の競合なし
- ✅ 1コマンドで全サービス起動

---

## 📋 前提条件

### 必須
1. **Docker Desktop** (Windows 10/11)
   - https://www.docker.com/products/docker-desktop/

2. **NVIDIA GPU** + **ドライバー**
   - NVIDIA GPU（RTX 3060以上推奨）
   - 最新のNVIDIAドライバー（自動Windows Update推奨）

3. **NVIDIA Container Toolkit**（Docker Desktopに統合済み）
   - Docker Desktop 4.19以降で自動サポート

### オプション
- **WSL2**（Docker Desktopで自動セットアップ）

---

## 🚀 セットアップ手順

### Step 1: Docker Desktopのインストール

1. Docker Desktop for Windowsをダウンロード
   - https://www.docker.com/products/docker-desktop/

2. インストーラーを実行
   - "Use WSL 2 instead of Hyper-V" を選択（推奨）
   - インストール完了後、再起動

3. Docker Desktopを起動
   - タスクトレイのDockerアイコンが緑色になればOK

---

### Step 2: NVIDIA GPU サポート確認

Docker DesktopでGPUが使えるか確認：

```powershell
# GPUの確認
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

**期待される出力**:
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.xx.xx    Driver Version: 535.xx.xx    CUDA Version: 12.x   |
|-------------------------------+----------------------+----------------------+
| GPU  Name        TCC/WDDM | Bus-Id        Disp.A | Volatile Uncorr. ECC |
|===============================+======================+======================|
|   0  NVIDIA GeForce ... WDDM  | 00000000:01:00.0 Off |                  N/A |
+-------------------------------+----------------------+----------------------+
```

**エラーが出た場合**:
1. Docker Desktop → Settings → Resources → WSL Integration を確認
2. NVIDIAドライバーを最新に更新
3. Docker Desktopを再起動

---

### Step 3: Hugging Face Token の設定

1. Hugging Face Token を取得
   - https://huggingface.co/settings/tokens
   - "New token" → Name: `whisperplaud` → Role: `read`

2. `.env.local` に追加
   ```bash
   # medical-transcription/.env.local
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxx
   ```

---

### Step 4: Dockerイメージのビルド

```powershell
# プロジェクトルートで実行
cd C:\Users\user\Desktop\Git\WhisperPlaud

# すべてのサービスをビルド
docker compose build

# WhisperXワーカーのみビルド（初回は時間がかかります）
docker compose build worker
```

**初回ビルド時間**: 約10-15分（依存関係のダウンロード）

---

### Step 5: サービスの起動

```powershell
# すべてのサービスを起動（バックグラウンド）
docker compose up -d

# ログを確認
docker compose logs -f worker
```

**正常起動の確認**:
```
worker-1  | [Worker] Using device: cuda
worker-1  | [Worker] CUDA available: True
worker-1  | [Worker] GPU: NVIDIA GeForce RTX 3060
worker-1  | [Worker] VRAM: 12.0 GB
worker-1  | [Worker] Worker is ready and listening for jobs...
```

---

### Step 6: 動作確認

1. ブラウザで開く: http://localhost:3000/login
2. ログイン: `admin` / `test123`
3. 音声ファイルをアップロード
4. 文字起こし処理を確認

---

## 🛠️ よく使うコマンド

### サービス管理

```powershell
# すべてのサービスを起動
docker compose up -d

# 特定のサービスのみ起動
docker compose up -d redis minio worker

# サービスの停止
docker compose down

# サービスの再起動
docker compose restart worker

# ログの確認
docker compose logs -f worker
docker compose logs -f app

# サービスの状態確認
docker compose ps
```

### イメージ管理

```powershell
# イメージの再ビルド（強制）
docker compose build --no-cache worker

# 古いイメージの削除
docker image prune -a

# すべてのコンテナ・イメージ・ボリュームを削除（クリーンアップ）
docker compose down -v --rmi all
```

### デバッグ

```powershell
# ワーカーコンテナに入る
docker compose exec worker bash

# GPU確認（コンテナ内で）
docker compose exec worker python3 -c "import torch; print(f'CUDA: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0)}')"

# ワーカーを対話モードで起動
docker compose run --rm worker bash
```

---

## 📊 リソース使用量

### メモリ・VRAM

| サービス | RAM | VRAM |
|---------|-----|------|
| Redis | ~50MB | - |
| MinIO | ~100MB | - |
| Next.js | ~200MB | - |
| Worker (待機中) | ~500MB | ~2GB |
| Worker (処理中) | ~2GB | ~6-8GB |

### ディスク容量

| 項目 | サイズ |
|-----|-------|
| Dockerイメージ（worker） | ~8GB |
| Dockerイメージ（app） | ~500MB |
| Dockerボリューム | ~100MB |
| WhisperXモデル（初回DL） | ~3GB |

---

## 🚨 トラブルシューティング

### GPUが認識されない

```powershell
# Docker Desktop → Settings → Resources → WSL Integration
# "Enable integration with additional distros" をON

# Docker Desktopを再起動
```

### ビルドエラー: "CUDA not found"

```powershell
# Dockerfile.worker の CUDA バージョンを確認
# nvidia-smi で表示される CUDA Version に合わせる

# 例: CUDA 12.x の場合
# FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04
```

### ワーカーが起動しない

```powershell
# ログを詳細確認
docker compose logs worker

# よくある原因:
# 1. HF_TOKEN が設定されていない → .env.local を確認
# 2. GPUメモリ不足 → nvidia-smi で確認
# 3. 他のアプリがGPUを使用中 → タスクマネージャーで確認
```

### メモリ不足エラー

```powershell
# Docker Desktop → Settings → Resources
# Memory を 8GB 以上に設定
```

---

## 🔄 従来方式との比較

| 項目 | 従来（手動） | Docker（推奨） |
|-----|------------|---------------|
| CUDA Toolkit | 手動インストール（2GB+） | 不要（イメージに含まれる） |
| FFmpeg | 手動インストール | 不要（イメージに含まれる） |
| Python環境 | 仮想環境作成 | 不要（コンテナ内） |
| 依存関係 | pip install | 自動（ビルド時） |
| セットアップ時間 | 30-60分 | 10-15分 |
| 環境の再現性 | 低（OS依存） | 高（完全分離） |

---

## 🎯 推奨ワークフロー

### 開発時

```powershell
# 1. サービス起動
docker compose up -d

# 2. Next.js開発サーバー（ホストで実行）
cd medical-transcription
npm run dev

# 3. ワーカーはDockerで実行（GPU必要）
docker compose logs -f worker
```

### 本番環境

```powershell
# すべてDockerで実行
docker compose up -d

# 自動起動設定
docker compose up -d --restart unless-stopped
```

---

## 📝 次のステップ

1. ✅ Docker環境のセットアップ完了
2. ✅ WhisperXワーカーの起動確認
3. ⏭️ 実際の音声ファイルでテスト
4. ⏭️ 話者ラベル編集UIの実装
5. ⏭️ Ollama要約機能の追加

---

## 🔗 参考リンク

- **Docker Desktop**: https://www.docker.com/products/docker-desktop/
- **NVIDIA Container Toolkit**: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/
- **WhisperX**: https://github.com/m-bain/whisperX
- **NVIDIA CUDA Images**: https://hub.docker.com/r/nvidia/cuda

---

**Dockerを使えば、複雑な環境構築が1コマンドで完了します！🚀**

