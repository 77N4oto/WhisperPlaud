# SRS: 仕様（REQ-ID付き）デスクトップGUI版

## 機能要求
- REQ-000 デスクトップGUI: Electron 上で Next.js UI を表示。GUIから全機能を操作可能。
- REQ-001 認証: 固定ユーザー(ENV)でログインし、JWT Cookie で保護されたダッシュボードにアクセスできること。
- REQ-002 ファイルアップロード: GUI→S3互換(MinIO, プリサインドURL)→完了通知(PATCH)でDB登録・キュー投入。
- REQ-003 文字起こし処理: BullMQ(job)→Pythonワーカー(faster-whisper/WhisperX/pyannote)で非同期処理し、結果をS3/DBへ保存。
- REQ-004 要約: Ollama(Llama 3.1 8B)で短/中/長の要約を生成し Transcript に保存。
- REQ-005 医療辞書: 医療用語・薬剤辞書のCRUDと補正ロジック。ユーザー辞書の優先適用。
- REQ-006 永続化: SQLite(Prisma)で File/Job/Transcript/MedicalDictionary/Medication/UserDictionary を管理。
- REQ-007 API: Next.js API Routes（App Router）で RESTful エンドポイントを提供。
- REQ-008 パフォーマンス: 60分音声で実時間×1～3倍目標（RTX 3060 12GB）。大容量アップロード上限 500MB 初期設定。
- REQ-009 セキュリティ: Cookie HTTPOnly/JWT 24h、.env 非コミット、プリサインドURL有効期限≤3600s。
- REQ-010 観測性: Job 進捗(0-100)とフェーズ、エラーをDBに保存。UIから確認可能。
- REQ-014 パッケージング: Windows用インストーラ（NSIS）で配布。初回セットアップでMinIO/Redisを自動起動できるガイドを提供。

## 非機能要求
- NFR-001 再現性: Make 抽象コマンドでブートストラップ/起動/テストが再現可能。
- NFR-002 可用性: 単一ノード前提。障害時は再実行可能な冪等性を重視。
- NFR-003 保守性: タイプセーフ(Typescript/Prisma)、設計/テスト/実装の同期。
- NFR-004 オフライン: GUI/アップロード/処理/閲覧は完全ローカルで動作（初回モデル取得を除く）。
- NFR-005 起動時間: GUI起動≤5秒（サービスが起動済み時）。
- NFR-006 配布サイズ: インストーラ≤200MB目標（モデル/データ除く）。
- NFR-007 セキュリティ: PII（個人識別情報）ログ残存禁止、最小権限、Secretsは環境変数。
- NFR-008 観測性: 主要イベントを構造化ログ出力。簡易メトリクス（処理時間/エラー率）を保存。
- NFR-009 UIワークフロー: Cursor直実装→部分Figma。Relumeは不採用。スクショ駆動の部分再現を許容。

## 受け入れ基準（要約）
- REQ-001/002: ログイン成功/失敗、S3 へアップロード→DBに`uploaded`、キューへ job 追加。
- REQ-003: ワーカー処理で Transcript 生成、話者/単語タイムスタンプ/補正が出力。
- REQ-004: 要約3種が生成され DB に保存。
- REQ-005: 辞書登録→補正結果に反映（誤認識数が減少）。
- REQ-000/014: GUI から全操作が可能、Windows インストーラで導入・起動できる。

## 補足仕様（UX確定事項）
- REQ-002b（PLAUDリンク取込・ログイン必須対応）:
  - PLAUD共有リンクはログイン必須のため、MVPは「リンク貼付→手動ダウンロード誘導→通常アップロード」に自動フォールバックする。
  - オプション機能として、設定に保存した認証情報を用いサーバ側ヘッドレスログイン（Playwright）で直接取得する実装を後続で提供（デフォルト無効、監査ログ記録）。
- REQ-010（進捗リアルタイム/SSE）:
  - ジョブ状態・進捗・フェーズをSSEで配信し、フロントで即時反映する。
- REQ-011（話者分離とラベル編集）:
  - 話者分離は自動（pyannote）。UIで手動リネーム（例: 医師/MSL/看護師）を許容し保存する。
- REQ-012（要約の文体/形式）:
  - 要約はMarkdownで事実ベース。敬語不要・中立・簡潔。短/中/長を生成。
- REQ-013（検索範囲・並び替え）:
  - 検索対象は原文テキストとメタデータ。既定は新着順、オプションで関連度順。SQLite FTS5を用いる。

## 技術スタック
- フロントエンド: Next.js(App Router) + Tailwind CSS + React Query（ローカルUI状態は必要に応じてZustand）
- UIコンポーネント: shadcn/ui
- デスクトップ: Electron（BrowserWindowでNext.jsを表示）
- バックエンド: Next.js API Routes（Node.js 20）
- ストレージ: SQLite（Prisma）, MinIO（S3互換）, Redis（BullMQ）
- AI/処理: Python ワーカー（faster-whisper/WhisperX/pyannote）, Ollama Llama 3.1 8B
- OS/配布: Windows 10/11, electron-builder（NSIS）

## UIワークフロー詳細
- Phase 1（Day 1-2）: Cursorで骨格を実装（AppShell/リスト/詳細/モーダル/ドラッグ&ドロップ）
- Phase 2（Day 3-4）: 気になる箇所のみFigmaで調整（影/余白/配色/アイコン整列）→差分反映
- Phase 3（Day 5-10）: 機能実装（MinIO/ワーカー/進捗SSE/検索/要約）

