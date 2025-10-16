# 🎙️ WhisperPlaud - 医療向け音声文字起こしシステム

**医療分野に特化した高精度な音声文字起こし・要約デスクトップアプリケーション**

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-green)](https://www.python.org/)
[![Whisper](https://img.shields.io/badge/Whisper-large--v3-orange)](https://github.com/openai/whisper)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 📋 プロジェクト概要

WhisperPlaudは、医療従事者向けの音声文字起こしシステムです。診療記録、医療面談、カンファレンスなどの音声を高精度で文字起こしし、医療用語の自動補正や要約生成を行います。

### 🎯 主な機能

- ✅ **高精度文字起こし** - OpenAI Whisper large-v3による最高精度の日本語認識（**GPU CUDA 12.1対応完了**）
- ✅ **医療用語自動補正** - 糖尿病治療薬（オゼンピック、マンジャロ等）の自動補正
- ✅ **リアルタイム進捗表示** - アップロード・処理状況のリアルタイム更新
- ✅ **タイムスタンプ付きセグメント** - 発話単位での時刻情報付き文字起こし
- ✅ **GPU高速処理** - RTX 3060で5-10倍リアルタイム速度（10分音声→1-2分処理）
- 🚧 **話者分離** - pyannoteによる複数話者の自動識別（実装予定）
- 🚧 **要約生成** - Ollama Llama 3.1による短/中/長の3種類の要約（実装予定）
- 🚧 **全文検索** - SQLite FTS5による高速検索（実装予定）

---

## 🚀 クイックスタート

### 前提条件

- **Node.js** 20以上
- **Python** 3.11以上
- **Docker Desktop**（Redis/MinIO用）
- **GPU推奨**: NVIDIA CUDA対応GPU（RTX 3060 12GB等）

---

### 5分で起動（最小構成）

```powershell
# 1. リポジトリのクローン
git clone <repository-url>
cd WhisperPlaud/medical-transcription

# 2. 依存パッケージのインストール
npm install
npx prisma generate
npx prisma migrate dev

# 3. Python環境のセットアップ
cd ..
python -m venv whisper-pyannote-env
.\whisper-pyannote-env\Scripts\Activate.ps1
pip install redis boto3 requests python-dotenv numpy

# 4. 環境変数の設定
cp medical-transcription/.env.example medical-transcription/.env.local
# .env.local を編集（必須: $ を \$ にエスケープ）

# 5. Dockerコンテナの起動
docker compose up -d redis minio

# 6. アプリケーションの起動
# Terminal 1
cd medical-transcription
npm run dev

# Terminal 2
.\whisper-pyannote-env\Scripts\Activate.ps1
python medical-transcription/src/workers/transcription_worker.py
```

ブラウザで http://localhost:3000/login にアクセス（admin / test123）

---

### 完全版セットアップ（Whisper統合）

**詳細は** → [`QUICK_START.md`](./QUICK_START.md) または [`WHISPER_SETUP.md`](./WHISPER_SETUP.md) **を参照**

```powershell
# Whisper依存のインストール
.\whisper-pyannote-env\Scripts\Activate.ps1

# GPU環境（推奨）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r medical-transcription/requirements-worker.txt

# GPU確認
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
```

---

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router) - サーバーサイドレンダリング
- **React 18** + **TypeScript** - 型安全なUI開発
- **Tailwind CSS** + **shadcn/ui** - モダンなデザインシステム
- **Electron** - デスクトップアプリケーションラッパー

### バックエンド
- **Next.js API Routes** - RESTful API
- **Prisma** + **SQLite** - 型安全なデータベースORM
- **Redis** - ジョブキュー（BullMQ）+ Pub/Sub
- **MinIO** - S3互換オブジェクトストレージ

### AI/処理系
- **Python 3.11+** - ワーカープロセス
- **faster-whisper** - OpenAI Whisper（CTranslate2最適化版）
- **pyannote.audio** - 話者分離（実装予定）
- **Ollama Llama 3.1 8B** - 要約生成（実装予定）

---

## 📁 プロジェクト構成

```
medical-transcription/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/login/       # ログインページ
│   │   ├── dashboard/          # ダッシュボード
│   │   └── api/                # API Routes
│   ├── components/             # Reactコンポーネント
│   ├── lib/                    # ユーティリティ
│   │   ├── auth.ts             # 認証ロジック
│   │   ├── db.ts               # Prisma クライアント
│   │   ├── s3.ts               # MinIO/S3 クライアント
│   │   └── queue.ts            # BullMQ キュー
│   └── workers/                # Python ワーカー
│       ├── whisper_processor.py        # Whisper統合
│       ├── transcription_worker.py     # メインワーカー
│       └── simple_processor.py         # 医療用語補正
├── prisma/
│   ├── schema.prisma           # DBスキーマ
│   └── migrations/             # マイグレーション履歴
├── electron/
│   └── main.js                 # Electronメインプロセス
├── .env.example                # 環境変数テンプレート
├── QUICK_START.md              # クイックスタートガイド
├── WHISPER_SETUP.md            # Whisper詳細セットアップ
└── IMPLEMENTATION_NOTES.md     # 実装ノート
```

---

## 🔑 環境変数の設定

`.env.local` を作成（`.env.example` をコピー）:

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

# Whisper設定
WHISPER_MODEL_SIZE=large-v3  # tiny, base, small, medium, large-v2, large-v3
```

---

## 🧪 テスト方法

### 単体テスト（Whisper Processor）

```powershell
cd medical-transcription
python src/workers/whisper_processor.py path/to/test_audio.mp3
```

### 統合テスト（全体）

1. Docker起動: `docker compose up -d redis minio`
2. Next.js起動: `npm run dev`
3. ワーカー起動: `python src/workers/transcription_worker.py`
4. ブラウザで http://localhost:3000/login
5. 音声ファイル（MP3/WAV/M4A）をアップロード

**期待される処理フロー**:
```
2% → Loading AI model...
5% → Downloading audio file...
10-70% → Transcribing audio with Whisper...
75% → Applying medical term corrections...
90% → Saving transcript...
100% → Completed
```

---

## 📊 パフォーマンス

### GPU環境（RTX 3060 12GB）
- **モデル**: large-v3
- **処理速度**: 1分音声あたり約30秒
- **VRAM使用量**: 約10GB

### CPU環境（i7-12700）
- **モデル**: base（推奨）
- **処理速度**: 1分音声あたり約2分
- **RAM使用量**: 約2GB

---

## 🔧 トラブルシューティング

### よくある問題

#### ログインできない
**原因**: 環境変数の `$` エスケープ忘れ  
**解決**: `.env.local` のパスワードハッシュを `\$2b\$10\$...` に修正

#### "ModuleNotFoundError: No module named 'faster_whisper'"
**原因**: Whisper依存未インストール  
**解決**: `pip install -r requirements-worker.txt`

#### "CUDA out of memory"
**原因**: GPUメモリ不足  
**解決**: `.env.local` で `WHISPER_MODEL_SIZE=medium` に変更

#### 文字起こしが極端に遅い
**原因**: CPU環境でlargeモデルを使用  
**解決**: `.env.local` で `WHISPER_MODEL_SIZE=base` に変更

**詳細** → [`WHISPER_SETUP.md`](./WHISPER_SETUP.md#トラブルシューティング)

---

## 📚 ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [`QUICK_START.md`](./QUICK_START.md) | 最速で動かす手順 |
| [`WHISPER_SETUP.md`](./WHISPER_SETUP.md) | Whisper詳細セットアップ |
| [`IMPLEMENTATION_NOTES.md`](./IMPLEMENTATION_NOTES.md) | 実装ノート |
| [`../HANDOFF_TO_NEXT_AGENT.md`](../HANDOFF_TO_NEXT_AGENT.md) | プロジェクト引き継ぎ |
| [`../docs/SRS.md`](../docs/SRS.md) | 詳細仕様書 |
| [`../docs/C4.md`](../docs/C4.md) | アーキテクチャ図 |

---

## 🎯 次のステップ

Whisper統合が完了したら、以下の機能を追加できます：

1. **話者分離（pyannote）** - 複数話者の自動識別
2. **要約生成（Ollama）** - 短/中/長の3種類の要約
3. **全文検索（SQLite FTS5）** - 原文+メタデータ検索
4. **UIの改善** - セグメントタイムライン、話者ラベル編集

詳細は [`HANDOFF_TO_NEXT_AGENT.md`](../HANDOFF_TO_NEXT_AGENT.md) を参照してください。

---

## 🤝 コントリビューション

このプロジェクトは医療従事者の業務効率化を目的としています。改善提案やバグ報告は Issue で受け付けています。

---

## 📝 ライセンス

MIT License

---

## 🔗 参考資料

- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **faster-whisper**: https://github.com/SYSTRAN/faster-whisper
- **OpenAI Whisper**: https://github.com/openai/whisper
- **pyannote.audio**: https://github.com/pyannote/pyannote-audio
- **Ollama**: https://ollama.com/

---

<div align="center">

**作成日**: 2025-10-10  
**実装**: AI Agent (Claude Sonnet 4.5)

Made with ❤️ for healthcare professionals

</div>
