# WhisperPlaud 🎙️

医療分野向けの音声文字起こし・要約システム（デスクトップGUIアプリケーション）

## 🎯 主な機能

- **高精度文字起こし** - WhisperX（Whisper large-v2/v3）による医療用語対応
- **話者分離** - pyannote.audioによる自動話者識別（医師/患者の区別）
- **単語レベルタイムスタンプ** - 音素アライメントによる正確な位置情報
- **医療用語補正** - カスタム辞書による専門用語の自動修正
- **AI要約生成** - Ollama Llama 3.1 8Bによる短/中/長の3種類の要約
- **全文検索** - SQLite FTS5による高速な原文検索
- **デスクトップGUI** - Electronによるネイティブアプリ体験
- **完全ローカル** - すべての処理がローカルPCで完結（プライバシー保護）

---

## 🚀 クイックスタート（Docker推奨）

### 前提条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows
- NVIDIA GPU + 最新ドライバー
- Node.js 20+

### セットアップ

```powershell
# 1. リポジトリのクローン
git clone https://github.com/77N4oto/WhisperPlaud.git
cd WhisperPlaud

# 2. 環境変数の設定
cp medical-transcription/.env.example medical-transcription/.env.local
# .env.local を編集して HF_TOKEN を追加
# HF Token: https://huggingface.co/settings/tokens

# 3. Dockerイメージのビルド
make docker-build

# 4. サービスの起動
make docker-up

# 5. ブラウザで開く
# http://localhost:3000/login
# ログイン: admin / test123
```

**詳細**: [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

## 📋 システム要件

| 項目 | 要件 |
|------|------|
| **OS** | Windows 10/11 |
| **GPU** | NVIDIA GPU（CUDA 11.8+） |
| **VRAM** | 6GB以上推奨 |
| **RAM** | 16GB以上推奨 |
| **ストレージ** | 20GB以上の空き容量 |
| **Docker** | Docker Desktop 4.19+ |

---

## 🏗️ アーキテクチャ

### 技術スタック

**フロントエンド**:
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Electron

**バックエンド**:
- Next.js API Routes
- Prisma + SQLite
- Redis (BullMQ + Pub/Sub)
- MinIO (S3互換)

**AI/処理**:
- WhisperX (Whisper + pyannote)
- Ollama Llama 3.1 8B
- CUDA 11.8+

### サービス構成

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Next.js    │  │   Redis     │  │   MinIO     │
│  Web App    │──│  (BullMQ)   │──│ (S3 Store)  │
└─────────────┘  └─────────────┘  └─────────────┘
       │
       │ Job Queue
       │
       ▼
┌─────────────────────────────┐
│  WhisperX Worker (Docker)   │
│  - Whisper Transcription    │
│  - Speaker Diarization      │
│  - Medical Term Correction  │
└─────────────────────────────┘
```

---

## 📚 ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [DOCKER_SETUP.md](DOCKER_SETUP.md) | **推奨**: Dockerセットアップガイド |
| [HANDOFF_TO_NEXT_AGENT.md](HANDOFF_TO_NEXT_AGENT.md) | 開発引き継ぎドキュメント |
| [docs/BRD.md](docs/BRD.md) | ビジネス要件定義 |
| [docs/SRS.md](docs/SRS.md) | 詳細仕様書 |
| [docs/TESTPLAN.md](docs/TESTPLAN.md) | テスト計画 |
| [docs/C4.md](docs/C4.md) | アーキテクチャ図（C4モデル） |
| [docs/ADR.md](docs/ADR.md) | アーキテクチャ決定記録 |
| [medical-transcription/SETUP_WHISPERX.md](medical-transcription/SETUP_WHISPERX.md) | 手動セットアップガイド（上級者向け） |

---

## 🛠️ よく使うコマンド

```powershell
# サービス管理
make docker-up          # すべてのサービスを起動
make docker-down        # すべてのサービスを停止
make docker-logs        # ログを確認
make docker-restart     # サービスを再起動

# ワーカー管理
make docker-worker-logs # ワーカーのログを確認
make docker-gpu-check   # GPU認識を確認
make docker-shell       # ワーカーコンテナに入る

# 開発
make bootstrap          # 初回セットアップ
make dev                # Next.js開発サーバー起動
make clean              # クリーンアップ
```

---

## 🎯 開発ロードマップ

### ✅ 完了
- [x] 認証機能（固定ユーザー、JWT Cookie）
- [x] ファイルアップロード（ドラッグ&ドロップ、リアルタイム進捗）
- [x] ファイル管理UI（一覧表示、削除、自動更新）
- [x] WhisperXワーカー実装（文字起こし + 話者分離）
- [x] リアルタイム進捗更新（Redis Pub/Sub）
- [x] Docker環境構築
- [x] Electronデスクトップアプリ

### 🚧 進行中
- [ ] WhisperX実環境テスト
- [ ] 話者ラベル編集UI
- [ ] 要約生成（Ollama連携）
- [ ] 全文検索機能
- [ ] PLAUD共有リンク対応

---

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

---

## 📄 ライセンス

このプロジェクトは個人利用を目的としています。

---

## 🔗 リンク

- **GitHub**: https://github.com/77N4oto/WhisperPlaud
- **WhisperX**: https://github.com/m-bain/whisperX
- **pyannote.audio**: https://github.com/pyannote/pyannote-audio
- **Ollama**: https://ollama.com/

---

## 💬 サポート

問題が発生した場合は、以下を確認してください：

1. [DOCKER_SETUP.md](DOCKER_SETUP.md) のトラブルシューティング
2. [GitHub Issues](https://github.com/77N4oto/WhisperPlaud/issues)
3. ドキュメント: [docs/](docs/)

---

**WhisperPlaud - 医療現場の音声をテキストに、知識に変える**

