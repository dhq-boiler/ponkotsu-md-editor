# frozen_string_literal: true

require_relative "editor/"

module PonkotsuMdEditor
  class Error < StandardError; end
  # Your code goes here...

  # Helper methods for rendering Markdown editor components in Rails views
  # This module provides view helpers that can be used in ERB templates
  # to integrate the PonkotsuMdEditor functionality
  module Helpers
    # Renders a Markdown editor component with the specified content and options
    #
    # @param content [String] Initial content to display in the editor (default: "")
    # @param options [Hash] Configuration options for the editor (default: {})
    # @return [String] Rendered HTML for the Markdown editor
    #
    # Example usage in a Rails view:
    #   <%= markdown_editor(form, :content, {
    #                                         lang: :en,
    #                                         preview: true,
    #                                         tools: [ :bold, :italic, :strikethrough ],
    #                                         placeholder: "This is Placeholder."
    #                                       }) %>
    def markdown_editor(form, content = "", options = {})
      render "editor", content: content, form: form, options: options
    end
  end
end
