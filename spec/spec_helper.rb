# frozen_string_literal: true

require "bundler/setup"
require "capybara/rspec"
require "selenium-webdriver"

# Load the gem
require "ponkotsu/md/editor"

# Capybara configuration
Capybara.configure do |config|
  config.run_server = false
  config.default_max_wait_time = 10
  config.default_driver = :selenium_chrome_headless
  config.javascript_driver = :selenium_chrome_headless
end

# Set app host for static files
Capybara.app_host = "file://#{File.expand_path("..", __dir__)}"

# Chrome headless driver configuration
Capybara.register_driver :selenium_chrome_headless do |app|
  options = Selenium::WebDriver::Chrome::Options.new
  options.add_argument("--headless")
  options.add_argument("--no-sandbox")
  options.add_argument("--disable-dev-shm-usage")
  options.add_argument("--disable-gpu")
  options.add_argument("--window-size=1280,720")

  Capybara::Selenium::Driver.new(app, browser: :chrome, options: options)
end

# Firefox headless driver configuration
Capybara.register_driver :selenium_firefox_headless do |app|
  options = Selenium::WebDriver::Firefox::Options.new
  options.add_argument("--headless")
  options.add_argument("--window-size=1280,720")

  Capybara::Selenium::Driver.new(app, browser: :firefox, options: options)
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

  # Load support files
  Dir[File.join(__dir__, "support", "**", "*.rb")].each { |f| require f }
end
