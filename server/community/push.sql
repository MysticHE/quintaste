-- Phone alerts (server/community/push.mjs). Additive and repeatable; apply with the operations role after a backup, after
-- server/community/schema.sql. community.push_device: one row per phone's Expo push token and member, tied to the sign-in
-- session that registered it, so signing out (the session row is deleted) or an expired session stops that phone's alerts,
-- and registering someone else's token never takes their alerts away. community.push_setting: the kinds of alert a member
-- turned off. ops.control 'push' stops all sending; it starts on, as nothing is sent until members turn Phone alerts on in
-- an app build that supports them.
CREATE TABLE IF NOT EXISTS community.push_device (
  token text NOT NULL CHECK (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES public."session"(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','zh')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (token, user_id)
);
-- For a table made before sessions were tied in (1 Nov 2026): rows without a session can't be trusted, so they go (members'
-- phones register again at the next launch).
ALTER TABLE community.push_device ADD COLUMN IF NOT EXISTS session_id text REFERENCES public."session"(id) ON DELETE CASCADE;
DELETE FROM community.push_device WHERE session_id IS NULL;
ALTER TABLE community.push_device ALTER COLUMN session_id SET NOT NULL;
DO $$
BEGIN
  IF (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'community.push_device'::regclass AND c.contype = 'p') = ARRAY['token'] THEN
    ALTER TABLE community.push_device DROP CONSTRAINT push_device_pkey, ADD PRIMARY KEY (token, user_id);
  END IF;
END
$$;
CREATE INDEX IF NOT EXISTS push_device_user ON community.push_device(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS push_device_session ON community.push_device(session_id);
CREATE TABLE IF NOT EXISTS community.push_setting (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  off text[] NOT NULL DEFAULT '{}' CHECK (off <@ ARRAY['messages','friends','gifts','dinners','orders']::text[]),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ops.control(key, enabled, notice) VALUES ('push', true, '') ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON community.push_device, community.push_setting TO quintaste_app;
