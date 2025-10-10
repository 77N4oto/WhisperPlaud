# TESTPLAN: 受け入れテスト（TC-ID⇄REQ-ID）デスクトップGUI版

- TC-001 ⇄ REQ-001: 認証
  手順: `/login`で正しい/誤った資格情報を送信
  期待: 正常→ダッシュボード遷移、不正→エラー
  検証: `make test`（E2E/後日）／手動

- TC-002 ⇄ REQ-002: プリサインドURL発行
  手順: `/api/files/upload`(POST)でメタ情報→URL取得→PUTでS3アップロード→PATCH通知
  期待: DB `status=uploaded`、Job 登録
  検証: `make dev` 起動下でAPI手動／後日自動化

- TC-003 ⇄ REQ-003: 文字起こしジョブ処理
  手順: ワーカー起動→Job 処理→結果 S3/DB 保存
  期待: Transcript レコード作成、segments/words/speakers/corrections 含む
  検証: 後日 `make test` に統合

- TC-004 ⇄ REQ-004: 要約生成
  手順: Transcript 完了→要約 API 実行
  期待: summaryShort/Medium/Long が埋まる
  検証: 後日 `make test`

- TC-005 ⇄ REQ-005: 医療辞書補正
  手順: 誤認識テキストに辞書を適用
  期待: 補正後のテキストで誤りが減る
  検証: 後日 `make test`

- TC-002b ⇄ REQ-002b: PLAUDリンク取込フォールバック
  手順: ログイン必須の共有リンクを貼付
  期待: 手動ダウンロード誘導→通常アップロードへ自動フォールバック
  検証: 手動

- TC-006 ⇄ REQ-010: SSE進捗配信
  手順: ジョブ投入→SSEエンドポイントを購読
  期待: status/progress/phase が逐次届く
  検証: 手動（後日自動化）

- TC-007 ⇄ REQ-011: 話者ラベル編集
  手順: 自動分離後、UIで話者名を編集・保存
  期待: 再表示・再検索時も編集後ラベルで保持
  検証: 手動

- TC-008 ⇄ REQ-012: 要約Markdown/文体
  手順: 要約生成を実行
  期待: Markdown出力、事実ベース、敬語なし、短/中/長の3種
  検証: 手動（後日LintでMarkdown構造検証）

- TC-009 ⇄ REQ-013: FTS検索（原文＋メタデータ）
  手順: キーワード＋話者/期間で検索
  期待: 原文/メタデータを対象に新着順（既定）/関連度順で適切にヒット
  検証: 手動（後日E2E）

- TC-010 ⇄ REQ-000: GUI起動/操作
  手順: Windowsでアプリを起動→ログイン→アップロード→進捗確認
  期待: GUIから全操作が可能でエラーなく完了
  検証: 手動（後日自動化/E2E）

- TC-011 ⇄ REQ-014: インストーラ導入
  手順: NSISインストーラで導入→初回起動ガイドに従いMinIO/Redisを起動
  期待: 起動成功、設定が永続化
  検証: 手動

## 静的/セキュリティ検証
- Lint/Format/Type: `npm run lint && npm run format && npm run typecheck`
- SAST: `semgrep --config auto`（High 0件、Medium 0件で合格）
- OpenAPIがある場合: `spectral lint openapi.yaml`
- 目標カバレッジ: line≥70%/branch≥60%、Mutation Testing（後日Stryker/PIT導入）

