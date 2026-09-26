# frozen_string_literal: true

# In-memory stand-in for the few Redis commands Sessions::ClientClaim uses, so specs never touch
# the shared development Redis (Sidekiq, pub/sub). Method signatures mirror redis-rb.
# rubocop:disable Naming/PredicateMethod, Naming/MethodParameterName
class FakeRedis
  attr_reader :ttls

  def initialize
    @store = {}
    @ttls = {}
  end

  def set(key, value, nx: false, ex: nil)
    return false if nx && @store.key?(key)

    @store[key] = value
    @ttls[key] = ex
    true
  end

  def get(key)
    @store[key]
  end

  def close; end
end
# rubocop:enable Naming/PredicateMethod, Naming/MethodParameterName
