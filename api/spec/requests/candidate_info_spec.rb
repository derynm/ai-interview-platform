# frozen_string_literal: true

require 'rails_helper'
require 'support/fake_redis'
require 'support/interview_session_helpers'

RSpec.describe 'GET /api/v1/sessions/:token/candidate', :aggregate_failures do
  include InterviewSessionHelpers

  let(:session) { create_interview_session }
  let(:first_browser) { 'a' * 32 }

  # Only the claim's client is faked; Rack::Attack keeps its own Redis connection.
  before do
    allow(Redis).to receive(:new).and_call_original
    allow(Redis).to receive(:new).with(url: ENV.fetch('REDIS_URL')).and_return(FakeRedis.new)
  end

  def candidate_info(client_id)
    get "/api/v1/sessions/#{session.invite_token}/candidate", params: { client_id: client_id }
    response.parsed_body
  end

  it 'reports the interview as free before anyone starts it' do
    expect(candidate_info(first_browser)['in_use_elsewhere']).to be(false)
    expect(response).to have_http_status(:ok)
  end

  it 'reports the interview in use to every browser except the one that started it' do
    Sessions::ClientClaim.new(session).claim(first_browser)

    expect(candidate_info('b' * 32)['in_use_elsewhere']).to be(true)
    expect(candidate_info(first_browser)['in_use_elsewhere']).to be(false)
  end
end
