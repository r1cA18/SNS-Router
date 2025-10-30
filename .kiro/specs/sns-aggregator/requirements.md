# Requirements Document

## Introduction

SNS Routerは、主要SNS（X、Instagram、Discord、Slack）とユーザーが追加したWebサイトURLからChrome Dev Tools MCPを使用して情報を取得し、Raycast上でAIに要約・整理してもらう拡張機能です。3つの主要コマンド（全体要約、特定ジャンルのキャッチアップ、DM統合管理）を提供し、用途に応じて使い分けられます。個人実験用として、ブラウザでログイン済みのセッションを利用することで、パーソナライズされた情報を取得します。

## Glossary

- **SNS Router**: Chrome Dev Tools MCPとBeeper MCPを使用してWeb情報を取得・要約するRaycast拡張機能
- **Chrome Dev Tools MCP**: ブラウザのDevToolsプロトコルを使用してWebページの情報を取得するMCPサーバー
- **Beeper MCP**: メッセージングプラットフォームのDMを統合管理するMCPサーバー
- **Content Scraper**: Chrome Dev Tools MCPを使用してWebページから情報を抽出するコンポーネント
- **AI Summarizer**: 取得した情報を要約し、重要なポイントを抽出するAI機能
- **Preset URL**: システムが提供する主要SNS（X、Instagram、Discord、Slack）のURL
- **Custom URL**: ユーザーが追加した監視対象のWebサイトURL
- **Message Item**: SNS投稿、記事、通知などの個別の情報単位
- **Summary View**: AIが生成した要約を表示するビュー

## Requirements

### Requirement 1

**User Story:** ユーザーとして、主要SNSとカスタムWebサイトのURLを管理したい。そうすることで、必要な情報源だけを監視できる。

#### Acceptance Criteria

1. THE SNS Router SHALL 初期状態で主要SNS（X、Instagram、Discord、Slack）のプリセットURLを提供する
2. THE SNS Router SHALL プリセットURLと追加URLを含む全登録URLのリストを表示する
3. WHEN ユーザーが新しいURLを追加する, THEN THE SNS Router SHALL URL、名前、説明を入力するフォームを表示する
4. THE SNS Router SHALL 各登録URLに対して有効/無効を切り替えるトグルを提供する
5. THE SNS Router SHALL プリセットURLは削除不可とし、追加URLのみ削除可能とする

### Requirement 2

**User Story:** ユーザーとして、取得した情報をAIに要約してもらいたい。そうすることで、大量の情報を効率的に把握できる。

#### Acceptance Criteria

1. WHEN Content Scraperが情報を取得完了する, THEN THE AI Summarizer SHALL 自動的にその情報を分析する
2. THE AI Summarizer SHALL 取得した全Message Itemの要約を生成する
3. THE AI Summarizer SHALL 重要なトピックやキーワードを抽出する
4. THE AI Summarizer SHALL 各登録URLごとの要約を生成する
5. THE Summary View SHALL 要約とともに元のMessage Itemへのリンクを表示する

### Requirement 3

**User Story:** ユーザーとして、登録したURLから情報を取得したい。そうすることで、最新の情報を要約してもらえる。

#### Acceptance Criteria

1. THE SNS Router SHALL 有効になっている登録URLのリストを表示する
2. WHEN ユーザーが特定のURLを選択して更新を実行する, THEN THE Content Scraper SHALL Chrome Dev Tools MCPを使用してそのURLから情報を取得する
3. WHEN ユーザーが「全て更新」を実行する, THEN THE Content Scraper SHALL 有効な全登録URLから情報を取得する
4. THE SNS Router SHALL 各URLの最終更新時刻と取得件数を表示する
5. IF 情報取得中にエラーが発生する, THEN THE SNS Router SHALL エラー内容とリトライオプションを表示する

### Requirement 4

**User Story:** ユーザーとして、全体要約コマンドで登録URLの情報を一括で把握したい。そうすることで、プロンプト入力なしで全体像を確認できる。

#### Acceptance Criteria

1. WHEN ユーザーが全体要約コマンドを実行する, THEN THE Content Scraper SHALL 有効な全登録URLから情報を取得する
2. THE AI Summarizer SHALL 取得した全情報を統合して要約を生成する
3. THE AI Summarizer SHALL 各URLごとのセクションに分けて要約を表示する
4. THE Summary View SHALL 重要なトピックやキーワードをハイライト表示する
5. THE Summary View SHALL 各要約に元のMessage Itemへのリンクを含める

### Requirement 5

**User Story:** ユーザーとして、特定ジャンルのキャッチアップコマンドで柔軟に情報を検索したい。そうすることで、プロンプトに応じてパーソナライズされた情報を取得できる。

#### Acceptance Criteria

1. WHEN ユーザーが特定ジャンルキャッチアップコマンドを実行する, THEN THE SNS Router SHALL プロンプト入力フィールドを表示する
2. WHEN ユーザーがプロンプトを入力する（例：「XでAI系の最新ニュースをいくつか教えて」）, THEN THE Content Scraper SHALL 指定されたURLから情報を取得する
3. THE AI Summarizer SHALL プロンプトの内容に基づいて関連情報を抽出・要約する
4. THE AI Summarizer SHALL ログイン済みセッションによりパーソナライズされた情報を活用する
5. THE Summary View SHALL プロンプトに対する回答形式で要約を表示する

### Requirement 6

**User Story:** ユーザーとして、DM統合管理コマンドでメッセージを一元管理したい。そうすることで、複数プラットフォームのDMを効率的に処理できる。

#### Acceptance Criteria

1. WHEN ユーザーがDM統合管理コマンドを実行する, THEN THE SNS Router SHALL Beeper MCPへの接続を確認する
2. WHEN Beeper MCPが利用可能である, THEN THE SNS Router SHALL 全プラットフォームからの未読DMを取得する
3. THE SNS Router SHALL DMを最終メッセージの時刻順に表示する
4. WHEN ユーザーがDMに返信する, THEN THE Beeper MCP SHALL そのプラットフォームのAPIを使用して返信を送信する
5. THE SNS Router SHALL 各DMにプラットフォーム名と未読バッジを表示する

### Requirement 7

**User Story:** ユーザーとして、要約結果から元の投稿にアクセスしたい。そうすることで、詳細を確認したり直接操作できる。

#### Acceptance Criteria

1. WHEN AI Summarizerが要約を表示する, THEN THE Summary View SHALL 関連するMessage Itemのリストを表示する
2. THE SNS Router SHALL 各Message Itemに「ブラウザで開く」アクションを提供する
3. WHEN ユーザーが「ブラウザで開く」を選択する, THEN THE SNS Router SHALL そのMessage ItemのURLをデフォルトブラウザで開く
4. THE SNS Router SHALL Message Itemのプレビュー（投稿者、時刻、本文の一部）を表示する
5. WHEN ユーザーがMessage Itemをコピーする, THEN THE SNS Router SHALL その内容をクリップボードにコピーする

### Requirement 8

**User Story:** ユーザーとして、取得したデータの管理機能を使いたい。そうすることで、不要なデータを削除したり、データの状態を確認できる。

#### Acceptance Criteria

1. THE SNS Router SHALL 取得済みのMessage Item総数を表示する
2. THE SNS Router SHALL プラットフォームごとのMessage Item数を表示する
3. WHEN ユーザーがデータクリアを実行する, THEN THE SNS Router SHALL 確認ダイアログを表示した後に全データを削除する
4. THE SNS Router SHALL 最も古いMessage Itemと最も新しいMessage Itemの日時を表示する
5. WHEN ユーザーが特定期間のデータ削除を実行する, THEN THE SNS Router SHALL 指定期間のMessage Itemを削除する
