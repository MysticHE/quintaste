-- Phone alerts (server/community/push.mjs). Additive and repeatable; apply with the operations role after a backup, after
-- server/community/schema.sql. community.push_device: one row per phone's Expo push token, for the member signed in there.
-- community.push_setting: the kinds of alert a member turned off. ops.control 'push' stops all sending; it starts on, as
-- nothing is sent until members turn Phone alerts on in an app build that supports them.
CREATE TABLE IF NOT EXISTS community.push_device (
  token text PRIMARY KEY CHECK (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','zh')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_device_user ON community.push_device(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS community.push_setting (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  off text[] NOT NULL DEFAULT '{}' CHECK (off <@ ARRAY['messages','friends','gifts','dinners','orders']::text[]),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ops.control(key, enabled, notice) VALUES ('push', true, '') ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON community.push_device, community.push_setting TO quintaste_app;
