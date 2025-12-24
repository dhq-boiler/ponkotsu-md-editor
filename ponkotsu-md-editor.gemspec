# frozen_string_literal: true

require_relative "lib/ponkotsu/md/editor/version"

Gem::Specification.new do |spec|
  spec.name = "ponkotsu-md-editor"
  spec.version = PonkotsuMdEditor::VERSION
  spec.authors = ["dhq_boiler"]
  spec.email = ["dhq_boiler@live.jp"]

  spec.summary = "A gem that provides a fun Markdown editor."
  spec.description = "There is a bug in Chrome where entering large amounts of text " \
                     "into a textarea element causes significant slowness " \
                     "(https://issues.chromium.org/issues/341564372). " \
                     "This gem serves as a countermeasure for that issue."
  spec.homepage = "https://github.com/dhq-boiler/ponkotsu-md-editor"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0.0"

  # spec.metadata["allowed_push_host"] = "TODO: Set to your gem server 'https://example.com'"
  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["rubygems_mfa_required"] = "true"
  # spec.metadata["changelog_uri"] = "TODO: Put your gem's CHANGELOG.md URL here."

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  gemspec = File.basename(__FILE__)
  spec.files = IO.popen(%w[git ls-files -z], chdir: __dir__, err: IO::NULL) do |ls|
    ls.readlines("\x0", chomp: true).reject do |f|
      (f == gemspec) ||
        f.start_with?(*%w[bin/ Gemfile .gitignore .rspec spec/ .github/ .rubocop.yml])
    end
  end
  spec.bindir = "exe"
  spec.executables = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # Uncomment to register a new dependency of your gem
  # spec.add_dependency "example-gem", "~> 1.0"
  spec.add_dependency "rails", "~> 8.1"

  # For more information and examples about making a new gem, check out our
  # guide at: https://bundler.io/guides/creating_gem.html
end
