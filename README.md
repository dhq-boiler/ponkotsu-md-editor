# PonkotsuMdEditor

PonkotsuMdEditorは、Railsアプリケーション向けのシンプルなMarkdownエディタGemです。
Markdownテキストベースの編集エリア、プレビュー、ツールバーなどを備え、簡単に組み込むことができます。

## 特徴
- シンプルなUIで直感的にMarkdown編集
- プレビュー機能付き
- JavaScript/CSSアセット同梱
- Railsビューに簡単組み込み
- textareaタグを使用していないので、Chromium系ブラウザにおける多量のテキスト入力でのパフォーマンス問題を回避（参照：https://issues.chromium.org/issues/341564372）

## インストール

Gemfileに以下を追加してください。

```ruby
gem 'ponkotsu-md-editor'
```

その後、以下を実行します。

```bash
bundle install
```

## アセットについて

本GemはRailsエンジンとしてアセット（JavaScript/CSS）を自動でプリコンパイル・ロードします。
特別な設定や`application.js`/`application.css`へのrequire追加は不要です。

**本番環境やプリコンパイルが必要な環境では、以下のコマンドを実行してください。**

```bash
rails assets:precompile
```

## 使い方

### ビューへの組み込み例（ERB）

```erb
<%= form_with model: @article, local: true, multipart: true, class: "article-form" do |form| %>

    <%= markdown_editor(form, :content, @article.content, options: {
        lang: :ja,
        preview: true,
        tools: %w[bold italic strikethrough heading1 heading2 heading3 heading4 heading5 heading6 unordered_list ordered_list check_list blockquote link image code code_block table horizontal_rule]
      }) %>

<% end %>
```

### コントローラでのパラメータ受け取り

hiddenフィールドにMarkdownテキストが格納されます。あとは良しなに。

```ruby
params[:model][:content] # => Markdownテキスト
```

## 開発・テスト

このgemは主にRailsのview要素（ヘルパー、パーシャル、JS/CSSアセット）を提供するため、RSpec等の通常のテストではUIや動作の自動テストは困難です。

- UIやエディタの動作確認には、手動テストを推奨します。

## コントリビュート

バグ報告・プルリクエストは歓迎します。
GitHubリポジトリ: https://github.com/dhq-boiler/ponkotsu-md-editor

## ライセンス

このGemは[MITライセンス](https://opensource.org/licenses/MIT)のもとで公開されています。
