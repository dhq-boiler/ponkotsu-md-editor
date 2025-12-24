# frozen_string_literal: true

# E2E test helper methods
module E2EHelpers
  # Wait for JavaScript and editor to be fully loaded
  def wait_for_editor
    expect(page).to have_css("#editor_content", wait: 10)
    sleep(1) # Allow time for JavaScript initialization
  end

  # Set editor content using innerText
  def set_editor_content(text)
    escaped_text = text.gsub("\\", "\\\\\\\\").gsub("'", "\\\\'").gsub("\n", "\\n")
    page.execute_script("
      const editor = document.getElementById('editor_content');
      if (editor) {
        editor.innerText = '#{escaped_text}';
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    ")
    sleep(0.1)
  end

  # Get current editor content
  def editor_content
    page.evaluate_script("
      const editor = document.getElementById('editor_content');
      return editor ? (editor.innerText || editor.textContent || '') : '';
    ")
  end

  # Select a range of text in the editor
  def select_editor_range(start_pos, end_pos)
    page.execute_script("
      const editor = document.getElementById('editor_content');
      if (!editor) return;

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

  # Execute a markdown formatting function
  def execute_markdown_function(function_name, *args)
    if args.empty?
      page.execute_script("
        if (typeof #{function_name} === 'function') {
          #{function_name}();
        }
      ")
    else
      escaped_args = args.map { |arg| "'#{arg.gsub("'", "\\\\'")}'" }.join(", ")
      page.execute_script("
        if (typeof #{function_name} === 'function') {
          #{function_name}(#{escaped_args});
        }
      ")
    end
    sleep(0.2)
  end

  # Apply bold formatting
  def apply_bold
    execute_markdown_function("insertMarkdown", "**", "**")
  end

  # Apply italic formatting
  def apply_italic
    execute_markdown_function("insertMarkdown", "*", "*")
  end

  # Apply strikethrough formatting
  def apply_strikethrough
    execute_markdown_function("insertMarkdown", "~~", "~~")
  end

  # Apply code formatting
  def apply_code
    execute_markdown_function("insertCode")
  end

  # Get current selection information
  def selection_info
    result = page.evaluate_script("
      if (typeof getContentEditableSelection === 'function') {
        const editor = document.getElementById('editor_content');
        return editor ? getContentEditableSelection(editor) : null;
      }
      return null;
    ")

    return nil unless result

    {
      start: result["start"],
      end: result["end"],
      selected_text: result["selectedText"]
    }
  end

  # Check if preview is visible
  def preview_visible?
    page.evaluate_script("
      const preview = document.getElementById('markdownPreview');
      return preview ? (preview.style.display !== 'none') : false;
    ")
  end

  # Get preview HTML content
  def preview_html
    page.evaluate_script("
      const preview = document.getElementById('markdownPreview');
      return preview ? preview.innerHTML : '';
    ")
  end
end

RSpec.configure do |config|
  config.include E2EHelpers, type: :feature
end
