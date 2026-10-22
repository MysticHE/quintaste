-- Recipe levels v1 (docs/game/RECIPE_LEVELS_PLAN.md §9, GAME_CONTENT_PLAN.md Phase 0; 22 October 2026).
-- Additive. Apply with the operations role after a backup, after server/game/schema.sql. Idempotent.
-- Rollback: restore the previous app image; leave these tables and columns (older images never write a pack run).
-- Level packs are data, never code: each is stored once by its hash and played as a Recipe Kitchen mission. Runs of a
-- pack keep its hash and tier so the server rebuilds the same service when it replays them.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS game.recipe_level (
  hash text PRIMARY KEY CHECK (hash ~ '^p[a-z0-9]{1,14}$'),
  recipe_id text NOT NULL CHECK (recipe_id ~ '^[a-z0-9][a-z0-9-]{2,150}$'),
  recipe_revision integer NOT NULL CHECK (recipe_revision >= 1),
  -- Null for a public level; a member's id for their private level.
  owner_id text REFERENCES public."user"(id) ON DELETE CASCADE,
  -- review: waiting for staff (public) · ready: playable · hidden: withdrawn; open runs of it are refused at settle.
  status text NOT NULL DEFAULT 'review' CHECK (status IN ('review','ready','hidden')),
  pack jsonb NOT NULL CHECK (jsonb_typeof(pack) = 'object' AND octet_length(pack::text) <= 65536),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text CHECK (char_length(reviewed_by) <= 120)
);
CREATE INDEX IF NOT EXISTS game_recipe_level_recipe ON game.recipe_level(recipe_id, recipe_revision DESC);
-- The Recipe Kitchen shelf a level sits on (the recipe's cuisine, set when the level is made); null shows under More recipes.
ALTER TABLE game.recipe_level ADD COLUMN IF NOT EXISTS cuisine text CHECK (cuisine IS NULL OR char_length(cuisine) BETWEEN 1 AND 40);

-- A run is a numbered level, Today's special (special_day) or a pack mission (pack and tier); level stays 0 for both of
-- the latter. Replaces the unnamed check from schema.sql, added NOT VALID and then validated so existing rows never block.
ALTER TABLE game.run
  ADD COLUMN IF NOT EXISTS pack text REFERENCES game.recipe_level(hash),
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('learn','service','memory'));
ALTER TABLE game.run DROP CONSTRAINT IF EXISTS run_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'run_shape' AND conrelid = 'game.run'::regclass) THEN
    ALTER TABLE game.run ADD CONSTRAINT run_shape CHECK (
      (level = 0) = (special_day IS NOT NULL OR pack IS NOT NULL)
      AND (special_day IS NULL) = (special_top IS NULL)
      AND (pack IS NULL) = (tier IS NULL)
      AND (special_day IS NULL OR pack IS NULL)) NOT VALID;
  END IF;
END $$;
ALTER TABLE game.run VALIDATE CONSTRAINT run_shape;
CREATE INDEX IF NOT EXISTS game_run_pack ON game.run(pack) WHERE pack IS NOT NULL;

-- Best result per recipe and tier from settled mission runs. Credits for missions wait for the owner's decision
-- (GAME_CONTENT_PLAN §14); when they come they use ledger source 'kitchen:<recipe id>', once per recipe ever.
CREATE TABLE IF NOT EXISTS game.kitchen_best (
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  recipe_id text NOT NULL CHECK (recipe_id ~ '^[a-z0-9][a-z0-9-]{2,150}$'),
  tier text NOT NULL CHECK (tier IN ('learn','service','memory')),
  pack text NOT NULL REFERENCES game.recipe_level(hash),
  stars smallint NOT NULL CHECK (stars BETWEEN 0 AND 3),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  clears integer NOT NULL CHECK (clears >= 0),
  coins smallint NOT NULL DEFAULT 0 CHECK (coins BETWEEN 0 AND 1000),
  left_secs smallint NOT NULL DEFAULT 0 CHECK (left_secs BETWEEN 0 AND 600),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id, tier)
);

-- The main path grows past Level 20 (GAME_CONTENT_PLAN §4: about 100 levels; 200 leaves headroom). The app decides which
-- levels exist; these checks only bound the numbers. Old checks are replaced, the new ones added NOT VALID, then validated.
ALTER TABLE game.run DROP CONSTRAINT IF EXISTS run_level_check, DROP CONSTRAINT IF EXISTS run_special_top_check;
ALTER TABLE game.level_best DROP CONSTRAINT IF EXISTS level_best_level_check, DROP CONSTRAINT IF EXISTS level_best_special_top_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'run_level_range' AND conrelid = 'game.run'::regclass) THEN
    ALTER TABLE game.run ADD CONSTRAINT run_level_range CHECK (level BETWEEN 0 AND 200) NOT VALID;
    ALTER TABLE game.run ADD CONSTRAINT run_special_top_range CHECK (special_top BETWEEN 5 AND 200) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'level_best_level_range' AND conrelid = 'game.level_best'::regclass) THEN
    ALTER TABLE game.level_best ADD CONSTRAINT level_best_level_range CHECK (level BETWEEN 0 AND 200) NOT VALID;
    ALTER TABLE game.level_best ADD CONSTRAINT level_best_special_top_range CHECK (special_top BETWEEN 5 AND 200) NOT VALID;
  END IF;
END $$;
ALTER TABLE game.run VALIDATE CONSTRAINT run_level_range, VALIDATE CONSTRAINT run_special_top_range;
ALTER TABLE game.level_best VALIDATE CONSTRAINT level_best_level_range, VALIDATE CONSTRAINT level_best_special_top_range;

-- Game pictures served at runtime (RECIPE_LEVELS_PLAN §8.5), so a new picture needs no app release. QT Gamer drafts them;
-- the artist approves each one before members see it. Stored normalized (WebP, no metadata) and addressed by SHA-256.
CREATE TABLE IF NOT EXISTS game.asset (
  sha256 text PRIMARY KEY CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 300000),
  width integer NOT NULL CHECK (width BETWEEN 16 AND 1024),
  height integer NOT NULL CHECK (height BETWEEN 16 AND 1024),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','rejected')),
  -- Prompt, model, style reference hash, timing and checks, as the bot reported them.
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(provenance) = 'object' AND octet_length(provenance::text) <= 8192),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text CHECK (char_length(reviewed_by) <= 120)
);
-- Which approved picture an art key shows. Pictures are shared by every pack that uses the key; changing one points the key
-- at another asset. A key with no asset plays as a Sketch card.
CREATE TABLE IF NOT EXISTS game.art (
  art_key text PRIMARY KEY CHECK (art_key ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,59}$'),
  kind text NOT NULL CHECK (kind IN ('ingredient','dish','station','prop')),
  asset text REFERENCES game.asset(sha256),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Picture jobs for QT Gamer, claimed over signed routes (server/game/art-bot.mjs). At most one open job per art key.
CREATE TABLE IF NOT EXISTS game.art_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  art_key text NOT NULL CHECK (art_key ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,59}$'),
  kind text NOT NULL CHECK (kind IN ('ingredient','dish','station','prop')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 400),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','claimed','done','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  variants text[] NOT NULL DEFAULT '{}' CHECK (cardinality(variants) <= 4),
  error text NOT NULL DEFAULT '' CHECK (char_length(error) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  answered_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS game_art_job_open ON game.art_job(art_key) WHERE status IN ('queued','claimed');
CREATE INDEX IF NOT EXISTS game_art_job_queue ON game.art_job(created_at) WHERE status = 'queued';

GRANT SELECT, INSERT ON game.asset TO quintaste_app;
GRANT SELECT, INSERT ON game.art TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.art_job TO quintaste_app;
GRANT SELECT ON game.recipe_level TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.kitchen_best TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT, INSERT, UPDATE ON game.recipe_level TO quintaste_admin;
    GRANT SELECT ON game.kitchen_best TO quintaste_admin;
    -- Staff approve or reject pictures and point art keys at approved ones (the Admin picture grid).
    GRANT SELECT, UPDATE ON game.asset TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON game.art TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON game.art_job TO quintaste_admin;
  END IF;
END $$;
COMMIT;
