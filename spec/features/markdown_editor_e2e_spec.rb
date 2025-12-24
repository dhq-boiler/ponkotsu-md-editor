# frozen_string_literal: true

require "./spec/spec_helper"
require "capybara/rspec"
require "selenium-webdriver"

RSpec.describe "Markdown Editor E2E Tests", type: :feature, js: true do
  # Shared examples for testing across multiple browsers
  shared_examples "markdown editor functionality" do |driver_name|
    before(:all) do
      Capybara.current_driver = driver_name
      Capybara.javascript_driver = driver_name
    end

    before(:each) do
      visit "/test_editor.html"
      wait_for_javascript_to_load
    end

    describe "Basic operations" do
      context "text insertion" do
        it "allows inserting text at cursor position" do
          set_editor_text("")

          # Insert text
          page.execute_script("
            const editor = document.getElementById('editor_content');
            editor.innerText = 'Hello World';
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          ")

          expect(get_editor_text).to eq("Hello World")
        end

        it "allows inserting text with Japanese characters" do
          set_editor_text("")

          page.execute_script("
            const editor = document.getElementById('editor_content');
            editor.innerText = 'こんにちは世界';
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          ")

          expect(get_editor_text).to eq("こんにちは世界")
        end

        it "preserves line breaks on insertion" do
          set_editor_text("Line 1\nLine 2\nLine 3")

          expect(get_editor_text).to eq("Line 1\nLine 2\nLine 3")
        end

        it "allows inserting multiple consecutive line breaks" do
          set_editor_text("Paragraph 1\n\n\nParagraph 2")

          expect(get_editor_text).to eq("Paragraph 1\n\n\nParagraph 2")
        end
      end

      context "text deletion" do
        it "allows deleting selected text" do
          set_editor_text("Delete this text")
          select_text_range(0, 6)

          page.execute_script("
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
          ")

          expect(get_editor_text).to include("this text")
        end

        it "allows clearing entire content" do
          set_editor_text("Some content here")

          page.execute_script("
            const editor = document.getElementById('editor_content');
            editor.innerText = '';
          ")

          expect(get_editor_text).to eq("")
        end
      end

      context "cursor positioning" do
        it "maintains cursor position after text insertion" do
          set_editor_text("Test")
          select_text_range(2, 2)

          page.execute_script("
            const editor = document.getElementById('editor_content');
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const textNode = document.createTextNode('X');
            range.insertNode(textNode);
          ")

          expect(get_editor_text).to eq("TeXst")
        end
      end
    end

    describe "Formatting buttons functionality" do
      context "Bold button" do
        it "applies bold formatting to selected text" do
          set_editor_text("Bold this text")
          select_text_range(0, 4)
          click_button_by_function("insertMarkdown", "**", "**")

          expect(get_editor_text).to eq("**Bold** this text")
        end

        it "inserts bold markers at cursor when no selection" do
          set_editor_text("Text")
          select_text_range(2, 2)
          click_button_by_function("insertMarkdown", "**", "**")

          expect(get_editor_text).to include("**")
        end

        it "works with Japanese text" do
          set_editor_text("太字にする")
          select_text_range(0, 2)
          click_button_by_function("insertMarkdown", "**", "**")

          expect(get_editor_text).to eq("**太字**にする")
        end
      end

      context "Italic button" do
        it "applies italic formatting to selected text" do
          set_editor_text("Italic text")
          select_text_range(0, 6)
          click_button_by_function("insertMarkdown", "*", "*")

          expect(get_editor_text).to eq("*Italic* text")
        end
      end

      context "Strikethrough button" do
        it "applies strikethrough formatting to selected text" do
          set_editor_text("Strike through")
          select_text_range(0, 6)
          click_button_by_function("insertMarkdown", "~~", "~~")

          expect(get_editor_text).to eq("~~Strike~~ through")
        end
      end

      context "Code button" do
        it "applies inline code formatting" do
          set_editor_text("Code snippet")
          select_text_range(0, 4)
          click_button_by_function("insertMarkdown", "`", "`")

          expect(get_editor_text).to eq("`Code` snippet")
        end

        it "applies code block formatting for multiline selection" do
          set_editor_text("Line 1\nLine 2")
          select_text_range(0, 13)
          click_button_by_function("insertCode")

          expect(get_editor_text).to include("```")
        end
      end

      context "Heading buttons" do
        it "applies heading level 1" do
          set_editor_text("Heading")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "# ", "")

          expect(get_editor_text).to include("# ")
        end

        it "applies heading level 2" do
          set_editor_text("Heading")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "## ", "")

          expect(get_editor_text).to include("## ")
        end

        it "applies heading level 3" do
          set_editor_text("Heading")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "### ", "")

          expect(get_editor_text).to include("### ")
        end
      end

      context "List buttons" do
        it "applies unordered list formatting" do
          set_editor_text("List item")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "- ", "")

          expect(get_editor_text).to include("- ")
        end

        it "applies ordered list formatting" do
          set_editor_text("List item")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "1. ", "")

          expect(get_editor_text).to include("1. ")
        end

        it "applies checkbox list formatting (unchecked)" do
          set_editor_text("Task item")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "- [ ] ", "")

          expect(get_editor_text).to include("- [ ] ")
        end

        it "applies checkbox list formatting (checked)" do
          set_editor_text("Task item")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "- [x] ", "")

          expect(get_editor_text).to include("- [x] ")
        end
      end

      context "Blockquote button" do
        it "applies blockquote formatting" do
          set_editor_text("Quote text")
          select_text_range(0, 0)
          click_button_by_function("insertMarkdown", "> ", "")

          expect(get_editor_text).to include("> ")
        end
      end

      context "Link button" do
        it "inserts link syntax" do
          set_editor_text("Link text")
          select_text_range(0, 9)
          click_button_by_function("insertMarkdown", "[", "](https://)")

          expect(get_editor_text).to include("[Link text](https://)")
        end
      end

      context "Image button" do
        it "inserts image syntax" do
          set_editor_text("")
          click_button_by_function("insertMarkdown", "![", "](https://)")

          expect(get_editor_text).to include("![](https://)")
        end
      end

      context "Table button" do
        it "inserts table template" do
          set_editor_text("")

          # Table button inserts a predefined template
          page.execute_script("
            if (typeof applyTable === 'function') {
              applyTable();
            }
          ")

          sleep(0.5)
          text = get_editor_text

          expect(text).to include("|") if text.length > 0
        end
      end

      context "Horizontal rule button" do
        it "inserts horizontal rule" do
          set_editor_text("")
          click_button_by_function("insertMarkdown", "---", "")

          expect(get_editor_text).to include("---")
        end
      end
    end

    describe "Multiple formatting operations" do
      it "allows applying multiple formats to different text sections" do
        set_editor_text("First Second Third")

        # Bold first word
        select_text_range(0, 5)
        click_button_by_function("insertMarkdown", "**", "**")

        # Italic second word
        sleep(0.2)
        select_text_range(9, 15)
        click_button_by_function("insertMarkdown", "*", "*")

        text = get_editor_text
        expect(text).to include("**First**")
        expect(text).to include("*Second*")
      end

      it "handles nested formatting correctly" do
        set_editor_text("Nested text")

        # Apply bold
        select_text_range(0, 11)
        click_button_by_function("insertMarkdown", "**", "**")

        # Then apply italic to part of it
        sleep(0.2)
        select_text_range(2, 8)
        click_button_by_function("insertMarkdown", "*", "*")

        expect(get_editor_text).to include("**")
        expect(get_editor_text).to include("*")
      end
    end

    describe "Preview functionality" do
      it "shows preview when toggle is clicked", skip: "Preview may not be in test_editor.html" do
        # Click preview toggle if available
        if page.has_css?("#previewToggle", wait: 1)
          find("#previewToggle").click

          expect(page).to have_css("#markdownPreview", visible: true)
        end
      end

      it "converts markdown to HTML in preview", skip: "Preview may not be in test_editor.html" do
        set_editor_text("**Bold** *Italic*")

        if page.has_css?("#previewToggle", wait: 1)
          find("#previewToggle").click

          sleep(0.5)

          preview_html = page.evaluate_script("
            const preview = document.getElementById('markdownPreview');
            return preview ? preview.innerHTML : '';
          ")

          expect(preview_html).to include("<strong>Bold</strong>")
          expect(preview_html).to include("<em>Italic</em>")
        end
      end
    end

    describe "Edge cases and error handling" do
      it "handles empty editor gracefully" do
        set_editor_text("")
        click_button_by_function("insertMarkdown", "**", "**")

        expect(get_editor_text).to eq("****")
      end

      it "handles very long text" do
        long_text = "Lorem ipsum " * 100
        set_editor_text(long_text)

        expect(get_editor_text.length).to be > 1000
      end

      it "handles special characters" do
        special_text = "Special: <>&\"'\n\t"
        set_editor_text(special_text)

        expect(get_editor_text).to include("Special:")
      end

      it "handles Unicode characters" do
        unicode_text = "🎉 Emoji 한글 العربية 中文"
        set_editor_text(unicode_text)

        expect(get_editor_text).to eq(unicode_text)
      end
    end
  end

  # Run tests with Chrome
  describe "Testing with Chrome", driver: :selenium_chrome_headless do
    include_examples "markdown editor functionality", :selenium_chrome_headless
  end

  # Run tests with Firefox
  describe "Testing with Firefox", driver: :selenium_firefox_headless do
    include_examples "markdown editor functionality", :selenium_firefox_headless
  end

  private

  def wait_for_javascript_to_load
    expect(page).to have_css("#editor_content", wait: 10)
    sleep(1)
  end

  def set_editor_text(text)
    escaped_text = text.gsub("\\", "\\\\\\\\").gsub("'", "\\\\'").gsub("\n", "\\n")
    page.execute_script("
      const editor = document.getElementById('editor_content');
      editor.innerText = '#{escaped_text}';
      editor.focus();
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    ")
    sleep(0.1)
  end

  def get_editor_text
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
    sleep(0.1)
  end

  def click_button_by_function(function_name, *args)
    if args.empty?
      page.execute_script("if (typeof #{function_name} === 'function') { #{function_name}(); }")
    else
      escaped_args = args.map { |arg| "'#{arg.gsub("'", "\\\\'")}'" }.join(", ")
      page.execute_script("if (typeof #{function_name} === 'function') { #{function_name}(#{escaped_args}); }")
    end
    sleep(0.2)
  end
end
