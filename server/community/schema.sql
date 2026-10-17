-- Shared Market/Social safety tables. Additive; apply with the operations role after a backup.
CREATE SCHEMA IF NOT EXISTS community;
CREATE TABLE IF NOT EXISTS community.block (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  blocked_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS community_block_blocked ON community.block(blocked_id);
CREATE TABLE IF NOT EXISTS community.throttle (
  scope text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1
);
GRANT USAGE ON SCHEMA community TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA community TO quintaste_app;
GRANT INSERT ON ops.case_record TO quintaste_app;
GRANT SELECT (id, subject_id, created_at, kind) ON ops.case_record TO quintaste_app;
