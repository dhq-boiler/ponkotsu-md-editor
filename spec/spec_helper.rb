# frozen_string_literal: true

require "bundler/setup"
require "capybara/rspec"
require "selenium-webdriver"

# Load the gem
require "ponkotsu/md/editor"

# Capybara configuration
Capybara.configure do |config|
  config.app_host = "file://#{File.expand_path('..', __dir__)}"
  config.default_max_wait_time = 10
  config.default_driver = :selenium_chrome_headless
  config.javascript_driver = :selenium_chrome_headless
end

# Chrome headless driver configuration
Capybara.register_driver :selenium_chrome_headless do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument('--headless')
  options.add_argument('--no-sandbox')
  options.add_argument('--disable-dev-shm-usage')
  options.add_argument('--disable-gpu')
  options.add_argument('--window-size=1280,720')

  Selenium::WebDriver.for(:chrome, options: options)
end

RSpec.configure do |config|
  # Enable flags like --only-failures and --next-failure
  config.example_status_persistence_file_path = ".rspec_status"

  # Disable RSpec exposing methods globally on `Module` and `main`
  config.disable_monkey_patching!

  config.expect_with :rspec do |c|
    c.syntax = :expect
  end

  # Include Capybara DSL in feature specs
  config.include Capybara::DSL, type: :feature
end
