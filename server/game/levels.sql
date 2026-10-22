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

-- A run is a numbered level, Today's special (special_day), a pack mission (pack and tier) or a season level (season_id and
-- season_n); level stays 0 for all but the first. Replaces the unnamed check from schema.sql (and the earlier local run_shape),
-- added NOT VALID and then validated so existing rows never block.
ALTER TABLE game.run
  ADD COLUMN IF NOT EXISTS pack text REFERENCES game.recipe_level(hash),
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('learn','service','memory')),
  ADD COLUMN IF NOT EXISTS season_id text CHECK (season_id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  ADD COLUMN IF NOT EXISTS season_n smallint CHECK (season_n BETWEEN 1 AND 12);
ALTER TABLE game.run DROP CONSTRAINT IF EXISTS run_check, DROP CONSTRAINT IF EXISTS run_shape;
-- A café visit (GAME_CONTENT_PLAN §9): the host, and the snapshot of their menu (level pack hashes) the service was built from.
ALTER TABLE game.run ADD COLUMN IF NOT EXISTS cafe_host text CHECK (cafe_host IS NULL OR char_length(cafe_host) BETWEEN 1 AND 120);
ALTER TABLE game.run ADD COLUMN IF NOT EXISTS cafe_menu text[] CHECK (cafe_menu IS NULL OR cardinality(cafe_menu) BETWEEN 1 AND 6);
-- One kind per run: a numbered level, or (level 0) Today's special, a Recipe Kitchen pack, a season level or a café visit. run_kind2
-- replaces the earlier run_kind (which had no café runs) once; checked NOT VALID first, then validated.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'run_kind2' AND conrelid = 'game.run'::regclass) THEN
    ALTER TABLE game.run DROP CONSTRAINT IF EXISTS run_kind;
    ALTER TABLE game.run ADD CONSTRAINT run_kind2 CHECK (
      (level = 0) = (special_day IS NOT NULL OR pack IS NOT NULL OR season_id IS NOT NULL OR cafe_host IS NOT NULL)
      AND (special_day IS NULL) = (special_top IS NULL)
      AND (pack IS NULL) = (tier IS NULL)
      AND (season_id IS NULL) = (season_n IS NULL)
      AND (cafe_host IS NULL) = (cafe_menu IS NULL)
      AND num_nonnulls(special_day, pack, season_id, cafe_host) <= 1) NOT VALID;
  END IF;
END $$;
ALTER TABLE game.run VALIDATE CONSTRAINT run_kind2;
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

-- The shared ingredient list (RECIPE_LEVELS_PLAN §9): every recipe level reuses the same entry for the same ingredient, so two
-- recipes never define it differently. New entries start unreviewed (tags from their name only); staff mark them reviewed.
CREATE TABLE IF NOT EXISTS game.item (
  id text PRIMARY KEY CHECK (id ~ '^x-[a-z0-9][a-z0-9-]{0,37}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  aliases text[] NOT NULL DEFAULT '{}' CHECK (cardinality(aliases) <= 20),
  tags text[] NOT NULL DEFAULT '{}' CHECK (tags <@ ARRAY['allium','egg','dairy','honey','root','mushroom','hot','animal']),
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by text CHECK (char_length(reviewed_by) <= 120),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_item_aliases ON game.item USING gin (aliases);

-- Level-making jobs (RECIPE_LEVELS_PLAN §6-§7): staff choose a recipe; the app's worker compiles it with code and hands the draft to
-- the QT bots (ops/qt-team/game_level_bridge.py, on the ChatGPT plan), which answer with the shape; the worker checks the shape and
-- the level with code and stores it for review. No other AI engine: a job the bots cannot finish fails with the reason. One open job
-- per recipe. Switched by the `game_levels` control (off until staff turn it on).
CREATE TABLE IF NOT EXISTS game.level_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text NOT NULL CHECK (recipe_id ~ '^[a-z0-9][a-z0-9-]{2,150}$'),
  cuisine text CHECK (cuisine IS NULL OR char_length(cuisine) BETWEEN 1 AND 40),
  requested_by text NOT NULL CHECK (char_length(requested_by) BETWEEN 1 AND 120),
  -- queued → waiting (draft ready for the bots) → claimed → answered → done, or failed with the reason.
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','waiting','claimed','answered','done','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 300),
  -- The compiled draft and recipe facts the bots see, and their answer (the shape), kept for review.
  draft jsonb CHECK (draft IS NULL OR (jsonb_typeof(draft) = 'object' AND octet_length(draft::text) <= 65536)),
  answer jsonb CHECK (answer IS NULL OR (jsonb_typeof(answer) = 'object' AND octet_length(answer::text) <= 32768)),
  claimed_at timestamptz,
  answered_at timestamptz,
  pack text REFERENCES game.recipe_level(hash),
  usage jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(usage) = 'object' AND octet_length(usage::text) <= 4096),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
-- One open job per recipe and owner: game_level_job_open_owner below (the first version's game_level_job_open is dropped there).
CREATE INDEX IF NOT EXISTS game_level_job_queue ON game.level_job(status, created_at) WHERE status IN ('queued','waiting','answered');
INSERT INTO ops.control(key, enabled, notice) VALUES ('game_levels', false, '') ON CONFLICT DO NOTHING;
-- Difficulty (GAME_CONTENT_PLAN §5): Glicko-2, a player against a recipe level and tier. A level starts from the test player's
-- clear rates (start_from) and moves with players' first attempts until `players` reaches the lock, then stays until the
-- recipe is edited (a new revision is a new hash). `rated` marks the runs that counted; `pace` is the run's Play your way pace.
ALTER TABLE game.run ADD COLUMN IF NOT EXISTS pace text CHECK (pace IN ('normal','relaxed','slow'));
ALTER TABLE game.run ADD COLUMN IF NOT EXISTS rated boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS game.level_rating (
  hash text NOT NULL REFERENCES game.recipe_level(hash) ON DELETE CASCADE,
  tier text NOT NULL CHECK (tier IN ('learn','service','memory')),
  rating double precision NOT NULL CHECK (rating BETWEEN 0 AND 4000),
  rd double precision NOT NULL CHECK (rd BETWEEN 0 AND 500),
  vol double precision NOT NULL CHECK (vol > 0 AND vol < 1),
  start_rating double precision CHECK (start_rating IS NULL OR start_rating BETWEEN 0 AND 4000),
  start_from jsonb CHECK (start_from IS NULL OR (jsonb_typeof(start_from) = 'array' AND octet_length(start_from::text) <= 512)),
  players integer NOT NULL DEFAULT 0 CHECK (players >= 0),
  clears integer NOT NULL DEFAULT 0 CHECK (clears >= 0 AND clears <= players),
  locked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hash, tier)
);
-- Reactions to a recipe level (GAME_CONTENT_PLAN §5 Quality): only from members who finished a service of it, one per member and
-- level. Dislikes and quits (game.run result `quit`) take a level out of the For you and New rows; it stays on its shelf.
CREATE TABLE IF NOT EXISTS game.level_reaction (
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  hash text NOT NULL REFERENCES game.recipe_level(hash) ON DELETE CASCADE,
  liked boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hash)
);
CREATE INDEX IF NOT EXISTS game_level_reaction_hash ON game.level_reaction(hash);
-- Season levels (GAME_CONTENT_PLAN §6): best per member, season and level number, as game.level_best is per numbered level.
-- Credits use ledger kinds season_clear and season_mastered with source season:<id>-<n>, once ever per level.
CREATE TABLE IF NOT EXISTS game.season_best (
  user_id text NOT NULL REFERENCES game.profile(user_id) ON DELETE CASCADE,
  season_id text NOT NULL CHECK (season_id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  n smallint NOT NULL CHECK (n BETWEEN 1 AND 12),
  stars smallint NOT NULL CHECK (stars BETWEEN 0 AND 3),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  served boolean NOT NULL DEFAULT false, rules boolean NOT NULL DEFAULT false, steady boolean NOT NULL DEFAULT false,
  mastered boolean NOT NULL DEFAULT false, bonus boolean NOT NULL DEFAULT false,
  clears integer NOT NULL DEFAULT 0 CHECK (clears >= 0),
  coins smallint NOT NULL DEFAULT 0 CHECK (coins BETWEEN 0 AND 1000),
  left_secs smallint NOT NULL DEFAULT 0 CHECK (left_secs BETWEEN 0 AND 600),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id, n)
);
INSERT INTO ops.control(key, enabled, notice) VALUES ('game_seasons', false, '') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS game.player_rating (
  user_id text PRIMARY KEY REFERENCES game.profile(user_id) ON DELETE CASCADE,
  rating double precision NOT NULL CHECK (rating BETWEEN 0 AND 4000),
  rd double precision NOT NULL CHECK (rd BETWEEN 0 AND 500),
  vol double precision NOT NULL CHECK (vol > 0 AND vol < 1),
  day date NOT NULL,
  rated_today integer NOT NULL DEFAULT 0 CHECK (rated_today >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- Member levels (GAME_CONTENT_PLAN Phase 4, RECIPE_LEVELS_PLAN §5 and §7): a member asks for a private level from their own published
-- recipe (an AI feature, so it needs an AI Recipes plan). `owner_id` is the member (null for staff requests); their jobs go first
-- (`priority`) and make a level only they can play until staff make it public. One open job per recipe and owner.
ALTER TABLE game.level_job ADD COLUMN IF NOT EXISTS owner_id text REFERENCES public."user"(id) ON DELETE CASCADE;
ALTER TABLE game.level_job ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 9);
CREATE UNIQUE INDEX IF NOT EXISTS game_level_job_open_owner ON game.level_job(recipe_id, coalesce(owner_id, '')) WHERE status IN ('queued','waiting','claimed','answered');
DROP INDEX IF EXISTS game.game_level_job_open;
CREATE INDEX IF NOT EXISTS game_level_job_owner ON game.level_job(owner_id, created_at) WHERE owner_id IS NOT NULL;
-- Members see `message` only; the detail of an unexpected failure is kept here for staff (Admin > Game levels).
ALTER TABLE game.level_job ADD COLUMN IF NOT EXISTS detail text NOT NULL DEFAULT '' CHECK (char_length(detail) <= 300);

-- Member cafés (GAME_CONTENT_PLAN §9, Phase 5; QT-048 updated 22 Oct 2026): opt-in, off behind `game_cafes` until the owner sets the
-- terms wording and contact details. A café shows its name and a menu of up to six reviewed (public) recipe levels; visitors play a
-- service of it; the host sees private weekly counts only. Staff hide a café (hidden_at) from reports.
CREATE TABLE IF NOT EXISTS game.cafe (
  user_id text PRIMARY KEY REFERENCES game.profile(user_id) ON DELETE CASCADE,
  -- The id the app sees: a host's account id is never sent to visitors (it would link the café to their Market shop and Social profile).
  public_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  open boolean NOT NULL DEFAULT false,
  terms_version smallint CHECK (terms_version IS NULL OR terms_version >= 1),
  terms_at timestamptz,
  opened_at timestamptz,
  hidden_at timestamptz,
  hidden_reason text CHECK (hidden_reason IS NULL OR char_length(hidden_reason) <= 300),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT open OR terms_version IS NOT NULL)
);
ALTER TABLE game.cafe ADD COLUMN IF NOT EXISTS public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS game_cafe_public ON game.cafe(public_id);
CREATE TABLE IF NOT EXISTS game.cafe_menu (
  user_id text NOT NULL REFERENCES game.cafe(user_id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 6),
  hash text NOT NULL REFERENCES game.recipe_level(hash) ON DELETE CASCADE,
  PRIMARY KEY (user_id, position),
  UNIQUE (user_id, hash)
);
CREATE TABLE IF NOT EXISTS game.cafe_visit (
  run_id uuid PRIMARY KEY REFERENCES game.run(id) ON DELETE CASCADE,
  host_id text NOT NULL REFERENCES game.cafe(user_id) ON DELETE CASCADE,
  visitor_id text NOT NULL CHECK (char_length(visitor_id) BETWEEN 1 AND 120),
  served boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_cafe_visit_host ON game.cafe_visit(host_id, created_at);
INSERT INTO ops.control(key, enabled, notice) VALUES ('game_cafes', false, '') ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON game.cafe TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON game.cafe_menu TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.cafe_visit TO quintaste_app;
GRANT SELECT, INSERT ON game.item TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.level_job TO quintaste_app;
GRANT INSERT ON game.recipe_level TO quintaste_app;
GRANT SELECT, INSERT ON game.asset TO quintaste_app;
GRANT SELECT, INSERT ON game.art TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.art_job TO quintaste_app;
GRANT SELECT ON game.recipe_level TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.kitchen_best TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.level_rating TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.player_rating TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON game.level_reaction TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON game.season_best TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT, INSERT, UPDATE ON game.recipe_level TO quintaste_admin;
    GRANT SELECT ON game.kitchen_best TO quintaste_admin;
    GRANT SELECT ON game.level_rating TO quintaste_admin;
    GRANT SELECT ON game.level_reaction TO quintaste_admin;
    GRANT SELECT ON game.season_best TO quintaste_admin;
    -- Staff approve or reject pictures and point art keys at approved ones (the Admin picture grid).
    GRANT SELECT, UPDATE ON game.asset TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON game.art TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON game.art_job TO quintaste_admin;
    GRANT SELECT, UPDATE ON game.item TO quintaste_admin;
    GRANT SELECT, INSERT ON game.level_job TO quintaste_admin;
    -- Staff hide or restore a café from reports (Admin > Content > Game cafés).
    GRANT SELECT, UPDATE ON game.cafe TO quintaste_admin;
    GRANT SELECT ON game.cafe_menu TO quintaste_admin;
    GRANT SELECT ON game.cafe_visit TO quintaste_admin;
  END IF;
END $$;
COMMIT;

-- Kitchen quality counts read runs by pack. Built outside the transaction and CONCURRENTLY, so starting and settling runs never wait
-- for it (psql runs this after COMMIT; a build that was interrupted leaves an invalid index: drop it and run this line again).
CREATE INDEX CONCURRENTLY IF NOT EXISTS game_run_pack ON game.run(pack, tier) WHERE pack IS NOT NULL;
