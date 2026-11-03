-- Collection Tasks reads correction progress by member; Explore's existing worker remains the sole payer.
-- Apply outside a transaction. Rollback: restore the app image; this additive index can remain.
SET lock_timeout = '5s';
CREATE INDEX CONCURRENTLY IF NOT EXISTS explore_reward_user_due ON ops.explore_reward(user_id,due_at);
RESET lock_timeout;
