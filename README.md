# ponkotsu-md-editor

[![Gem Version](https://badge.fury.io/rb/ponkotsu-md-editor.svg)](https://badge.fury.io/rb/ponkotsu-md-editor)

https://github.com/user-attachments/assets/70ff077d-200b-4746-b057-4860a12d4dbb

PonkotsuMdEditorは、Railsアプリケーション向けのシンプルなMarkdownエディタGemです。

PonkotsuMdEditor is a simple Markdown editor gem for Rails applications.


Markdownテキストベースの編集エリア、プレビュー、ツールバーなどを備え、簡単に組み込むことができます。

It provides a markdown text-based editing area, preview, toolbar, and can be easily integrated into your app.

## 特徴/Features
- シンプルなUIで直感的にMarkdown編集
  - Simple UI for intuitive Markdown editing
- プレビュー機能付き
  - Includes preview feature
- JavaScript/CSSアセット同梱
  - Bundled with JavaScript/CSS assets
- Railsビューに簡単組み込み
  - Easy integration into Rails views
- textareaタグを使用していないので、Chromium系ブラウザにおける多量のテキスト入力でのパフォーマンス問題を回避（参照：https://issues.chromium.org/issues/341564372）
  - Does not use textarea tag, so avoids performance issues with large text input on Chromium browsers (see: https://issues.chromium.org/issues/341564372)

## インストール/Installation

Gemfileに以下を追加してください。

Add the following to your Gemfile:

```ruby
gem 'ponkotsu-md-editor'
```

その後、以下を実行します。

Then run:

```bash
bundle install
```

## アセットについて/About Assets

本GemはRailsエンジンとしてアセット（JavaScript/CSS）を提供します。

This gem provides assets (JavaScript/CSS) as a Rails engine.

**CSSを使用するには、以下の設定が必要です：**

**To use the CSS, the following configuration is required:**

`app/assets/stylesheets/application.css` または `app/assets/stylesheets/application.scss` に以下を追加してください：

Add the following to `app/assets/stylesheets/application.css` or `app/assets/stylesheets/application.scss`:

**application.css の場合 / For application.css:**
```css
/*
 *= require markdown_editor
 */
```

**application.scss の場合 / For application.scss:**
```scss
@use 'markdown_editor';
```

**JavaScriptは自動的に読み込まれるため、特別な設定は不要です。**

**JavaScript is automatically loaded, so no special configuration is required.**

## 使い方/Usage

### ビューへの組み込み例（ERB）/Example of embedding in a view (ERB)

```erb
<%= form_with model: @article, local: true, multipart: true, class: "article-form" do |form| %>

    <%= markdown_editor(form, :content, @article.content, options: {
        lang: :ja,
        preview: true,
        tools: %w[bold italic strikethrough heading1 heading2 heading3 heading4 heading5 heading6 unordered_list ordered_list check_list blockquote link image code code_block table horizontal_rule]
      }) %>

<% end %>
```

### コントローラでのパラメータ受け取り/Receiving parameters in controller

hiddenフィールドにMarkdownテキストが格納されます。あとは良しなに。

The markdown text is stored in a hidden field. Handle as needed.

```ruby
params[:model][:content] # => Markdown text
```

## 開発・テスト/Development & Testing

このgemは主にRailsのview要素（ヘルパー、パーシャル、JS/CSSアセット）を提供するため、RSpec等の通常のテストではUIや動作の自動テストは困難です。

This gem mainly provides Rails view elements (helpers, partials, JS/CSS assets), so UI and behavior cannot be automatically tested with standard RSpec, etc.


- UIやエディタの動作確認には、手動テストを推奨します。
  - For UI/editor behavior, manual testing is recommended.

## コントリビュート/Contributing

バグ報告・プルリクエストは歓迎します。

Bug reports and pull requests are welcome.


GitHub repository: https://github.com/dhq-boiler/ponkotsu-md-editor

## ライセンス/License

このGemは[MITライセンス](https://opensource.org/licenses/MIT)のもとで公開されています。

This gem is released under the [MIT License](https://opensource.org/licenses/MIT)
