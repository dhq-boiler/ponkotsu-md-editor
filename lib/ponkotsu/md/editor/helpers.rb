# frozen_string_literal: true

module PonkotsuMdEditor
  class Error < StandardError; end
  # Your code goes here...

  # Helper methods for rendering Markdown editor components in Rails views
  # This module provides view helpers that can be used in ERB templates
  # to integrate the PonkotsuMdEditor functionality
  module Helpers
    # Renders a Markdown editor component with the specified content and options
    #
    # @param form [ActionView::Helpers::FormBuilder] Form builder object
    # @param content [String] Initial content to display in the editor (default: "")
    # @param options [Hash] Configuration options for the editor (default: {})
    # @return [String] Rendered HTML for the Markdown editor
    #
    # Example usage in a Rails view:
    #   <%= markdown_editor(f, :content, {
    #                                         lang: :en,
    #                                         preview: true,
    #                                         tools: [ :bold, :italic, :strikethrough ],
    #                                         placeholder: "This is Placeholder."
    #                                       }) %>
    def markdown_editor(form, content, options = {})
      form = form[:form] if form.is_a?(Hash)
      render "ponkotsu_md_editor/editor", locals: { content: content, form: form, options: options }
    end
  end
end
