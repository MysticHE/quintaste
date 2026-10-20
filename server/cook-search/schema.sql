-- Cook search demand v1 (docs/COOK_DISCOVERY_PLAN.md, 21 October 2026): settled Cook searches are counted per term and day,
-- terms that members keep searching without finding a recipe become wanted recipes, and the AI recipe worker writes up to
-- ten of those a day for staff review. Apply with the operations role after a backup, after server/recipes/schema.sql and
-- server/ai-recipes/schema.sql. Additive and repeatable.
-- Rollback: restore the previous app image; leave these tables and the relaxed columns (older images ignore them, and they
-- never read rows with an empty author or user).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Searches and results per normalised term per Singapore day; no member ids.
CREATE TABLE IF NOT EXISTS recipes.search_term (
  term text NOT NULL CHECK (length(term) BETWEEN 3 AND 60),
  day date NOT NULL,
  searches integer NOT NULL DEFAULT 0 CHECK (searches >= 0),
  -- Recipes the latest search for the term found that day (bundled, QuinTaste and member recipes together).
  results integer NOT NULL DEFAULT 0 CHECK (results >= 0),
  PRIMARY KEY (term, day)
);
-- Who searched a term, as an HMAC of the account id under a key derived from the server secret, so distinct members can be
-- counted while a database copy alone links no search to anyone. Rows not seen for 14 days are deleted every hour.
CREATE TABLE IF NOT EXISTS recipes.search_member (
  term text NOT NULL CHECK (length(term) BETWEEN 3 AND 60),
  member_hash text NOT NULL CHECK (member_hash ~ '^[a-f0-9]{64}$'),
  last_day date NOT NULL,
  PRIMARY KEY (term, member_hash)
);
CREATE INDEX IF NOT EXISTS recipes_search_member_day ON recipes.search_member(last_day);
-- Terms members want and cannot find. 'requested' means staff pressed Make With AI; the worker starts it within a minute.
-- A 'linked' term points at an existing recipe under another name and becomes a suggestion for it.
CREATE TABLE IF NOT EXISTS recipes.demand (
  term text PRIMARY KEY CHECK (length(term) BETWEEN 3 AND 60),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  searches integer NOT NULL DEFAULT 0,
  searchers integer NOT NULL DEFAULT 0,
  results integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','requested','queued','review','published','linked','skipped')),
  failures integer NOT NULL DEFAULT 0,
  job_id uuid REFERENCES recipes.ai_job(id) ON DELETE SET NULL,
  recipe_id text CHECK (recipe_id IS NULL OR length(recipe_id) <= 120),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recipes_demand_status ON recipes.demand(status, searchers DESC);

-- Wanted recipes are written by the system, not a member: their job and recipe rows carry no account.
ALTER TABLE recipes.ai_job ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE recipes.ai_job DROP CONSTRAINT IF EXISTS ai_job_kind_check;
ALTER TABLE recipes.ai_job DROP CONSTRAINT IF EXISTS ai_job_kind;
ALTER TABLE recipes.ai_job ADD CONSTRAINT ai_job_kind CHECK (kind IN ('video','request','demand'));
ALTER TABLE recipes.ai_job DROP CONSTRAINT IF EXISTS ai_job_owner;
ALTER TABLE recipes.ai_job ADD CONSTRAINT ai_job_owner CHECK (user_id IS NOT NULL OR kind = 'demand');
ALTER TABLE recipes.recipe ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE recipes.recipe DROP CONSTRAINT IF EXISTS recipe_system_author;
ALTER TABLE recipes.recipe ADD CONSTRAINT recipe_system_author CHECK (author_id IS NOT NULL OR draft_key LIKE 'ai-%');

-- On by default: it only makes recipes while ai_recipes and recipes are also on, and every one waits for staff review.
INSERT INTO ops.control(key, enabled, notice) VALUES ('recipe_demand', true, '') ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON recipes.search_term, recipes.search_member, recipes.demand TO quintaste_app;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT ON recipes.search_term, recipes.demand TO quintaste_admin;
    GRANT UPDATE (status, recipe_id, note, failures, updated_at) ON recipes.demand TO quintaste_admin;
  END IF;
END $$;
COMMIT;
