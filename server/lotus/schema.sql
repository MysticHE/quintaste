-- Lotus avatar (AVATAR_LOTUS_PLAN §2–§6). L0: each account's lotus tier, every bloom with the seed it was rolled from, and
-- the pity counters; the server decides and records a bloom before the app animates it. L2 and the non-billing half of L1:
-- re-blooms paid with earned café credits, the breed entitlement ledger and two-form generation jobs. No store billing.
-- Rows go with the account.
-- Apply with the operations role after a backup, after the community, avatar and game schemas (the API throttle lives in
-- community.throttle, credit spends in game.ledger).
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

-- L2 (AVATAR_LOTUS_PLAN §2 step 6, §4, §9): a re-bloom costs earned café credits and is never sold for money, so every
-- re-bloom row needs the matching game.ledger spend (kind lotus_rebloom, source bloom:<request id>) in the same transaction.
-- Apply after server/game/schema.sql.
CREATE OR REPLACE FUNCTION lotus.check_rebloom() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.kind = 'rebloom' AND NOT EXISTS (SELECT 1 FROM game.ledger WHERE user_id = NEW.user_id AND kind = 'lotus_rebloom'
      AND source = 'bloom:' || NEW.request_id AND amount < 0) THEN
    RAISE EXCEPTION 'a re-bloom needs its café credit spend' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER lotus_bloom_rebloom BEFORE INSERT ON lotus.bloom FOR EACH ROW EXECUTE FUNCTION lotus.check_rebloom();

-- Breed entitlements (§4, §6). Every change is one insert-only lotus.breed_ledger row; lotus.breed_balance moves only
-- through the ledger trigger, which runs as the schema owner, so the app role can read balances but never write them.
--   grant   +1 available. Source credits:<request id> needs the matching 600-credit game.ledger spend (kind lotus_breed,
--           source breed:<request id>); store:<transaction> is reserved for store purchases (L1).
--   hold    available → held when a breed starts (source breed:<breed id>). One breed at a time per account.
--   consume held → used when that breed succeeds.   release  held → available when it fails.
--   revoke  −1 available, for a refunded store purchase whose breed was never used (L1; source as its grant).
CREATE TABLE IF NOT EXISTS lotus.breed_balance (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  available integer NOT NULL DEFAULT 0 CHECK (available >= 0),
  held smallint NOT NULL DEFAULT 0 CHECK (held BETWEEN 0 AND 1),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lotus.breed_ledger (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('grant','hold','consume','release','revoke')),
  source text NOT NULL CHECK (source ~ '^(credits|store|breed):[A-Za-z0-9._-]{1,100}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, source),
  CHECK ((kind IN ('hold','consume','release')) = (source LIKE 'breed:%'))
);
-- A held breed settles once: consumed or released, never both.
CREATE UNIQUE INDEX IF NOT EXISTS lotus_breed_settled ON lotus.breed_ledger(user_id, source) WHERE kind IN ('consume','release');

CREATE OR REPLACE FUNCTION lotus.apply_breed_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.kind = 'grant' AND NEW.source LIKE 'credits:%' AND NOT EXISTS (SELECT 1 FROM game.ledger WHERE user_id = NEW.user_id
      AND kind = 'lotus_breed' AND source = 'breed:' || substr(NEW.source, 9) AND amount < 0) THEN
    RAISE EXCEPTION 'a credit breed needs its café credit spend' USING ERRCODE = '23514';
  ELSIF NEW.kind IN ('consume','release') AND NOT EXISTS (SELECT 1 FROM lotus.breed_ledger WHERE user_id = NEW.user_id
      AND kind = 'hold' AND source = NEW.source) THEN
    RAISE EXCEPTION 'only a held breed can settle' USING ERRCODE = '23514';
  ELSIF NEW.kind = 'revoke' AND NOT EXISTS (SELECT 1 FROM lotus.breed_ledger WHERE user_id = NEW.user_id
      AND kind = 'grant' AND source = NEW.source) THEN
    RAISE EXCEPTION 'only a granted breed can be revoked' USING ERRCODE = '23514';
  END IF;
  INSERT INTO lotus.breed_balance(user_id) VALUES (NEW.user_id) ON CONFLICT DO NOTHING;
  UPDATE lotus.breed_balance SET
    available = available + CASE NEW.kind WHEN 'grant' THEN 1 WHEN 'release' THEN 1 WHEN 'hold' THEN -1 WHEN 'revoke' THEN -1 ELSE 0 END,
    held = held + CASE NEW.kind WHEN 'hold' THEN 1 WHEN 'consume' THEN -1 WHEN 'release' THEN -1 ELSE 0 END,
    used = used + CASE NEW.kind WHEN 'consume' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NULL;
END $$;
CREATE OR REPLACE TRIGGER lotus_breed_ledger_apply AFTER INSERT ON lotus.breed_ledger FOR EACH ROW EXECUTE FUNCTION lotus.apply_breed_ledger();

-- One breed: the lotus it bred from, its state, the free regenerations used (up to 2) and the latest Adult and Mini
-- results, which live encrypted in the member's avatar library (avatar.saved).
CREATE TABLE IF NOT EXISTS lotus.breed (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('pink','purple','blue','golden')),
  status text NOT NULL CHECK (status IN ('breeding','bred','returned')),
  regenerations smallint NOT NULL DEFAULT 0 CHECK (regenerations BETWEEN 0 AND 2),
  adult_id uuid,
  mini_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'bred') = (adult_id IS NOT NULL AND mini_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS lotus_breed_one_open ON lotus.breed(user_id) WHERE status = 'breeding';
CREATE INDEX IF NOT EXISTS lotus_breed_user ON lotus.breed(user_id, created_at DESC);

-- One generation attempt (§5): the first breed or a free regeneration, six image calls (Adult base, Mini base, then blink
-- and talk for each). Runs one at a time across the server with portrait jobs; metadata is removed after 30 days.
CREATE TABLE IF NOT EXISTS lotus.job (
  id uuid PRIMARY KEY,
  breed_id uuid NOT NULL REFERENCES lotus.breed(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9-]{16,80}$'),
  kind text NOT NULL CHECK (kind IN ('breed','regenerate')),
  status text NOT NULL CHECK (status IN ('queued','working','complete','failed')),
  completed smallint NOT NULL DEFAULT 0 CHECK (completed BETWEEN 0 AND 6),
  message text CHECK (char_length(message) <= 200),
  consent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  UNIQUE (user_id, request_id)
);
CREATE INDEX IF NOT EXISTS lotus_job_pending ON lotus.job(status, created_at);
CREATE INDEX IF NOT EXISTS lotus_job_breed ON lotus.job(breed_id, created_at DESC);

GRANT USAGE ON SCHEMA lotus TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON lotus.account TO quintaste_app;
GRANT SELECT, INSERT ON lotus.bloom, lotus.breed_ledger TO quintaste_app;
GRANT USAGE ON SEQUENCE lotus.breed_ledger_id_seq TO quintaste_app;
GRANT SELECT ON lotus.breed_balance TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON lotus.breed TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON lotus.job TO quintaste_app;
REVOKE ALL ON FUNCTION lotus.apply_breed_ledger(), lotus.check_rebloom() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA lotus TO quintaste_admin;
    GRANT SELECT ON lotus.account, lotus.bloom, lotus.breed_balance, lotus.breed_ledger, lotus.breed, lotus.job TO quintaste_admin;
  END IF;
END $$;
COMMIT;
