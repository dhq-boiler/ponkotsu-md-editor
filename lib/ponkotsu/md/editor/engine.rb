# frozen_string_literal: true

module PonkotsuMdEditor
  # Rails Engine for PonkotsuMdEditor gem
  # This engine integrates the Markdown editor functionality into Rails applications
  # by providing views, assets, and helper methods for rendering the editor components
  class Engine < ::Rails::Engine
    # Isolate this engine's namespace to prevent conflicts with the host application
    isolate_namespace PonkotsuMdEditor

    # Initialize helper methods to be available in ActionView
    # This makes PonkotsuMdEditor::Helpers methods accessible in Rails views
    initializer "ponkotsu_md_editor.helpers" do
      ActionView::Base.include PonkotsuMdEditor::Helpers
    end
  end
end
