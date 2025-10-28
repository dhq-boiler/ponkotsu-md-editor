# frozen_string_literal: true

require "./spec/spec_helper"
require "capybara/rspec"
require "selenium-webdriver"

RSpec.describe "Markdown Editor Bold Function", type: :feature, js: true do
  before(:all) do
    Capybara.register_driver :selenium_chrome_headless do |_app|
      options = Selenium::WebDriver::Chrome::Options.new
      options.add_argument("--headless")
      options.add_argument("--no-sandbox")
      options.add_argument("--disable-dev-shm-usage")
      options.add_argument("--disable-gpu")
      options.add_argument("--window-size=1280,720")

      Selenium::WebDriver.for(:chrome, options: options)
    end

    Capybara.default_driver = :selenium_chrome_headless
    Capybara.javascript_driver = :selenium_chrome_headless
  end

  before(:each) do
    visit "/test_editor.html"
    wait_for_javascript_to_load
  end

  describe "Bold insertion functionality" do
    context "when selecting text in the middle of a word" do
      it "applies bold formatting to the selected portion" do
        # テキストを設定
        editor_text = "これはテストです。"

        # "はテス" を選択（位置2-6）
        select_text_range(2, 6)

        # Bold適用
        click_bold_button

        # 結果を確認
        expect(editor_text).to eq("これ**はテス**トです。")
      end
    end

    context "when selecting text across multiple lines" do
      it "applies bold formatting across line breaks" do
        editor_text = "一行目です。\n二行目です。"

        # 改行をまたぐ選択
        select_text_range(3, 8)

        click_bold_button

        expect(editor_text).to eq("一行**目です。\n二**行目です。")
      end
    end

    context "when no text is selected (cursor position)" do
      it "inserts bold markers at cursor position" do
        editor_text = "テスト文章"

        # カーソルを位置3に設定
        select_text_range(3, 3)

        click_bold_button

        expect(editor_text).to eq("テス****ト文章")
      end
    end

    context "when selecting text in the last line of multiline content" do
      it "applies bold formatting correctly" do
        editor_text = "一行目\n二行目\n三行目です"

        # 最後の行の "三行" を選択
        select_text_range(11, 13)

        click_bold_button

        expect(editor_text).to eq("一行目\n二行目\n**三行**目です")
      end
    end

    context "when working with Japanese characters" do
      it "calculates positions correctly for multibyte characters" do
        editor_text = "あいうえお\nかきくけこ\nさしすせそ"

        # "きく" を選択
        select_text_range(7, 10)

        click_bold_button

        expect(editor_text).to eq("あいうえお\nか**きく**けこ\nさしすせそ")
      end
    end

    context "when applying bold multiple times" do
      it "allows multiple bold sections in the same text" do
        editor_text = "これは最初のテストで、これは二番目のテストです。"

        # 最初の "テスト" を選択
        select_text_range(4, 7)
        click_bold_button

        # 二番目の "テスト" を選択
        select_text_range(18, 21)
        click_bold_button

        expect(editor_text).to eq("これは**最初**のテストで、これは**二番**目のテストです。")
      end
    end

    context "edge cases" do
      it "handles selection at the very beginning of text" do
        editor_text = "テスト文章です"

        # 最初の文字を選択
        select_text_range(0, 1)

        click_bold_button

        expect(editor_text).to eq("**テ**スト文章です")
      end

      it "handles selection at the very end of text" do
        editor_text = "テスト文章です"

        # 最後の文字を選択
        select_text_range(6, 7)

        click_bold_button

        expect(editor_text).to eq("テスト文章で**す**")
      end

      it "handles empty text editor" do
        editor_text = ""

        # 空のエディタでBoldを適用
        click_bold_button

        expect(editor_text).to eq("****")
      end
    end
  end

  describe "Selection range accuracy" do
    it "maintains correct cursor position after bold insertion" do
      # 中央にカーソルを設定
      select_text_range(2, 2)

      click_bold_button

      # カーソル位置が正しいかチェック（Bold開始タグの後）
      expect(selection_info[:start]).to eq(4) # "テス**" の後
    end

    it "correctly handles selection after text modification" do
      editor_text = "元のテキスト"

      # 一部をBoldに
      select_text_range(2, 5)
      click_bold_button

      # その後の選択が正しく動作するかテスト
      select_text_range(0, 2)
      click_bold_button

      expect(editor_text).to eq("**元の****テキ**スト")
    end
  end

  private

  def wait_for_javascript_to_load
    # JavaScriptの読み込み完了を待つ
    expect(page).to have_css("#editor_content")
    sleep(1) # エディタの初期化を待つ
  end

  def editor_text=(text)
    page.execute_script("
      const editor = document.getElementById('editor_content');
      editor.innerText = '#{text.gsub("'", "\\'")}';
      editor.focus();
    ")
  end

  def editor_text
    page.evaluate_script("
      const editor = document.getElementById('editor_content');
      return editor.innerText || editor.textContent || '';
    ")
  end

  def select_text_range(start_pos, end_pos)
    page.execute_script("
      const editor = document.getElementById('editor_content');
      editor.focus();

      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let currentOffset = 0;
      let startNode = null, startOffset = 0;
      let endNode = null, endOffset = 0;

      let node;
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;

        if (startNode === null && currentOffset + nodeLength >= #{start_pos}) {
          startNode = node;
          startOffset = #{start_pos} - currentOffset;
        }

        if (endNode === null && currentOffset + nodeLength >= #{end_pos}) {
          endNode = node;
          endOffset = #{end_pos} - currentOffset;
          break;
        }

        currentOffset += nodeLength;
      }

      if (startNode && endNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    ")
  end

  def click_bold_button
    # Bold機能を実行
    page.execute_script("insertMarkdown('**', '**');")
  end

  def selection_info
    result = page.evaluate_script("
      if (typeof getContentEditableSelection === 'function') {
        const editor = document.getElementById('editor_content');
        return getContentEditableSelection(editor);
      } else {
        return { start: 0, end: 0, selectedText: '' };
      }
    ")

    {
      start: result["start"],
      end: result["end"],
      selectedText: result["selectedText"]
    }
  end
end
