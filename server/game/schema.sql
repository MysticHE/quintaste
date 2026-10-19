-- Rush Hour Phase B v1 (GAME_PLAN §12.3, §12.7, §14 B; PRD QT-055/056): account progress settled by server replay.
-- Additive. Apply with the operations role after a backup, after community/schema.sql. Idempotent.
-- Rollback: restore the previous app image; leave these tables (older images ignore them) and switch `games` off if needed.
-- Credits are earned only, single-account and non-cashable. The balance lives on game.profile and never goes below zero;
-- every change is one game.ledger row, unique per (account, kind, source), so retries and concurrent requests settle once.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS game;
GRANT USAGE ON SCHEMA game TO quintaste_app;

-- One row per member who has played: balance, café look (validated against unlocks on every write) and the one-time
-- import of progress kept on the device before Phase B.
CREATE TABLE IF NOT EXISTS game.profile (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  cafe jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(cafe) = 'object' AND octet_length(cafe::text) <= 16384),
  imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Best result per level from settled runs (and the one-time import).
CREATE TABLE IF NOT EXISTS game.level_best (
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  -- 0 for Today's special, which is rebuilt from special_day and special_top (the highest level cleared at its start).
  level smallint NOT NULL CHECK (level BETWEEN 0 AND 20),
  special_day date,
  special_top smallint CHECK (special_top BETWEEN 5 AND 20),
  hints text CHECK (hints IN ('full','chip','none')),
  stars smallint NOT NULL CHECK (stars BETWEEN 0 AND 3),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  served boolean NOT NULL, rules boolean NOT NULL, steady boolean NOT NULL, mastered boolean NOT NULL,
  clears integer NOT NULL CHECK (clears >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, level)
);

-- A run is opened online when the service starts (offline-started games are local practice, PRD §17) and settled once
-- from its replayed input log. The id comes from the app so a retried request finds the same attempt.
CREATE TABLE IF NOT EXISTS game.run (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  -- 0 for Today's special, which is rebuilt from special_day and special_top (the highest level cleared at its start).
  level smallint NOT NULL CHECK (level BETWEEN 0 AND 20),
  special_day date,
  special_top smallint CHECK (special_top BETWEEN 5 AND 20),
  hints text CHECK (hints IN ('full','chip','none')),
  mode text NOT NULL CHECK (mode IN ('rush','calm')),
  pet text NOT NULL CHECK (pet ~ '^[a-z]{1,20}$'),
  signature text[] NOT NULL DEFAULT '{}' CHECK (cardinality(signature) <= 3),
  rules_version text NOT NULL CHECK (rules_version ~ '^[a-z0-9]{1,16}$'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','rejected')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  ticks integer CHECK (ticks >= 0),
  result jsonb,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 80),
  CHECK ((level = 0) = (special_day IS NOT NULL) AND (special_day IS NULL) = (special_top IS NULL))
);
CREATE INDEX IF NOT EXISTS game_run_user ON game.run(user_id, started_at DESC);

-- The submitted input log, kept as evidence for 30 days (the API purges older logs).
CREATE TABLE IF NOT EXISTS game.run_log (
  run_id uuid PRIMARY KEY REFERENCES game.run(id) ON DELETE CASCADE,
  actions jsonb NOT NULL CHECK (jsonb_typeof(actions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_run_log_created ON game.run_log(created_at);

-- Credit ledger. Grants: first_clear and mastered use source 'level:N' (once per level ever), replay uses 'run:<id>',
-- import uses 'device'. Spends are negative: purchase uses 'decor:<id>'. Other earned-only spends (the Lotus Avatar
-- breed and re-bloom) add their own kinds through server/game/ledger.mjs.
CREATE TABLE IF NOT EXISTS game.ledger (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount <> 0 AND amount BETWEEN -100000 AND 100000),
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z_]{2,29}$'),
  source text NOT NULL CHECK (source ~ '^[a-z]+:[A-Za-z0-9-]{1,64}$|^device$'),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, source)
);

-- Items bought with credits (decor today). Level and tier unlocks are derived, never stored here.
CREATE TABLE IF NOT EXISTS game.owned (
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  item text NOT NULL CHECK (item ~ '^[a-z]+:[a-z0-9-]{1,40}$'),
  source text NOT NULL CHECK (source IN ('purchase','import')),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item)
);

-- The balance moves only through the ledger (Lotus Avatar L2): each new ledger row adds its amount to game.profile.credits
-- and must match the balance_after it claims, and any other write that changes credits is refused. Spends by the app
-- (server/game/ledger.mjs) set the same value the trigger already wrote, so older app images keep working.
CREATE OR REPLACE FUNCTION game.apply_ledger() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE next integer;
BEGIN
  UPDATE game.profile SET credits = credits + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id RETURNING credits INTO next;
  IF next IS DISTINCT FROM NEW.balance_after THEN
    RAISE EXCEPTION 'game.ledger row does not match the balance' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION game.guard_credits() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF pg_trigger_depth() < 2 AND ((TG_OP = 'INSERT' AND NEW.credits <> 0) OR (TG_OP = 'UPDATE' AND NEW.credits IS DISTINCT FROM OLD.credits)) THEN
    RAISE EXCEPTION 'café credits change only through game.ledger' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER game_ledger_apply AFTER INSERT ON game.ledger FOR EACH ROW EXECUTE FUNCTION game.apply_ledger();
CREATE OR REPLACE TRIGGER game_profile_credits BEFORE INSERT OR UPDATE OF credits ON game.profile FOR EACH ROW EXECUTE FUNCTION game.guard_credits();
-- Keeps the balance and the ledger in step for members who earned credits before the trigger existed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM game.profile p WHERE p.credits <> COALESCE((SELECT sum(amount) FROM game.ledger l WHERE l.user_id = p.user_id), 0)) THEN
    RAISE EXCEPTION 'game.profile credits differ from the ledger; reconcile before applying';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON game.profile, game.level_best, game.run TO quintaste_app;
GRANT SELECT, INSERT, DELETE ON game.run_log TO quintaste_app;
GRANT SELECT, INSERT ON game.ledger, game.owned TO quintaste_app;
GRANT USAGE ON SEQUENCE game.ledger_id_seq TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA game TO quintaste_admin;
    GRANT SELECT ON game.profile, game.level_best, game.run, game.ledger, game.owned TO quintaste_admin;
  END IF;
END $$;

-- The game went live for everyone on 19 October 2026 before this control existed. Turn `games` on once, only if staff
-- have never changed it (version 1), so applying this file again never overrides a staff decision.
INSERT INTO ops.control(key, enabled, notice) VALUES ('games', true, '') ON CONFLICT DO NOTHING;
UPDATE ops.control SET enabled = true, version = version + 1, updated_at = now() WHERE key = 'games' AND version = 1 AND NOT enabled;
COMMIT;
