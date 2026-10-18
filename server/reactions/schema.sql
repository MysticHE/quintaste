-- Reactions v2: likes and shares on published Cook recipes and Explore places, and "cooked" (finished Cook mode) on
-- recipes. One of each per signed-in member per item. Counts are public; who liked or shared is never exposed. Rows go with the account.
-- Apply with the operations role after a backup, after the community schema. Idempotent and additive.
-- Rollback: restore the previous app image; leave this table (older images ignore it).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS community.reaction (
  kind text NOT NULL CHECK (kind IN ('recipe','place')),
  target text NOT NULL CHECK (target ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  action text NOT NULL,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, target, action, user_id)
);
CREATE INDEX IF NOT EXISTS community_reaction_user ON community.reaction(user_id);
-- v2: "cooked" joins like and share, for recipes only. Replaces the v1 check; existing rows already satisfy it.
ALTER TABLE community.reaction DROP CONSTRAINT IF EXISTS reaction_action_check;
ALTER TABLE community.reaction DROP CONSTRAINT IF EXISTS reaction_action_kind;
ALTER TABLE community.reaction ADD CONSTRAINT reaction_action_kind
  CHECK (action IN ('like','share') OR (action = 'cooked' AND kind = 'recipe'));

GRANT SELECT, INSERT, DELETE ON community.reaction TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT ON community.reaction TO quintaste_admin;
  END IF;
END $$;
COMMIT;
