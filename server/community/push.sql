-- Phone alerts (server/community/push.mjs). Repeatable; apply with the operations role after a backup, after
-- server/community/schema.sql, before an app image that sends straight to Google and Apple (2 Nov 2026).
-- community.push_device: one row per phone token (Firebase on Android, APNs on iPhone) and member, tied to the sign-in
-- session that registered it, so signing out (the session row is deleted) or an expired session stops that phone's alerts,
-- and registering someone else's token never takes their alerts away. community.push_setting: the kinds of alert a member
-- turned off. ops.control 'push' stops all sending; it starts on, as nothing is sent until members turn Phone alerts on in
-- an app build that supports them.
CREATE TABLE IF NOT EXISTS community.push_device (
  token text NOT NULL,
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
-- 2 Nov 2026: phone tokens go straight to Google and Apple; `sandbox` marks iPhone development builds, which use Apple's
-- sandbox. Expo push tokens stay allowed so an older app image (before this release, or after a rollback) keeps working;
-- the new server never sends to them and they go with their sign-in session.
ALTER TABLE community.push_device ADD COLUMN IF NOT EXISTS sandbox boolean NOT NULL DEFAULT false;
ALTER TABLE community.push_device DROP CONSTRAINT IF EXISTS push_device_token_check;
ALTER TABLE community.push_device ADD CONSTRAINT push_device_token_check CHECK (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'
  OR (platform = 'android' AND token ~ '^[A-Za-z0-9_:-]+$' AND length(token) BETWEEN 100 AND 400)
  OR (platform = 'ios' AND token ~ '^[0-9a-f]+$' AND length(token) BETWEEN 64 AND 200));
-- Postgres regular expressions repeat at most 255 times, so lengths are checked with length().
CREATE INDEX IF NOT EXISTS push_device_user ON community.push_device(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS push_device_session ON community.push_device(session_id);
CREATE TABLE IF NOT EXISTS community.push_setting (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  off text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- The switches in Settings › Phone alerts (pushKinds in server/community/push-words.mjs); 2 Nov 2026 adds classes, recipes,
-- likes and account.
ALTER TABLE community.push_setting DROP CONSTRAINT IF EXISTS push_setting_off_check;
ALTER TABLE community.push_setting ADD CONSTRAINT push_setting_off_check
  CHECK (off <@ ARRAY['messages','friends','gifts','dinners','orders','classes','recipes','likes','account']::text[]);
-- Alerts waiting to be sent (server/community/push.mjs), queued by the app server and the admin console in the same
-- transaction as the change. Sent rows are deleted; rows older than six hours are dropped unsent.
CREATE TABLE IF NOT EXISTS community.push_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  kind text NOT NULL,
  what text NOT NULL CHECK (what ~ '^[a-zA-Z]{1,40}$'),
  actor_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  detail text NOT NULL DEFAULT '' CHECK (length(detail) <= 120),
  url text NOT NULL CHECK (url ~ '^/([^/].*)?$' AND length(url) <= 300),
  tokens text[],
  attempts integer NOT NULL DEFAULT 0,
  send_after timestamptz NOT NULL DEFAULT now(),
  claimed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE community.push_outbox DROP CONSTRAINT IF EXISTS push_outbox_kind_check;
ALTER TABLE community.push_outbox ADD CONSTRAINT push_outbox_kind_check
  CHECK (kind IN ('messages','friends','gifts','dinners','orders','classes','recipes','likes','account'));
CREATE INDEX IF NOT EXISTS push_outbox_due ON community.push_outbox(send_after);
-- Alerts sent at most once (a like, a cooked photo): their key stays 90 days, so liking again after unliking stays quiet.
CREATE TABLE IF NOT EXISTS community.push_once (
  key text PRIMARY KEY CHECK (length(key) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_once_created ON community.push_once(created_at);
CREATE INDEX IF NOT EXISTS push_outbox_created ON community.push_outbox(created_at);
INSERT INTO ops.control(key, enabled, notice) VALUES ('push', true, '') ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON community.push_device, community.push_setting, community.push_outbox, community.push_once TO quintaste_app;
-- The admin console only queues alerts (photo checks, recipe reviews, shop and teacher decisions).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA community TO quintaste_admin;
    GRANT INSERT ON community.push_outbox TO quintaste_admin;
  END IF;
END
$$;
