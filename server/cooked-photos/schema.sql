-- Cooked photos v1 (owner, 28 Oct 2026): additive. One "I cooked this" photo per member per recipe, with an optional short note.
-- Apply with the operations role after a backup, before deploying the app that uses it.
-- Rollback: restore the previous app/preview/admin images; leave this schema and its data.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS community.cooked_photo (
  id uuid PRIMARY KEY,
  recipe_id text NOT NULL CHECK (recipe_id ~ '^[a-z0-9][a-z0-9-]{0,99}$' AND recipe_id NOT LIKE 'private-%'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 450000),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hidden_at timestamptz,
  hidden_reason text,
  UNIQUE (recipe_id, user_id)
);
CREATE INDEX IF NOT EXISTS cooked_photo_recent ON community.cooked_photo(recipe_id, updated_at DESC, id);
CREATE INDEX IF NOT EXISTS cooked_photo_author ON community.cooked_photo(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON community.cooked_photo TO quintaste_app;
-- Staff list, view and hide or restore photos in the admin console (Community › Cooked photos); they never edit them.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA community TO quintaste_admin;
    GRANT SELECT ON community.cooked_photo TO quintaste_admin;
    GRANT UPDATE (hidden_at, hidden_reason) ON community.cooked_photo TO quintaste_admin;
  END IF;
END $$;
COMMIT;
