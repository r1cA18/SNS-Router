# Implementation Plan

- [ ] 1. プロジェクト基盤とデータモデルの実装
  - TypeScript型定義とインターフェースを作成
  - RegisteredURL、MessageItem、Summary、DirectMessage型を定義
  - ConversationMessage、WeeklyDigest、DigestStats、WeeklyDigestReport型を定義
  - _Requirements: 1.1, 1.2, 2.1, 9.1_

- [ ] 2. Storage Managerの実装
  - [ ] 2.1 Raycast LocalStorage APIを使用したStorage Managerを実装
    - URL管理機能（保存・読み込み）
    - Message Item管理機能（保存・読み込み・削除）
    - 要約管理機能（保存・読み込み・削除）
    - Weekly Digest管理機能（保存・読み込み・削除）
    - 統計情報取得機能
    - _Requirements: 1.2, 1.3, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 12.3, 12.4_

- [ ] 3. URL Managerの実装
  - [ ] 3.1 プリセットURL初期化機能を実装
    - X、Instagram、Discord、SlackのプリセットURLを定義
    - 初回起動時にプリセットURLを自動登録
    - _Requirements: 1.1_
  
  - [ ] 3.2 URL管理機能を実装
    - URL一覧取得（全て・有効のみ）
    - カスタムURL追加（スクレイピングオプション含む）
    - URL更新（有効/無効切り替え、設定変更）
    - カスタムURL削除（プリセットは削除不可）
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Content Scraperの実装
  - [ ] 4.1 Chrome Dev Tools MCP接続機能を実装
    - MCP接続確認
    - エラーハンドリング
    - _Requirements: 3.2, 3.5_
  
  - [ ] 4.2 基本的なスクレイピング機能を実装
    - 単一URLからの情報取得
    - 複数URLからの並列取得
    - Message Item抽出ロジック
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ] 4.3 スクロール機能を実装
    - ページを指定回数スクロール
    - スクロール間隔の制御（ボット規制回避）
    - 動的に読み込まれるコンテンツの収集
    - _Requirements: 3.2, 4.1_
  
  - [ ] 4.4 ページ遷移機能を実装
    - リンクを辿ってページ遷移
    - 最大ページ数の制限
    - 重複排除ロジック
    - _Requirements: 3.2, 5.2_
  
  - [ ] 4.5 スクレイピング結果の保存機能を実装
    - Storage Managerとの連携
    - 重複チェック
    - エラーハンドリング
    - _Requirements: 2.1, 3.4_

- [ ] 5. AI Summarizerの実装
  - [ ] 5.1 Raycast AI APIとの連携を実装
    - AI APIの初期化
    - プロンプト生成ロジック
    - _Requirements: 2.2, 2.3_
  
  - [ ] 5.2 全体要約生成機能を実装
    - Message Itemを統合して要約
    - URL別セクション分け
    - キーワード抽出
    - _Requirements: 2.2, 2.3, 4.2, 4.3, 4.4_
  
  - [ ] 5.3 プロンプトベース要約生成機能を実装
    - ユーザープロンプトに基づく要約
    - 関連Message Itemの抽出
    - 回答形式での要約生成
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 5.4 要約の保存・管理機能を実装
    - 要約の保存（名前付き）
    - 保存済み要約の一覧取得
    - 要約の削除
    - _Requirements: 2.5_

- [ ] 6. DM Handlerの実装（プライオリティ低）
  - [ ] 6.1 Beeper MCP接続機能を実装
    - MCP接続確認
    - エラーハンドリング
    - _Requirements: 6.1_
  
  - [ ] 6.2 DM管理機能を実装
    - 未読DM取得
    - DM返信
    - 既読マーク
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 7. URL管理コマンドの実装
  - [ ] 7.1 URL一覧表示UIを実装
    - List Viewでプリセット・カスタムURL表示
    - 各URLの状態表示（有効/無効、最終取得日時、アイテム数）
    - _Requirements: 1.2_
  
  - [ ] 7.2 URL追加フォームを実装
    - Form ViewでURL、名前、説明入力
    - スクレイピングオプション設定
    - バリデーション
    - _Requirements: 1.3_
  
  - [ ] 7.3 URLアクションを実装
    - 有効/無効切り替え
    - カスタムURL削除（確認ダイアログ）
    - 今すぐ更新
    - 設定編集
    - _Requirements: 1.4, 1.5, 3.2, 3.3_

- [ ] 8. 全体要約コマンドの実装
  - [ ] 8.1 コマンドエントリーポイントを実装
    - all-summarize.tsxファイル作成
    - 基本的なコマンド構造
    - _Requirements: 4.1_
  
  - [ ] 8.2 スクレイピング実行機能を実装
    - 有効な全URLから情報取得
    - 進捗表示（Toast/Progress Indicator）
    - エラーハンドリング
    - _Requirements: 4.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 8.3 要約表示UIを実装
    - List ViewでURL別セクション表示
    - Detail Viewで詳細と元Message Itemリンク
    - キーワードハイライト
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 2.5_
  
  - [ ] 8.4 アクションを実装
    - ブラウザで開く
    - コピー
    - 要約を保存
    - _Requirements: 7.2, 7.3, 7.5_

- [ ] 9. 特定ジャンルキャッチアップコマンドの実装
  - [ ] 9.1 コマンドエントリーポイントを実装
    - topic-catchup.tsxファイル作成
    - プロンプト入力UI
    - _Requirements: 5.1_
  
  - [ ] 9.2 プロンプト解析とスクレイピング実行を実装
    - プロンプトから対象URL特定
    - スクレイピングオプション調整
    - 進捗表示
    - _Requirements: 5.2, 5.3_
  
  - [ ] 9.3 プロンプトベース要約表示UIを実装
    - Detail ViewでAI回答表示
    - 関連Message Item表示
    - _Requirements: 5.3, 5.4, 5.5, 2.5_
  
  - [ ] 9.4 アクションを実装
    - ブラウザで開く
    - コピー
    - _Requirements: 7.2, 7.3, 7.5_

- [ ] 10. DM統合管理コマンドの実装（プライオリティ低）
  - [ ] 10.1 コマンドエントリーポイントを実装
    - dm-manager.tsxファイル作成
    - 基本的なコマンド構造
    - _Requirements: 6.1_
  
  - [ ] 10.2 DM一覧表示UIを実装
    - List ViewでDM一覧表示
    - プラットフォーム名、送信者、プレビュー、未読バッジ
    - 時系列順ソート
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [ ] 10.3 DM詳細・返信UIを実装
    - Detail Viewで会話履歴表示
    - 返信入力フォーム
    - _Requirements: 6.4_
  
  - [ ] 10.4 DMアクションを実装
    - 返信送信
    - 既読マーク
    - _Requirements: 6.4_

- [ ] 11. データ管理機能の実装
  - [ ] 11.1 統計情報表示を実装
    - Message Item総数表示
    - プラットフォーム別アイテム数表示
    - 最古・最新アイテム日時表示
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [ ] 11.2 データ削除機能を実装
    - 全データクリア（確認ダイアログ）
    - 特定期間のデータ削除
    - _Requirements: 8.3, 8.5_

- [ ] 12. エラーハンドリングとユーザーフィードバックの実装
  - [ ] 12.1 MCP接続エラーハンドリングを実装
    - Chrome Dev Tools MCP未接続時の処理
    - Beeper MCP未接続時の処理
    - エラーメッセージとガイダンス表示
    - _Requirements: 3.5, 6.1_
  
  - [ ] 12.2 スクレイピングエラーハンドリングを実装
    - タイムアウト処理
    - リトライ機能
    - 部分的な失敗への対応
    - _Requirements: 3.5_
  
  - [ ] 12.3 AI要約エラーハンドリングを実装
    - AI API失敗時の処理
    - リトライ機能
    - _Requirements: 2.2_

- [ ] 13. package.jsonの更新
  - コマンド定義を追加（all-summarize、topic-catchup、dm-manager、manage-urls、weekly-digest）
  - 必要な依存関係を追加
  - _Requirements: 全体_

- [ ] 14. Digest Analyzerの実装
  - [ ] 14.1 Beeper API連携機能を実装
    - Beeper APIクライアントの作成
    - 指定期間の会話履歴取得
    - ConversationMessage型への変換
    - _Requirements: 9.1_
  
  - [ ] 14.2 会話分析機能を実装
    - 週ごとの分類（先週 vs 先々週）
    - 統計情報の計算（総数、相手別、チャンネル別）
    - 日別メッセージ分布の集計
    - 最も忙しかった日の特定
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [ ]* 14.3 時間帯分析機能を実装
    - 平日夜間メッセージ数の集計（18時以降）
    - 週末メッセージ数の集計（土日）
    - _Requirements: 11.2, 11.3_
  
  - [ ]* 14.4 比較分析機能を実装
    - 先週と先々週の比較
    - 増減率の計算
    - _Requirements: 11.1, 11.4_
  
  - [ ]* 14.5 返信待ち検出機能を実装
    - 3日以上経過したメッセージの検出
    - 未返信の会話の特定
    - _Requirements: 10.4_

- [ ] 15. Report Generatorの実装
  - [ ] 15.1 Raycast AI連携機能を実装
    - 会話履歴をAIに渡すプロンプト生成
    - レポート生成リクエスト
    - _Requirements: 9.5, 10.1_
  
  - [ ] 15.2 レポート生成機能を実装
    - プロジェクト/トピック抽出
    - ハイライト抽出（ポジティブなフィードバック）
    - 課題抽出（返信待ち、持ち越しタスク）
    - 比較分析の生成
    - ワークライフバランスインサイトの生成
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.5_
  
  - [ ] 15.3 Markdownフォーマット機能を実装
    - レポートをMarkdown形式に整形
    - 絵文字とセクション分けの追加
    - _Requirements: 10.5_
  
  - [ ]* 15.4 エクスポート機能を実装
    - Markdownファイルとして保存
    - ファイル名に期間を含める
    - _Requirements: 12.1, 12.2_

- [ ] 16. Weekly Digestコマンドの実装
  - [ ] 16.1 コマンドエントリーポイントを実装
    - weekly-digest.tsxファイル作成
    - 基本的なコマンド構造
    - _Requirements: 9.1_
  
  - [ ] 16.2 データ取得と分析実行機能を実装
    - Beeper APIで過去14日間の会話履歴を取得
    - Digest Analyzerで分析実行
    - 進捗表示（Toast/Progress Indicator）
    - エラーハンドリング
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 16.3 レポート生成と表示UIを実装
    - Report Generatorでレポート生成
    - Detail ViewでMarkdown表示
    - 期間、統計、ハイライト、課題などのセクション表示
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 16.4 アクションを実装
    - Markdownファイルとしてエクスポート
    - カスタム期間選択（Form表示）
    - 過去のレポート一覧表示
    - _Requirements: 12.1, 12.2, 12.4, 12.5_
  
  - [ ]* 16.5 レポート保存機能を実装
    - Storage Managerとの連携
    - 生成したレポートをローカルストレージに保存
    - _Requirements: 12.3_

- [ ] 17. 統合テストと最終調整
  - [ ] 17.1 各コマンドの動作確認
    - 全体要約コマンドのテスト
    - 特定ジャンルキャッチアップコマンドのテスト
    - URL管理コマンドのテスト
    - Weekly Digestコマンドのテスト
    - _Requirements: 全体_
  
  - [ ] 17.2 MCP統合テスト
    - Chrome Dev Tools MCPとの実際の連携テスト
    - スクロール・ページ遷移の動作確認
    - _Requirements: 3.2, 4.1, 5.2_
  
  - [ ]* 17.3 Beeper API統合テスト
    - 実際のBeeper APIとの連携テスト
    - 会話履歴取得の動作確認
    - レポート生成の精度確認
    - _Requirements: 9.1, 9.5_
  
  - [ ] 17.4 パフォーマンス最適化
    - 並列処理の確認
    - タイムアウト設定の調整
    - ストレージ上限の確認
    - _Requirements: 全体_
