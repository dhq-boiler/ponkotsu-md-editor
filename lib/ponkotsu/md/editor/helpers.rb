# frozen_string_literal: true

module PonkotsuMdEditor
  class Error < StandardError; end
  # Your code goes here...

  # Helper methods for rendering Markdown editor components in Rails views
  # This module provides view helpers that can be used in ERB templates
  # to integrate the PonkotsuMdEditor functionality
  module Helpers
    # Renders a Markdown editor component for the given form and attribute.
    #
    # @param form [ActionView::Helpers::FormBuilder] The form builder object.
    # @param attribute [Symbol, String] The attribute name to bind the editor to (e.g., :content).
    # @param content [String] The initial content to display in the editor.
    # @param options [Hash] Editor configuration options (e.g., :lang, :preview, :tools, :placeholder).
    # @return [String] The rendered HTML for the Markdown editor.
    #
    # Example usage in a Rails view:
    #   <%= markdown_editor(f, :content, {
    #         lang: :en,
    #         preview: true,
    #         tools: [:bold, :italic, :strikethrough],
    #         placeholder: "This is Placeholder."
    #       }) %>
    def markdown_editor(form, attribute, content, options = {})
      form = form[:form] if form.is_a?(Hash)
      attribute = attribute[:attribute] if attribute.is_a?(Hash)
      content = content[:attribute] if content.is_a?(Hash)
      render "ponkotsu_md_editor/editor", locals: { attribute: attribute, content: content, form: form, options: options }
    end
  end
end
