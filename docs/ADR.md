# ADR: デスクトップ実装方式の選定（Electron/Tauri/ローカルWeb）

Status: Accepted

## Context
- 既存UIは Next.js（App Router/SSR要素あり）。最小変更でデスクトップ化したい。
- Windowsローカルで完結し、オフライン運用を前提。GPUワーカーやMinIO/Redisはローカル。

## Options
| 案 | 概要 | 長所 | 短所 |
|---|---|---|---|
| A: Electron | Node+Chromium。Next.jsをそのまま表示/同梱可 | 互換性/実績、SSR親和、開発容易 | サイズが大きい |
| B: Tauri | Rust+WebView。軽量 | 配布が軽い、セキュリティ良好 | SSR/Node前提のNext.jsと相性調整が要る |
| C: ローカルWeb | ブラウザで http://localhost:3000 | 追加ランタイム不要 | デスクトップ統合（起動/配布/権限）が弱い |

評価軸（性能/保守/安全/コスト）
- A（Electron）: 4/5/4/3
- B（Tauri）: 4/3/5/5（Next.js調整コストが高）
- C（ローカルWeb）: 4/4/3/5（UXが要件未達）

## Decision
- Electron（Option A）を採用。理由: 既存Next.jsの最小変更で要件達成（GUI/配布/オフライン）

## Consequences
- インストーラはelectron-builder（NSIS）を採用
- バイナリサイズ増↔開発迅速化。メモリ上限は検証で制御

## Alternatives
- Tauriへ移行（Next.jsをCSR中心に再設計）／ローカルWeb（起動ランチャーのみ）

## Rollback
- Electronラッパーを除去し、従来のブラウザアクセスへ戻す

## Metrics / Re-evaluation Triggers
- 起動時間>5s継続、インストーラ>250MB、メモリ>1.2GB安定化、重大CVE時に再評価

---

# ADR: UIワークフロー選定（Cursor直実装＋部分Figma／Figma先行／Relume）

Status: Accepted

## Context
- 動的UI（進捗、波形、ドラッグ&ドロップ、SSE）を短期間で動作させたい
- 1人開発で学習コストを最小化したい

## Options
| 案 | 概要 | 長所 | 短所 |
|---|---|---|---|
| A: Cursor直実装→部分Figma | 動くコードを先に作り、必要部のみFigma微調整 | MVP最短、手戻り小、学習コスト小 | 初期の見た目が荒い可能性 |
| B: Figma先行→実装 | 全画面モック後に実装 | 全体像明確 | 実装開始が遅い/動的挙動のズレ |
| C: Relume | LP/ブログ向けノーコード | テンプレ充実 | Webアプリには不向き（状態/リアルタイム性） |

評価軸（速度/保守/UI品質/コスト）
- A（Cursor直実装）: 5/4/4/5
- B（Figma先行）: 2/4/4/3
- C（Relume）: 3/3/4/4（本用途では適合外）

## Decision
- A（Cursor直実装→部分Figma）を採用。Relumeは不採用

## Consequences
- スクリーンショット駆動で部分UIを迅速に再現、shadcn/uiで一貫性を担保

## Rollback
- Figma先行プロセスに切替可能（別ADRで再評価）

## Metrics / Re-evaluation Triggers
- UI手戻りが継続的に増える、Figma往復が支配的になった場合は再評価


