# HANDOFF: 引き継ぎ票（単一ソース）

## ゴール
- 認証＋アップロード（S3プリサイン）までの MVP を起動し、Job 登録まで確認
- UIは Cursor 直実装のプロトタイプを起点に、必要部位のみ Figma で調整

## 再現手順（初回）
1) `make bootstrap` で Next プロジェクト生成と依存導入
2) `medical-transcription/.env.local` を作成（`.env.example` 参照）
3) `docker compose up -d redis minio`
4) `make dev` で起動、Cursorでレイアウト/コンポーネントを生成（スクショ駆動）
5) 気になる箇所のみ Figma で調整 → 差分を Tailwind/shadcn に反映
6) ログイン→アップロードを手動検証

## 完了項目
- ✅ Electron実装完了（依存追加、main.js作成、ビルド設定）
- ✅ ログインページ404修正（`/(auth)/login` → `/login`）
- ✅ Electron isDev エラー修正
- ✅ 環境変数問題解決（bcryptハッシュの`$`を`\$`にエスケープ）
- ✅ 認証成功確認（admin / test123）
- ✅ Docker起動済み（Redis/MinIO稼働中）
- ✅ ダッシュボード表示確認
- ✅ ファイルアップロード機能実装完了
  - ドラッグ&ドロップUI（shadcn/ui準拠）
  - リアルタイム進捗表示（プログレスバー、XHR progress events）
  - ファイルリスト表示（ステータス、サイズ、相対日時）
  - ジョブ進捗のリアルタイム更新（2秒ごとにポーリング）
  - MinIO接続確認＋バケット自動作成
- ✅ BullMQワーカー連携実装完了
  - BullMQキュー定義（`src/lib/queue.ts`）
  - アップロード完了時のジョブ投入（モック処理を置き換え）
  - Pythonワーカー基本構造（`src/workers/transcription_worker.py`）
  - ジョブ進捗更新（Python → Redis pub/sub → Next.js）
  - モック文字起こし処理（医療用語辞書補正付き）
- ✅ **実際のWhisper統合完了**（2025-10-10）
  - faster-whisper統合（`src/workers/whisper_processor.py`）
  - GPU/CPU自動フォールバック機能
  - タイムスタンプ付きセグメント処理
  - ワード単位のタイムスタンプ対応
  - 医療用語自動補正との統合
  - モデルサイズ選択機能（環境変数: `WHISPER_MODEL_SIZE`）
  - リアルタイム進捗更新（セグメント単位）

## 認証情報（テスト用）
- ユーザー名: `admin`
- パスワード: `test123`
- ログインURL: http://localhost:3000/login
- **重要**: `.env`/`.env.local`のbcryptハッシュは`$`を`\$`にエスケープ必須

## Whisper統合情報
- **実装ファイル**: `src/workers/whisper_processor.py`, `src/workers/transcription_worker.py`
- **モデル設定**: `.env.local` の `WHISPER_MODEL_SIZE` で指定（推奨: `large-v3`）
- **GPU対応**: 自動検出＋CPUフォールバック機能付き
- **セットアップガイド**: `WHISPER_SETUP.md` 参照
- **テストコマンド**: `python src/workers/whisper_processor.py <audio_file>`

## 次の手（優先順）
1) ~~UI骨格（AppShell/ファイルリスト/詳細/モーダル/ドラッグ&ドロップ）をCursorで実装~~ ✅ 完了
2) ~~アップロード体験：通常アップロード実装＋リンク貼付フォールバック（誘導UI）~~ ✅ 完了
3) ~~BullMQワーカー連携の実装~~ ✅ 完了
4) ~~Pythonワーカーの起動とテスト~~ ✅ 完了
5) ~~実際のWhisper統合~~ ✅ 完了
   - ~~faster-whisperのセットアップ~~ ✅
   - ~~GPU対応の確認（CUDA/ROCm）~~ ✅
   - ~~実際の音声ファイル文字起こし~~ ✅
6) **実際の音声ファイルでの動作検証**（次の優先タスク）
   - 依存パッケージのインストール確認
   - GPU/CPU環境での動作確認
   - 実際の音声ファイル（MP3/WAV/M4A）でのテスト
   - **セットアップ手順**: `medical-transcription/WHISPER_SETUP.md` 参照
7) **文字起こし詳細ページの実装/改善**
   - トランスクリプト表示UI（タイムスタンプ付き）
   - セグメント単位の表示
   - 医療用語補正の可視化
8) **話者分離（pyannote）の実装**（REQ-011）
   - pyannote.audio統合
   - 話者ラベル自動割り当て
   - 話者ラベル編集UI
9) **要約生成機能の実装**（REQ-012）
   - Ollama連携
   - 短/中/長の3種類の要約生成
   - Markdown出力
10) **検索機能の実装**（REQ-013）
    - SQLite FTS5による全文検索
    - 原文＋メタデータ検索
    - 新着順/関連度順ソート
11) 見た目が気になる箇所をFigmaで微調整（影/余白/配色/アイコン整列）

