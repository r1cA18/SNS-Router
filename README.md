# SNS Router

**Overview**  
SNS Router is a Raycast extension that unifies Beeper conversations and future social feeds into AI-ready workflows for personal intelligence gathering.  
SNS Routerは、Beeperの会話データや将来的なソーシャルフィードを統合し、個人向けインテリジェンス収集を支援するRaycast拡張機能です。

**Command Highlights**  
- `dm-manager` — Browse direct-message threads from the Beeper Desktop API, read context-rich details, reply in place, and ask Raycast AI for quick bullet summaries.  
  `dm-manager` — Beeper Desktop APIからDMスレッドを取得し、詳細表示・その場での返信・Raycast AIによる箇条書き要約が可能です。  
- `unread-summaries` — Scan up to five unread chats, stream transcripts into Raycast AI, and return structured JSON summaries with highlights, next actions, and message snippets.  
  `unread-summaries` — 最大5件の未読チャネルを対象にトランスクリプトをRaycast AIへ渡し、ハイライト・次のアクション・抜粋を含むJSON要約を生成します。  
- `weekly-digest` — Pull 14 days of Beeper history, compute engagement statistics, and ask Raycast AI to craft a Markdown weekly report with metadata panels and clipboard exports.  
  `weekly-digest` — 過去14日間のBeeper履歴を取得し、統計情報を算出した上でRaycast AIにMarkdown週次レポートの生成を依頼し、メタデータ表示とコピー機能を提供します。  
- `all-summarize` — Currently a placeholder Detail view; Chrome Dev Tools scraping and multi-source synthesis from the spec are not yet wired up.  
  `all-summarize` — いまはDetail表示のみのプレースホルダーで、仕様にあるChrome Dev Toolsスクレイピングや複数ソース統合は未実装です。

**Architecture Snapshot**  
Implemented modules focus on Beeper integrations: a typed `BeeperApiClient`, digest utilities, and Raycast UI flows. Chrome Dev Tools MCP scraping, URL management, and broader MCP orchestration from the spec remain on the roadmap.  
実装済みモジュールはBeeper連携に特化しており、型付きの`BeeperApiClient`、ダイジェスト用ユーティリティ、Raycast UIフローを備えます。一方、仕様に記載されたChrome Dev Tools MCPスクレイピング、URL管理、MCP連携の拡張は今後の課題です。

---

## Getting Started

**Prerequisites**  
- Node.js 20 LTS or newer, npm 10+, and the Raycast CLI (`ray`).  
  Node.js 20 LTS以上、npm 10以上、およびRaycast CLI（`ray`）が必要です。  
- Raycast Pro (or Raycast AI access) for AI summarization features.  
  AI要約機能にはRaycast Pro（またはRaycast AIアクセス権）が必要です。  
- Beeper Desktop running with the Remote API enabled (`http://localhost:23373`).  
  Beeper Desktopを起動し、Remote API（`http://localhost:23373`）を有効化してください。

**Installation**  
1. `npm install` — Install Raycast extension dependencies.  
   `npm install` — Raycast拡張の依存関係をインストールします。  
2. `npm run dev` — Launch `ray develop` for live preview and manual QA.  
   `npm run dev` — `ray develop` を起動し、ライブプレビューと手動QAを行います。  
3. Open the command palette (`⌘ + ␣` by default) and search for SNS Router commands.  
   コマンドパレット（既定では`⌘ + ␣`）でSNS Routerの各コマンドを検索します。

**Beeper API Token**  
- Add the “Beeper API Token” preference under each command if your Remote API requires authentication.  
  Remote APIに認証が必要な場合は、各コマンドの「Beeper API Token」設定にトークンを入力してください。  
- Validate connectivity with `npx tsx test-beeper-api.ts <token?>` to diagnose endpoint or token issues.  
  接続確認には `npx tsx test-beeper-api.ts <token?>` を実行し、エンドポイントやトークンの問題を診断できます。

---

## Command Details

**DM Manager (`dm-manager`)**  
Explore recent one-to-one chats, lazy-load older history, reply inline, and generate AI bullet-point recaps that copy straight to the clipboard. Metadata panels show participant info, unread markers, and attachment badges.  
最近の1対1チャットを閲覧し、必要に応じて過去ログを追加読み込みしながら、その場で返信できます。AI要約は箇条書きでクリップボードへ直接コピーされ、メタデータでは参加者情報や未読状態、添付ファイルの種別を確認できます。

**Unread Summaries (`unread-summaries`)**  
Automatically fetch up to 40 latest messages per unread chat, build AI prompts, parse strict JSON responses, and render sectioned detail views with highlights, next actions, and snippets. Clipboard shortcuts let you extract either the summary or full diagnostic text.  
未読チャネルごとに最大40件の最新メッセージを取得し、AI向けプロンプトを生成して厳密なJSONレスポンスを解析します。ハイライト・次のアクション・抜粋を含むセクション表示を行い、クリップボードショートカットで要約または診断全文をコピーできます。

**Weekly Digest (`weekly-digest`)**  
Pull conversations for the past two weeks, compute weekly vs. prior-week comparisons, detect evening/weekend activity, and pass the dataset into Raycast AI for Markdown reporting. Metadata callouts cover period, totals, deltas, top contacts/channels, and follow-up counts.  
直近2週間の会話を取得し、先週と先々週の比較、平日夜間・週末のアクティビティ、フォローアップ候補を抽出したうえで、Raycast AIにMarkdownレポート生成を依頼します。メタデータには期間・総数・差分・上位コンタクト/チャネル・フォローアップ件数が表示されます。

**All Summarize (`all-summarize`)**  
Currently a static Detail view used as a scaffold. The planned Chrome Dev Tools MCP scraping, preset URL bootstrap, and multi-source aggregation from the specification have not been implemented yet.  
現状はDetail表示のみの土台であり、仕様にあるChrome Dev Tools MCPによるスクレイピング、プリセットURLの初期登録、複数ソースの集約は未実装です。

---

## Development Notes

**Scripts**  
- `npm run dev` — Start Raycast develop session for interactive testing.  
  `npm run dev` — Raycastの開発セッションを開始し、対話的にテストします。  
- `npm run lint` — Apply Raycast ESLint rules; run before commits.  
  `npm run lint` — Raycast ESLintルールを適用し、コミット前に実行してください。  
- `npm run build` — Generate the production bundle and type-check the project.  
  `npm run build` — 本番バンドルを生成し、型チェックを実行します。  
- `npm run fix-lint` — Safe autofix for lint violations; re-run lint afterward.  
  `npm run fix-lint` — lint違反を自動修正し、その後に再度`npm run lint`を実行してください。  
- `npm run publish` — Use only after QA to submit to the Raycast Store via `@raycast/api`.  
  `npm run publish` — QA完了後にのみ使用し、`@raycast/api`経由でRaycast Storeへ送信します。

**AI Usage**  
- All AI features rely on Raycast AI’s `AI.ask` API with low-creativity settings to keep outputs concise and actionable.  
  AI機能はすべてRaycast AIの`AI.ask` APIを利用し、低クリエイティビティ設定で簡潔かつ実用的な出力を維持しています。  
- Summaries are generated client-side; no additional servers are used beyond Beeper Desktop and Raycast.  
  要約はクライアント側で生成され、Beeper DesktopとRaycast以外のサーバーは使用しません。

---

## Spec Alignment & Roadmap

**Delivered (Spec References)**  
- Beeper API client with typed responses, error handling, and list/search endpoints (Requirements 9.x, 10.x scaffolding).  
  型付きレスポンス・エラーハンドリング・一覧/検索エンドポイントを備えたBeeper APIクライアントを実装済みです（要件9〜10系の基盤）。  
- Weekly digest statistics, comparison logic, and AI report generation (Tasks 14.1–15.3).  
  週次ダイジェストの統計・比較ロジックとAIレポート生成を実装済みです（タスク14.1〜15.3）。  
- DM management UI with inline replies and AI transcription summaries (Tasks 6.2, 8.1 baseline).  
  DM管理UIでのインライン返信とAI要約を提供済みです（タスク6.2、8.1の基礎）。  
- Unread channel summarization flow parsing structured AI output (Task 5.3 adjacent).  
  未読チャネルの要約フローで構造化AI出力を解析する仕組みを実装済みです（タスク5.3相当）。

**In Progress**  
- `all-summarize` scaffolding awaiting Chrome Dev Tools MCP integration and storage-backed URL management.  
  Chrome Dev Tools MCP連携とストレージ対応のURL管理を待つ`all-summarize`の土台。  
- Follow-up detection is present, but highlighting and lowlight narratives in weekly reports remain stubbed.  
  フォローアップ検出は動作しますが、週次レポート内のハイライト/ローライト記述は未実装です。  
- MCP connectivity guards exist for Beeper, while Chrome Dev Tools MCP checks are yet to be added.  
  Beeper向けMCP接続確認は実装済みですが、Chrome Dev Tools MCPのチェックは未着手です。

**Planned / Not Started**  
- URL manager command with preset seeding, enable/disable toggles, and manual scrape actions (Tasks 3, 7).  
  プリセット登録・有効/無効切り替え・手動スクレイピングを備えたURL管理コマンド（タスク3、7）は未着手です。  
- Content scraper capable of scrolling, multi-page traversal, and deduplication against Raycast LocalStorage (Tasks 4.x).  
  スクロール・複数ページ遷移・Raycast LocalStorage重複排除を行うコンテンツスクレイパー（タスク4.x）は未実装です。  
- Topic-based catch-up command, DM follow-up automation, and markdown export of weekly digests (Tasks 5.3+, 6.x, 12.x, 16.4).  
  トピック別キャッチアップ、DMフォローアップ自動化、週次ダイジェストのMarkdownエクスポート（タスク5.3以降、6系、12系、16.4）はこれからの予定です。

---

## Troubleshooting

- “Failed to load chats” errors typically indicate an invalid or missing Beeper token; rerun the connection test script and re-enter the token.  
  「チャット取得に失敗しました」が表示される場合は、Beeperトークンの未設定または無効である可能性が高いので、接続テストスクリプトを再実行し、トークンを再入力してください。  
- If AI summaries fail, confirm Raycast Pro status and retry; the app surfaces toast notifications with diagnostic messages.  
  AI要約が失敗する場合はRaycast Proの契約状況を確認し、再試行してください。アプリ内のトーストに診断メッセージが表示されます。  
- Weekly digest assumes local time; adjust system timezone if the reporting window looks shifted.  
  週次ダイジェストはローカルタイムゾーンで集計するため、レポート期間がずれて見える場合はシステムのタイムゾーンを確認してください。

---

## License

This project is distributed under the MIT License as declared in `package.json`.  
本プロジェクトは`package.json`に記載のとおりMITライセンスで配布されています。
