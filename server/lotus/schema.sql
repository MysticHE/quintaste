-- Lotus avatar L0 (AVATAR_LOTUS_PLAN §2–§3, §6): each account's lotus tier, every bloom with the seed it was rolled from,
-- and the pity counters. The server decides and records a bloom before the app animates it. No payments, credits or
-- breeding yet. Rows go with the account.
-- Apply with the operations role after a backup, after the community schema (the API throttle lives in community.throttle).
-- Idempotent and additive. Rollback: restore the previous app image; leave these tables (older images ignore them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS lotus;

-- since_blue / since_golden: blooms in a row that came out below Blue / below Golden (pity: Blue within 10, Golden by 20).
CREATE TABLE IF NOT EXISTS lotus.account (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  tier text CHECK (tier IN ('pink','purple','blue','golden')),
  blooms integer NOT NULL DEFAULT 0 CHECK (blooms >= 0),
  since_blue smallint NOT NULL DEFAULT 0 CHECK (since_blue BETWEEN 0 AND 9),
  since_golden smallint NOT NULL DEFAULT 0 CHECK (since_golden BETWEEN 0 AND 19),
  free_bloom_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((tier IS NULL) = (blooms = 0))
);

-- One row per bloom. seed + number + odds_version replay the roll exactly (server/lotus/odds.mjs `decide`);
-- the counters before the bloom say whether pity applied.
CREATE TABLE IF NOT EXISTS lotus.bloom (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9-]{16,80}$'),
  number integer NOT NULL CHECK (number > 0),
  kind text NOT NULL CHECK (kind IN ('free','rebloom')),
  seed text NOT NULL CHECK (seed ~ '^[a-f0-9]{64}$'),
  odds_version text NOT NULL,
  roll smallint NOT NULL CHECK (roll BETWEEN 0 AND 9999),
  tier text NOT NULL CHECK (tier IN ('pink','purple','blue','golden')),
  pity text CHECK (pity IN ('blue','golden')),
  since_blue_before smallint NOT NULL CHECK (since_blue_before BETWEEN 0 AND 9),
  since_golden_before smallint NOT NULL CHECK (since_golden_before BETWEEN 0 AND 19),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, number),
  UNIQUE (user_id, request_id)
);
-- The free first bloom happens once per account.
CREATE UNIQUE INDEX IF NOT EXISTS lotus_bloom_one_free ON lotus.bloom(user_id) WHERE kind = 'free';
CREATE INDEX IF NOT EXISTS lotus_bloom_created ON lotus.bloom(created_at);

GRANT USAGE ON SCHEMA lotus TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON lotus.account TO quintaste_app;
GRANT SELECT, INSERT ON lotus.bloom TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA lotus TO quintaste_admin;
    GRANT SELECT ON lotus.account, lotus.bloom TO quintaste_admin;
  END IF;
END $$;
COMMIT;
