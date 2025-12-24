# E2E Testing Guide for Ponkotsu Markdown Editor

このドキュメントでは、ponkotsu-md-editorのEnd-to-End（E2E）テストの実行方法について説明します。

## 概要

E2Eテストは、実際のブラウザ環境でMarkdownエディタの機能を検証します。以下のブラウザでテストを実行できます：

- Google Chrome (Headless)
- Mozilla Firefox (Headless)

## 前提条件

### 必要なソフトウェア

1. **Ruby** (>= 3.4.7)
2. **Google Chrome** (最新版)
3. **Mozilla Firefox** (最新版)
4. **ChromeDriver** (webdrivers gemが自動的に管理)
5. **GeckoDriver** (webdrivers gemが自動的に管理)

### Gemのインストール

```bash
bundle install
```

必要なgemは以下の通りです：
- `rspec`: テストフレームワーク
- `capybara`: ブラウザ自動化ツール
- `selenium-webdriver`: WebDriverプロトコルの実装
- `webdrivers`: ブラウザドライバーの自動管理

## テストファイルの構成

```
spec/
├── spec_helper.rb              # RSpecとCapybaraの設定
├── support/
│   └── e2e_helpers.rb         # E2Eテスト用ヘルパーメソッド
└── features/
    ├── markdown_editor_e2e_spec.rb  # 包括的なE2Eテスト
    └── bold_functionality_spec.rb   # Bold機能の詳細テスト
```

## テストの実行方法

### すべてのテストを実行

```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb
```

### 特定のブラウザでのみ実行

**Chromeのみ:**
```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb -e "Testing with Chrome"
```

**Firefoxのみ:**
```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb -e "Testing with Firefox"
```

### 特定のテストカテゴリを実行

**基本操作のみ:**
```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb -e "Basic operations"
```

**装飾ボタンのみ:**
```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb -e "Formatting buttons"
```

**プレビュー機能のみ:**
```bash
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb -e "Preview functionality"
```

### ヘッドレスモードを無効にしてテストを実行

ブラウザの動作を視覚的に確認したい場合は、spec_helper.rbを編集してヘッドレスオプションを削除します：

```ruby
# spec/spec_helper.rbの該当箇所をコメントアウト
# options.add_argument("--headless")
```

## テスト項目

### 1. 基本操作テスト

- **テキスト挿入**
  - 英数字のテキスト挿入
  - 日本語テキストの挿入
  - 改行の保持
  - 複数の連続した改行の挿入

- **テキスト削除**
  - 選択範囲の削除
  - コンテンツ全体のクリア

- **カーソル位置**
  - テキスト挿入後のカーソル位置維持

### 2. 装飾ボタン機能テスト

各Markdown装飾機能が正しく動作することを確認：

- **Bold** (`**text**`)
- **Italic** (`*text*`)
- **Strikethrough** (`~~text~~`)
- **Code** (`` `code` `` or ` ```code block``` `)
- **Headings** (`# H1`, `## H2`, `### H3`, etc.)
- **Lists**
  - Unordered list (`- item`)
  - Ordered list (`1. item`)
  - Checkbox list (`- [ ] task`, `- [x] done`)
- **Blockquote** (`> quote`)
- **Link** (`[text](url)`)
- **Image** (`![alt](url)`)
- **Table** (マークダウンテーブル構文)
- **Horizontal Rule** (`---`)

### 3. 複数の装飾操作テスト

- 異なるテキスト範囲への複数の装飾適用
- ネストされた装飾の処理

### 4. プレビュー機能テスト

- プレビューの表示/非表示切り替え
- MarkdownからHTMLへの変換

### 5. エッジケースとエラーハンドリング

- 空のエディタでの操作
- 非常に長いテキストの処理
- 特殊文字の処理
- Unicode文字（絵文字、多言語）の処理

## テストのデバッグ

### ログの有効化

```ruby
# spec/spec_helper.rbに追加
RSpec.configure do |config|
  config.before(:each, type: :feature) do
    page.driver.browser.manage.logs.get(:browser).each do |log|
      puts log.message
    end
  end
end
```

### スクリーンショットの取得

テスト失敗時にスクリーンショットを保存：

```ruby
# テストケース内で
save_screenshot('debug_screenshot.png')
```

### ブラウザコンソールログの確認

```ruby
page.driver.browser.manage.logs.get(:browser).each do |log|
  puts "[#{log.level}] #{log.message}"
end
```

## トラブルシューティング

### ChromeDriverのバージョンエラー

```bash
# webdriversキャッシュをクリア
rm -rf ~/.webdrivers
bundle exec rspec spec/features/markdown_editor_e2e_spec.rb
```

### GeckoDriverのエラー

Firefoxが最新版であることを確認してください：

```bash
# macOS
brew upgrade firefox
```

### タイムアウトエラー

Capybaraのタイムアウト設定を増やす：

```ruby
# spec/spec_helper.rb
Capybara.configure do |config|
  config.default_max_wait_time = 20  # デフォルトは10秒
end
```

## CI/CD環境での実行

### GitHub Actions設定例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: 3.4.7
        bundler-cache: true

    - name: Install Chrome
      run: |
        wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
        sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
        sudo apt-get update
        sudo apt-get install -y google-chrome-stable

    - name: Install Firefox
      run: sudo apt-get install -y firefox

    - name: Run E2E tests
      run: bundle exec rspec spec/features/markdown_editor_e2e_spec.rb
```

## ベストプラクティス

1. **テストの独立性**: 各テストは独立して実行可能にする
2. **適切な待機時間**: `sleep`の代わりにCapybaraの待機メソッドを使用
3. **クリーンアップ**: 各テスト後にエディタの状態をリセット
4. **エラーメッセージ**: 失敗時に有用な情報を提供
5. **並列実行**: テストを並列実行して時間を短縮（`parallel_tests` gemを使用）

## 参考リンク

- [Capybara Documentation](https://github.com/teamcapybara/capybara)
- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [RSpec Documentation](https://rspec.info/)
- [WebDrivers Gem](https://github.com/titusfortner/webdrivers)