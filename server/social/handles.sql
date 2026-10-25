-- Public handles, 25 October 2026 (owner decision): one per member, used to find friends on Add friend and shown under the
-- name. Separate from the sign-in username, which stays private.
-- Additive and safe to apply twice. Apply with the operations role after a backup, after friends.sql, before the app image
-- that reads it. Rollback: restore the previous app image; older images ignore this table.
--   * handle: lowercase letters, numbers, dots and underscores, 3 to 24 characters, starting with a letter, unique.
--   * The app makes one from the member's first name the first time it is needed; the backfill below covers members who
--     already have a Social profile so Add friend can find them straight away. Clashes are skipped and made by the app.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS social.handle (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  handle text NOT NULL UNIQUE CONSTRAINT social_handle_format CHECK (handle ~ '^[a-z][a-z0-9._]{2,23}$' AND handle !~ '\.\.' AND handle !~ '\.$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_handle_prefix ON social.handle (handle text_pattern_ops);

WITH named AS (
  SELECT p.user_id, p.updated_at,
    -- The same staff and rude words handles.mjs refuses.
    CASE WHEN x.base ~ '^[a-z][a-z0-9]{2,}$'
      AND x.base NOT IN ('admin','administrator','root','support','staff','help','helpdesk','official','moderator','system','team','settings','quintaste')
      AND x.base !~ '^(admin|official|moderator|support)'
      AND x.base !~ '(quintaste|fuck|shit|cunt|nigg|fagg|bitch|whore|slut|porn|pussy|twat|asshole|kanina|cheebye|chibai|lanjiao|pukimak)'
      THEN left(x.base, 20) ELSE 'member' END AS base
  FROM social.profile p JOIN public."user" u ON u.id=p.user_id
  -- Accents become plain letters as in the app (NFKD), then anything but a-z and 0-9 goes.
  CROSS JOIN LATERAL (SELECT regexp_replace(regexp_replace(translate(lower(coalesce(nullif(p.first_name, ''), u.name, '')),
    'àáâãäåāăąçćčďèéêëēĕėęěìíîïīĭįňñòóôõöøōŏőřśšťùúûüūŭůűųýÿžźż', 'aaaaaaaaacccdeeeeeeeeeiiiiiiinnooooooooorsstuuuuuuuuuyyzzz'), '[^a-z0-9]+', '', 'g'), '^[^a-z]+', '') AS base) x
  WHERE NOT EXISTS (SELECT 1 FROM social.handle h WHERE h.user_id=p.user_id)
), numbered AS (
  SELECT user_id, base, row_number() OVER (PARTITION BY base ORDER BY updated_at, user_id) AS n FROM named
)
INSERT INTO social.handle(user_id, handle)
SELECT user_id, CASE WHEN n = 1 THEN base ELSE base || n END FROM numbered
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON social.handle TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    -- Staff search accounts by handle and reset one that passes as staff or is rude (admin Accounts).
    GRANT SELECT, UPDATE (handle, updated_at) ON social.handle TO quintaste_admin;
  END IF;
END $$;
COMMIT;
