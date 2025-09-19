# frozen_string_literal: true

require_relative "editor/version"
require_relative "editor/helpers"
require_relative "editor/engine" if defined?(Rails)

# Main module for PonkotsuMdEditor gem
# This gem provides a Markdown editor component for Rails applications
# and serves as a workaround for Chrome's textarea performance issues
module PonkotsuMdEditor
  # Base error class for PonkotsuMdEditor specific errors
  class Error < StandardError; end
end
