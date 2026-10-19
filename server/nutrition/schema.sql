-- Learned ingredient database (docs/NUTRITION_HEALTH_PLAN.md, 20 Oct 2026). Recipe nutrition first uses the reviewed table
-- (server-assets/nutrition/ingredient-table.json); every other ingredient name is matched once by the AI to a USDA SR
-- Legacy food (server-assets/nutrition/usda-reference.json) or, when USDA has no such food, researched with sources into
-- nutrition.food. Each answer is stored here, so coverage grows with every recipe and staff can approve, correct,
-- reject or ask again in the console. Figures always come from USDA or the cited sources, never from the model alone.
-- Apply with the operations role after a backup, after the recipes schema. Idempotent.
-- Rollback: restore the previous app and admin images; leave these tables (older images ignore them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS nutrition;

-- Foods USDA SR Legacy lacks (candlenut, tempeh brands, local sauces): per-100 g figures with the pages they came from.
CREATE TABLE IF NOT EXISTS nutrition.food (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  -- {kcal, protein, fat, carbs, fibre, sugar, sodium}: grams, sodium in mg, kcal; fibre, sugar and sodium may be null.
  per100 jsonb NOT NULL CHECK (jsonb_typeof(per100) = 'object' AND (per100->>'kcal')::numeric BETWEEN 0 AND 900),
  sources jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sources) = 'array' AND octet_length(sources::text) <= 4000),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per ingredient name (lower case, preparation words removed): which food it is and how to weigh it.
CREATE TABLE IF NOT EXISTS nutrition.ingredient (
  name_key text PRIMARY KEY CHECK (name_key ~ '^[a-z0-9][a-z0-9 ]{0,79}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  -- auto: the AI's answer, used until staff look; approved: checked by staff; rejected: not used and not asked again;
  -- unknown: no food found (asked again after 30 days); retry: staff asked the AI again with a note.
  status text NOT NULL DEFAULT 'auto' CHECK (status IN ('auto','approved','rejected','unknown','retry')),
  usda text CHECK (usda ~ '^[0-9]{1,8}$'),
  usda_name text CHECK (length(usda_name) <= 200),
  food_id uuid REFERENCES nutrition.food(id) ON DELETE SET NULL,
  -- Water, ice, leaves for wrapping: matched, no nutrients.
  negligible boolean NOT NULL DEFAULT false,
  g_per_ml numeric CHECK (g_per_ml > 0 AND g_per_ml <= 3),
  -- Grams for one of a count unit: {"each": 120, "clove": 3, "stalk": 20}.
  units jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(units) = 'object' AND octet_length(units::text) <= 1000),
  confidence real CHECK (confidence BETWEEN 0 AND 1),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 500),
  staff_note text NOT NULL DEFAULT '' CHECK (length(staff_note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text,
  reviewed_at timestamptz,
  CONSTRAINT ingredient_source CHECK (status NOT IN ('auto','approved') OR negligible OR (usda IS NOT NULL) <> (food_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS nutrition_ingredient_status ON nutrition.ingredient(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS nutrition_ingredient_updated ON nutrition.ingredient(updated_at);

-- Which recipe (at which live revision) uses which names, so a correction or a newly learned name updates every recipe
-- that uses it, and recipes are checked once per revision.
CREATE TABLE IF NOT EXISTS nutrition.recipe_check (
  recipe_id uuid PRIMARY KEY REFERENCES recipes.recipe(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  -- false while some of its names still wait for the AI (it was off, or the run reached its limit).
  complete boolean NOT NULL DEFAULT true,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nutrition.recipe_ingredient (
  recipe_id uuid NOT NULL REFERENCES recipes.recipe(id) ON DELETE CASCADE,
  name_key text NOT NULL,
  PRIMARY KEY (recipe_id, name_key)
);
CREATE INDEX IF NOT EXISTS nutrition_recipe_ingredient_key ON nutrition.recipe_ingredient(name_key);

GRANT USAGE ON SCHEMA nutrition TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON nutrition.food, nutrition.ingredient TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON nutrition.recipe_check, nutrition.recipe_ingredient TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA nutrition TO quintaste_admin;
    GRANT SELECT ON nutrition.food, nutrition.ingredient, nutrition.recipe_ingredient TO quintaste_admin;
    GRANT UPDATE (per100, note, updated_at) ON nutrition.food TO quintaste_admin;
    GRANT UPDATE (status, negligible, g_per_ml, units, staff_note, updated_at, reviewed_by, reviewed_at) ON nutrition.ingredient TO quintaste_admin;
  END IF;
END $$;
COMMIT;
