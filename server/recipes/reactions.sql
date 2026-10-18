-- Recipe likes and shares v1: one like and one share per signed-in member per Cook recipe (bundled, QuinTaste or
-- member). Counts are public; who liked or shared is never exposed. Rows go with the account (ON DELETE CASCADE).
-- Apply with the operations role after a backup, after the community schema. Idempotent and additive.
-- Rollback: restore the previous app image; leave these tables (older images ignore them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS recipes;
CREATE TABLE IF NOT EXISTS recipes.recipe_like (
  recipe_key text NOT NULL CHECK (recipe_key ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_key, user_id)
);
CREATE TABLE IF NOT EXISTS recipes.recipe_share (
  recipe_key text NOT NULL CHECK (recipe_key ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_key, user_id)
);
CREATE INDEX IF NOT EXISTS recipes_like_user ON recipes.recipe_like(user_id);
CREATE INDEX IF NOT EXISTS recipes_share_user ON recipes.recipe_share(user_id);

GRANT USAGE ON SCHEMA recipes TO quintaste_app;
GRANT SELECT, INSERT, DELETE ON recipes.recipe_like, recipes.recipe_share TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA recipes TO quintaste_admin;
    GRANT SELECT ON recipes.recipe_like, recipes.recipe_share TO quintaste_admin;
  END IF;
END $$;
COMMIT;
