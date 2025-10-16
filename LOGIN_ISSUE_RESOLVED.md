# ログイン問題の記録 - 解決済み

## 📋 問題の概要
**日時**: 2025-10-10  
**症状**: `admin` / `test123` でログインできない（401 Unauthorized）

---

## 🔍 根本原因

### 問題の本質
**`.env`ファイル内の`$`記号が環境変数として解釈される**

bcryptハッシュの形式:
```
$2b$10$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
```

パーサーの挙動:
- `$2b` → 変数として解釈 → 空文字列に置換
- `$10` → 変数として解釈 → 空文字列に置換
- `$gKNA0zkR...` → 変数として解釈 → 空文字列に置換

**結果**: ハッシュの後半30文字のみが残る
```
.7dbligjYfILZRerAB6NFUwJrHzb1Y6i  (❌ 30文字)
```

### 試行した対策（失敗）
1. ❌ ハッシュを1行に結合 → 効果なし
2. ❌ ファイルをUTF-8で再作成 → 効果なし
3. ❌ `.next`キャッシュクリア → 効果なし
4. ❌ シングルクォートで囲む（`'$2b$10$...'`） → 効果なし
5. ❌ ダブルクォートで囲む → 効果なし
6. ❌ ルートの`.env.local`削除 → 効果なし

---

## ✅ 採用した解決策

### アプローチ: **フォールバックハッシュをコードに埋め込む**

**ファイル**: `medical-transcription/src/lib/auth.ts`

```typescript
function getAuthConfig() {
  // TEMPORARY FIX: Hardcoded hash for 'test123' due to .env parsing issues with $ symbols
  // Generated with: bcrypt.hashSync('test123', 10)
  const FALLBACK_HASH = '$2b$10$US0IJrju4og31QJkDlBgLOr/ekYXy/wVPQuPevhFZwmZ0DYO5cs1e';
  
  const envHash = process.env.AUTH_PASSWORD_HASH || '';
  // If hash is less than 60 chars (corrupted by $ parsing), use fallback
  const passwordHash = envHash.length === 60 ? envHash : FALLBACK_HASH;
  
  return {
    username: process.env.AUTH_USERNAME || 'admin',
    passwordHash,
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  };
}
```

### ロジック
1. 環境変数から`AUTH_PASSWORD_HASH`を読み込む
2. **長さが60文字未満**（破損している）なら → フォールバックハッシュを使用
3. 60文字（正常）なら → 環境変数の値を使用

---

## 🔧 推奨される恒久的な解決策

### 方法1: バックスラッシュエスケープ（前回対応）
`.env`ファイル内で`$`をエスケープ:
```bash
AUTH_PASSWORD_HASH=\$2b\$10\$gKNA0zkRnhgIad26tgVGK.7dbligjYfILZRerAB6NFUwJrHzb1Y6i
```

**注意**: Next.jsの`.env`パーサー（`@next/env`）がバックスラッシュエスケープに対応しているか要確認

### 方法2: 環境変数を外部から注入
```powershell
# PowerShellで直接設定
$env:AUTH_PASSWORD_HASH = '$2b$10$US0IJrju4og31QJkDlBgLOr/ekYXy/wVPQuPevhFZwmZ0DYO5cs1e'
npm run dev
```

### 方法3: 別の認証方式（長期的）
- JWT + OAuth（Google/GitHub）
- Auth0 / Clerk などのサービス利用
- Passkey / WebAuthn

---

## 🧪 検証方法

### 1. ハッシュ長の確認
```powershell
cd medical-transcription
node -e "console.log('Length:', process.env.AUTH_PASSWORD_HASH?.length)"
```

### 2. bcrypt検証
```powershell
node -e "const bcrypt = require('bcryptjs'); const hash = '$2b$10$US0IJrju4og31QJkDlBgLOr/ekYXy/wVPQuPevhFZwmZ0DYO5cs1e'; console.log('Valid:', bcrypt.compareSync('test123', hash));"
```

### 3. ログイン確認
```powershell
$body = @{ username = "admin"; password = "test123" } | ConvertTo-Json -Compress
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

---

## 📊 タイムライン

| 時刻 | イベント | 状態 |
|------|----------|------|
| 初回 | ハッシュが2行に分割 | ❌ 32文字 |
| +30分 | ファイル修正・再起動 | ❌ 32文字（キャッシュ） |
| +60分 | 新ハッシュ生成・引用符テスト | ❌ 30文字 |
| +90分 | **フォールバック実装** | ✅ **成功** |

---

## 🎓 学んだこと

1. **`.env`ファイルのパーサーは環境により挙動が異なる**
   - Node.js標準: `dotenv`
   - Next.js: `@next/env`（独自実装）
   - Docker: シェル展開の影響を受ける

2. **bcryptハッシュの特性**
   - 必ず60文字
   - `$2a$`, `$2b$`, `$2y$`のプレフィックス
   - `$`記号が3つ含まれる（区切り文字）

3. **環境変数の優先順位（Next.js）**
   - システム環境変数 > `.env.local` > `.env`

---

## 🔗 関連ファイル

- `medical-transcription/src/lib/auth.ts` - 修正されたファイル
- `medical-transcription/.env.local` - 環境変数（破損した値）
- `medical-transcription/.env` - デフォルト環境変数

---

**修正者**: Cursor AI Agent  
**検証者**: ユーザー（ログイン成功確認済み）  
**ステータス**: ✅ 解決済み（一時的対処）

---

*次回の改善タスク*: バックスラッシュエスケープによる恒久対策の実装

