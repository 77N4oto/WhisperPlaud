# 🚀 WhisperPlaud プロジェクト引き継ぎドキュメント

## 📋 プロジェクト概要

**WhisperPlaud** は、医療分野向けの音声文字起こし・要約システムです。デスクトップGUIアプリケーションとして、Windows 10/11のローカル環境で動作します。

### 🎯 主な機能
1. **音声ファイルアップロード** - ドラッグ&ドロップ、リアルタイム進捗表示
2. **文字起こし処理** - faster-whisper/WhisperX/pyannoteによる高精度な文字起こし
3. **医療用語補正** - 医療ドメイン知識による専門用語の自動修正
4. **要約生成** - Ollama Llama 3.1 8Bによる短/中/長の3種類の要約
5. **全文検索** - SQLite FTS5による原文+メタデータ検索
6. **話者分離** - pyannoteによる自動話者識別＋手動ラベル編集

---

## 🏗️ 技術スタック

### フロントエンド
- **Next.js 14** (App Router) - サーバーサイドレンダリング
- **React 18** - UI コンポーネント
- **TypeScript** - 型安全性
- **Tailwind CSS** + **shadcn/ui** - モダンなUIデザイン
- **Electron** - デスクトップGUIラッパー

### バックエンド
- **Next.js API Routes** - RESTful API
- **Prisma** - ORMとマイグレーション管理
- **SQLite** - ローカルデータベース（FTS5対応）
- **Redis** - ジョブキュー（BullMQ）+ Pub/Sub
- **MinIO** - S3互換オブジェクトストレージ

### AI/処理系
- **Python 3.11+** - ワーカープロセス
- **WhisperX** - 高速文字起こし + 話者分離統合（GPU/CUDA必須）
  - Whisper large-v2/v3 による高精度文字起こし
  - 単語レベルタイムスタンプ（音素アライメント）
  - pyannote.audio による話者分離（ビルトイン）
- **Ollama Llama 3.1 8B** - ローカルLLMによる要約生成

### 開発ツール
- **Docker Compose** - Redis/MinIO のコンテナ管理
- **Makefile** - タスクランナー
- **tmuxp** - 開発環境セットアップ

---

## 📁 プロジェクト構成

```
WhisperPlaud/
├── docs/                          # ドキュメント
│   ├── BRD.md                     # ビジネス要件定義
│   ├── SRS.md                     # 詳細仕様書
│   ├── TESTPLAN.md                # テスト計画
│   ├── C4.md                      # アーキテクチャ図
│   ├── ADR.md                     # アーキテクチャ決定記録
│   ├── STEERING_RULES.md          # 開発規約
│   └── HANDOFF.md                 # 引き継ぎメモ
├── medical-transcription/         # メインアプリケーション
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (auth)/login/     # ログインページ
│   │   │   ├── dashboard/         # ダッシュボード
│   │   │   └── api/               # API Routes
│   │   ├── components/            # Reactコンポーネント
│   │   │   ├── features/          # 機能コンポーネント
│   │   │   └── layout/            # レイアウトコンポーネント
│   │   ├── lib/                   # ユーティリティ
│   │   │   ├── auth.ts            # 認証ロジック
│   │   │   ├── db.ts              # Prisma クライアント
│   │   │   ├── s3.ts              # MinIO/S3 クライアント
│   │   │   ├── queue.ts           # BullMQ キュー
│   │   │   └── job-progress.ts   # Redis Pub/Sub リスナー
│   │   └── workers/               # Python ワーカー
│   │       └── transcription_worker.py
│   ├── prisma/                    # データベース
│   │   ├── schema.prisma          # DBスキーマ
│   │   └── migrations/            # マイグレーション履歴
│   ├── electron/                  # Electronメインプロセス
│   │   └── main.js
│   ├── scripts/                   # ユーティリティスクリプト
│   ├── .env.example               # 環境変数テンプレート
│   └── package.json               # 依存関係
├── docker-compose.yml             # Docker設定
├── Makefile                       # タスク定義
└── .gitignore
```

---

## ✅ 完了している機能

### 1. 認証機能 ✅
- **固定ユーザー認証** (admin / test123)
- JWT Cookie ベース
- bcrypt パスワードハッシュ
- **重要**: `.env`/`.env.local` で bcrypt ハッシュの `$` を `\$` にエスケープ必須

### 2. ファイルアップロード機能 ✅
- ドラッグ&ドロップUI（shadcn/ui準拠）
- XHR progress events によるリアルタイム進捗表示
- MinIO S3 プリサインドURL アップロード
- サーバーサイド直接アップロードのフォールバック
- アップロード後の自動ファイルリスト更新

### 3. ファイル管理UI ✅
- テーブル形式のファイルリスト
- ステータス表示（完了/処理中/待機中/エラー）
- ファイルサイズ、相対日時表示
- クリック可能なファイル名（青色リンク）
- 削除ボタン（ゴミ箱アイコン）

### 4. ジョブ処理システム ✅
- Redis Pub/Sub による worker 通知
- Python worker での mock 文字起こし処理
- 医療用語自動補正（医療辞書ベース）
- リアルタイム進捗更新（2秒ポーリング + Redis pub/sub）
- ジョブステータス管理（pending → processing → completed/failed）

### 5. データベース ✅
- Prisma ORM による型安全なクエリ
- SQLite（FTS5対応）
- cascade delete による関連レコード自動削除
- upsert による重複レコード対応

### 6. 右パネル詳細表示 ✅
- ファイル選択時に文字起こし結果表示
- 処理ステータス、進捗表示
- トランスクリプトテキスト表示
- URL パラメータ対応（`?fileId=xxx`）

### 7. Electronデスクトップアプリ ✅
- Next.js と Electron の統合
- 開発モード/本番モード切り替え
- DevTools 自動起動（開発時）

---

## 🚧 未完了の機能（優先順）

### 1. WhisperX統合（実装済みコードのテスト） 🔴 最優先
**現状**: WhisperXコード実装済み、テスト待ち
**必要な作業**:
- GPU環境のセットアップ（CUDA 11.8+、6GB+ VRAM）
- FFmpegインストール（`winget install ffmpeg`）
- Hugging Face Token取得（https://huggingface.co/settings/tokens）
- 依存関係インストール（`pip install -r requirements-worker.txt`）
- 実際の音声ファイルでテスト実行

**システム要件**:
- NVIDIA GPU（CUDA必須）
- 6GB+ VRAM推奨
- FFmpeg（システムレベル）
- HF_TOKEN環境変数

**参考ファイル**:
- `medical-transcription/src/workers/transcription_worker.py` ✅ WhisperX実装済み
- `medical-transcription/requirements-worker.txt` ✅ 更新済み

---

### 2. 話者ラベル編集UI 🟡 高優先度
**現状**: 話者分離はWhisperXで統合済み（pyannote）
**必要な作業**:
- 話者ラベル編集UI（DetailPanel内）
  - 自動割り当てされた"SPEAKER_00"を"医師"などに変更
  - 話者ごとの発話時間表示
  - 話者ごとの発言一覧表示
- 編集結果の保存（Transcript更新）

**参考**:
- `docs/SRS.md` → REQ-011
- WhisperXは話者分離済み、UIのみ実装が必要

---

### 3. 要約生成（Ollama） 🟡 高優先度
**必要な作業**:
- Ollama Llama 3.1 8B のセットアップ
- 短/中/長の3種類の要約生成
- Markdown形式での出力
- 事実ベース要約（幻覚抑制）

**参考**:
- `docs/SRS.md` → REQ-012

---

### 4. 全文検索機能 🟢 中優先度
**必要な作業**:
- SQLite FTS5 テーブルの作成
- 原文 + メタデータのインデックス化
- 検索UI（検索バー、フィルター）
- 新着順/関連度順ソート

**参考**:
- `docs/SRS.md` → REQ-013

---

### 5. PLAUD共有リンク対応 🔵 低優先度
**必要な作業**:
- PLAUDノートページの自動取得
- ログイン認証フロー
- 共有リンク貼り付けUI

---

### 6. UIの微調整 🔵 低優先度
**必要な作業**:
- 気になる箇所を Figma で調整
- 影/余白/配色/アイコン整列
- ダークモード対応

---

## 🔑 重要な設定・環境変数

### 環境変数（`.env.local`）
```bash
# 認証（重要: $ を \$ にエスケープ）
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
JWT_SECRET=dev-secret-key-change-in-production

# データベース
DATABASE_URL=file:./prisma/dev.db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO (S3互換)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=medical-transcription
S3_REGION=us-east-1
```

### 認証情報（テスト用）
- **ユーザー名**: `admin`
- **パスワード**: `test123`
- **ログインURL**: `http://localhost:3000/login`

---

## 🐛 既知の問題と解決済みバグ

### ✅ 解決済み
1. **bcrypt ハッシュの `$` 文字問題** → `.env` で `$` を `\$` にエスケープ
2. **重複ファイル再アップロード時の90%フリーズ** → `prisma.transcript.upsert()` で解決
3. **SSE 無限リロード** → `controller.enqueue` の呼び出しタイミング修正
4. **ファイルリスト自動更新されない** → カスタムブラウザイベント実装
5. **削除ボタンがローディング状態で止まる** → cascade delete 追加

### ⚠️ 既知の問題
- なし（現時点）

---

## 🚀 開発環境のセットアップ

### 推奨: Docker セットアップ（簡単・確実）⭐

**利点**:
- ✅ CUDA/FFmpegの手動インストール不要
- ✅ Python環境の手動セットアップ不要
- ✅ 1コマンドで全サービス起動
- ✅ 環境の完全な再現性

#### 1. 前提条件
- **Docker Desktop** for Windows
- **NVIDIA GPU** + 最新ドライバー
- **Node.js 20+**（Next.js開発サーバー用）

#### 2. セットアップ手順
```powershell
# プロジェクトのクローン
git clone https://github.com/77N4oto/WhisperPlaud.git
cd WhisperPlaud

# 環境変数の設定
cp medical-transcription/.env.example medical-transcription/.env.local
# .env.local を編集（HF_TOKEN を追加）

# Dockerイメージのビルド
make docker-build

# すべてのサービスを起動
make docker-up

# ログ確認
make docker-logs
```

#### 3. ブラウザで確認
- **Web**: `http://localhost:3000/login`
- **MinIO Console**: `http://localhost:9001`

#### 詳細は `DOCKER_SETUP.md` を参照

---

### 従来方式: 手動セットアップ（上級者向け）

<details>
<summary>クリックして展開</summary>

#### 1. 前提条件
- **Node.js 20+**
- **Python 3.11+**
- **NVIDIA GPU** + **CUDA 11.8+**
- **FFmpeg**
- **Docker Desktop**（Redis/MinIO用）
- **Windows 10/11**

#### 2. 初回セットアップ
```powershell
# プロジェクトのクローン
git clone https://github.com/77N4oto/WhisperPlaud.git
cd WhisperPlaud

# Node.js 依存関係のインストール
cd medical-transcription
npm install

# Prisma のセットアップ
npx prisma generate
npx prisma migrate dev

# Python 環境のセットアップ
cd ..
python -m venv whisper-pyannote-env
.\whisper-pyannote-env\Scripts\Activate.ps1
pip install -r medical-transcription/requirements-worker.txt

# Docker コンテナの起動（Redis/MinIOのみ）
docker compose up -d redis minio

# 環境変数の設定
cp medical-transcription/.env.example medical-transcription/.env.local
# .env.local を編集
```

#### 3. 開発サーバーの起動
```powershell
# Terminal 1: Next.js 開発サーバー
cd medical-transcription
npm run dev

# Terminal 2: Python ワーカー
.\whisper-pyannote-env\Scripts\Activate.ps1
python medical-transcription/src/workers/transcription_worker.py
```

詳細は `medical-transcription/SETUP_WHISPERX.md` を参照

</details>

---

## 📚 ドキュメント一覧

| ドキュメント | 内容 | 用途 |
|-------------|------|------|
| `docs/BRD.md` | ビジネス要件定義 | プロジェクトの目的・ゴール |
| `docs/SRS.md` | 詳細仕様書 | 機能要件・非機能要件 |
| `docs/TESTPLAN.md` | テスト計画 | テストケース・受入基準 |
| `docs/C4.md` | アーキテクチャ図 | システム構成図（C4モデル） |
| `docs/ADR.md` | アーキテクチャ決定記録 | 技術選定の理由 |
| `docs/STEERING_RULES.md` | 開発規約 | コーディング規約・ワークフロー |
| `docs/HANDOFF.md` | 引き継ぎメモ | 現在の状況・次のステップ |

---

## 🎯 次のエージェントへの推奨タスク

### 最優先タスク（1つ選択）
1. **実際のWhisper統合**
   - `faster-whisper` または `WhisperX` の実装
   - GPU対応の確認
   - 実際の音声ファイル文字起こし

2. **話者分離（pyannote）**
   - pyannote.audio の統合
   - 話者ラベル編集UI

3. **要約生成（Ollama）**
   - Ollama Llama 3.1 8B のセットアップ
   - 短/中/長の3種類の要約生成

### 推奨アプローチ
1. まず `docs/SRS.md` を読んで機能要件を理解する
2. `docs/HANDOFF.md` で現在の状況を確認する
3. 上記の「未完了の機能」から1つ選択して実装開始
4. 実装完了後、`docs/HANDOFF.md` を更新して次のエージェントへ引き継ぐ

---

## 💬 コミュニケーション・引き継ぎのポイント

### やってきたこと（過去セッション）
1. 要件定義・仕様書の再定義（デスクトップGUI対応）
2. Electron統合（Next.js + Electron）
3. 認証機能の実装（固定ユーザー、JWT Cookie）
4. bcrypt環境変数問題の解決（`$` エスケープ）
5. ファイルアップロード機能の完全実装
6. Python worker 連携（Redis Pub/Sub）
7. リアルタイム進捗更新（ポーリング + Pub/Sub）
8. ファイル管理UI（削除、自動更新、クリック選択）
9. 右パネル詳細表示（トランスクリプト、ステータス）
10. GitHubリポジトリ作成とプッシュ完了

### これからやること（次のセッション）
- 上記「未完了の機能」参照
- まずは Whisper 統合が最優先

### 全体像
- **ゴール**: 医療分野向けの音声文字起こし・要約システム
- **現状**: ファイルアップロード〜モック文字起こしまで完了
- **次**: 実際のWhisper統合 → 話者分離 → 要約生成 → 検索機能

---

## 🔗 参考リンク

- **GitHubリポジトリ**: https://github.com/77N4oto/WhisperPlaud
- **Next.js 公式**: https://nextjs.org/docs
- **Prisma 公式**: https://www.prisma.io/docs
- **faster-whisper**: https://github.com/SYSTRAN/faster-whisper
- **pyannote.audio**: https://github.com/pyannote/pyannote-audio
- **Ollama**: https://ollama.com/
- **shadcn/ui**: https://ui.shadcn.com/

---

## 📝 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-10-10 | AI Agent (Claude Sonnet 4.5) | 初回作成：MVP完了、GitHubリポジトリ作成完了 |

---

**このドキュメントは、次のエージェントがスムーズに開発を継続できるように作成されました。質問がある場合は、上記のドキュメントを参照するか、コードベースを直接確認してください。Good luck! 🚀**

