-- Member recipes v1: signed-in members submit recipes from Cook; staff publish or decline each submission in the
-- admin console before anyone else sees it. A published recipe keeps its live version while an update is in review.
-- Ingredients may link to the author's own Market items; buyers see a label only while that item is on sale.
-- Apply with the operations role after a backup, after community, market and content schemas. Idempotent.
-- Rollback: restore the previous app/admin images; leave these tables (older images ignore them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS recipes;
CREATE TABLE IF NOT EXISTS recipes.recipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  -- The draft's id on the author's device, so resubmitting updates the same recipe.
  draft_key text NOT NULL CHECK (draft_key ~ '^[a-z0-9-]{1,80}$'),
  live jsonb CHECK (live IS NULL OR (jsonb_typeof(live) = 'object' AND octet_length(live::text) <= 150000)),
  live_revision integer,
  pending jsonb CHECK (pending IS NULL OR (jsonb_typeof(pending) = 'object' AND octet_length(pending::text) <= 150000)),
  pending_revision integer,
  pending_state text CHECK (pending_state IN ('review','declined')),
  decision_note text NOT NULL DEFAULT '' CHECK (length(decision_note) <= 300),
  submitted_at timestamptz,
  published_at timestamptz,
  hidden_at timestamptz,
  hidden_reason text CHECK (hidden_reason IS NULL OR length(hidden_reason) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (author_id, draft_key),
  CHECK ((pending IS NULL) = (pending_state IS NULL)),
  CHECK ((live IS NULL) = (live_revision IS NULL))
);
CREATE INDEX IF NOT EXISTS recipes_recipe_live ON recipes.recipe(published_at DESC) WHERE live IS NOT NULL AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_recipe_review ON recipes.recipe(submitted_at) WHERE pending_state = 'review';
CREATE TABLE IF NOT EXISTS recipes.photo (
  recipe_id uuid NOT NULL REFERENCES recipes.recipe(id) ON DELETE CASCADE,
  version text NOT NULL CHECK (version IN ('live','pending')),
  slot text NOT NULL CHECK (slot ~ '^(cover|step-[0-9]{1,2})$'),
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 600000),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (recipe_id, version, slot)
);

INSERT INTO ops.control(key, enabled, notice) VALUES ('recipes', false, '') ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA recipes TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes.recipe, recipes.photo TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA recipes TO quintaste_admin;
    GRANT SELECT ON recipes.recipe, recipes.photo TO quintaste_admin;
    GRANT UPDATE (live, live_revision, pending, pending_revision, pending_state, decision_note, published_at, hidden_at, hidden_reason, updated_at)
      ON recipes.recipe TO quintaste_admin;
    GRANT UPDATE, DELETE ON recipes.photo TO quintaste_admin;
  END IF;
END $$;
COMMIT;
