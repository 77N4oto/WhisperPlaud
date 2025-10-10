# STEERING_RULES: 運用・安全ルール

- 直コミット禁止／PR必須。変更は常に diff/patch で提示し、承認後に適用。
- `.env*` は Git 管理から除外。機密はリポジトリへ含めない。
- 破壊的操作はドライラン原則。実行/テストは `make dev` / `make test` の抽象化コマンドを使用。
- ドキュメント（BRD/SRS/TESTPLAN/HANDOFF）を先行・同期更新。
- ロングランやノイジー出力は 600s タイムアウトと出力抑制を徹底。

## UIワークフロー規約
- 実装優先: Cursorで直接UIを作成し、動くプロトタイプを早期に確認する
- 部分調整: 見た目が気になる箇所のみFigmaで整形し、差分をコードに反映
- 非採用: Relumeはマーケ/LP向けのため本プロダクトでは使用しない
- UIコンポーネントは shadcn/ui を既定とし、Tailwindトークンで一貫性を担保

## 環境変数運用規約（bcryptハッシュ）
- `.env*` ファイルでbcryptハッシュを保存する際は、`$` を `\$` にエスケープする
  - 理由: dotenv/Next.jsの環境変数展開機能が`$`を変数として解釈し、ハッシュが破損する
  - 例: `AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i`
- ファイル保存はUTF-8 (BOM なし) を使用
- PowerShellで生成する場合はヒアストリング（`@'...'@`）を使用して変数展開を回避

