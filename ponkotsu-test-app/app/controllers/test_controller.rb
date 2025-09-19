class TestController < ApplicationController
  def index
    @content = "content content content\ncontent content content\n\n\ncontent content content\n\n\ncontent content content"
  end

  def create
    @content = params[:content] || ""
    render :index
  end
end
