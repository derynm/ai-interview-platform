# frozen_string_literal: true

require 'rails_helper'
require 'support/fake_redis'
require 'support/interview_session_helpers'

RSpec.describe AudioWebSocketMiddleware, :aggregate_failures do
  include InterviewSessionHelpers

  let(:middleware) { described_class.new(->(_env) { [200, {}, []] }) }
  let(:session) { create_interview_session }
  let(:first_browser) { 'a' * 32 }
  let(:second_browser) { 'b' * 32 }

  before { allow(Redis).to receive(:new).and_return(FakeRedis.new) }

  def authenticate(client_id: nil, session_id: session.id.to_s)
    query = { token: session.invite_token, client_id: client_id }.compact.to_query
    env = Rack::MockRequest.env_for("/ws/sessions/#{session_id}/audio?#{query}")
    middleware.send(:authenticate_and_load, env, session_id)
  end

  it 'admits the first browser that starts the interview' do
    loaded, error = authenticate(client_id: first_browser)

    expect(error).to be_nil
    expect(loaded).to eq(session)
  end

  it 'rejects a second browser with session_in_use while the first is admitted' do
    authenticate(client_id: first_browser)

    loaded, error, code = authenticate(client_id: second_browser)

    expect(loaded).to be_nil
    expect(error).to eq('Interview already in progress in another browser')
    expect(code).to eq('session_in_use')
  end

  it 'readmits the owning browser when it reconnects' do
    authenticate(client_id: first_browser)

    loaded, error = authenticate(client_id: first_browser)

    expect(error).to be_nil
    expect(loaded).to eq(session)
  end

  it 'rejects an invite connection without a valid client id' do
    loaded, _error, code = authenticate

    expect(loaded).to be_nil
    expect(code).to eq('session_in_use')
  end

  it 'still rejects an ended session before claiming it' do
    session.update!(status: 'ended')

    _loaded, error = authenticate(client_id: first_browser)

    expect(error).to eq('Session has ended')
  end
end
