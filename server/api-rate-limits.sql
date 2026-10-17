-- Existing community.throttle and runtime grants are reused. Apply outside a transaction after backup.
-- Partial index supports bounded expiry cleanup without scanning Social/Market counters.
CREATE INDEX CONCURRENTLY IF NOT EXISTS community_api_rate_expiry
  ON community.throttle (started_at) WHERE scope LIKE 'api-rate:v1:%';
-- Rollback: restore the preceding app release; this additive index can remain safely.
-- Optional separate forward cleanup after reverting all users of it:
-- DROP INDEX CONCURRENTLY IF EXISTS community.community_api_rate_expiry;
