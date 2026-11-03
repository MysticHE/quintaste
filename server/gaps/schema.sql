-- Library gaps (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E, 3 Nov 2026): what members hit that the reviewed library lacks: a dish with
--   no dish card, a food the recipe table does not know, a recipe line members asked Find More With AI about. One row per kind and
--   key, counted; distinct members are keyed hashes (never account ids). At 3 members, or when staff press Draft now, the QT bots
--   draft an addition from sources (server/gaps/bot-router.mjs); staff approve or reject it in Admin › AI recipes › Library gaps.
-- Apply with the operations role after a backup, after server/ai-recipes/schema.sql. Idempotent.
-- Rollback: restore the previous app image; the tables can stay (older images never read them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS recipes.library_gap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('dish','food','swap')),
  key text NOT NULL CHECK (length(key) BETWEEN 1 AND 120),
  label text NOT NULL CHECK (length(label) BETWEEN 1 AND 160),
  context jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(context::text) <= 4000),
  hits integer NOT NULL DEFAULT 0,
  members integer NOT NULL DEFAULT 0,
  -- open -> queued (3 members, or staff) -> claimed by a bridge -> drafted -> approved or rejected; failed after 3 tries. An approved
  -- food becomes `shipped` once staff mark it added to the library (it is in a library release).
  status text NOT NULL DEFAULT 'open' CONSTRAINT library_gap_status CHECK (status IN ('open','queued','claimed','drafted','approved','rejected','failed','shipped')),
  draft jsonb CHECK (draft IS NULL OR octet_length(draft::text) <= 20000),
  error text NOT NULL DEFAULT '' CHECK (length(error) <= 300),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  attempts integer NOT NULL DEFAULT 0,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  queued_at timestamptz,
  claimed_at timestamptz,
  drafted_at timestamptz,
  decided_at timestamptz,
  decided_by text,
  UNIQUE (kind, key)
);
ALTER TABLE recipes.library_gap DROP CONSTRAINT IF EXISTS library_gap_status_check;
ALTER TABLE recipes.library_gap DROP CONSTRAINT IF EXISTS library_gap_status;
ALTER TABLE recipes.library_gap ADD CONSTRAINT library_gap_status CHECK (status IN ('open','queued','claimed','drafted','approved','rejected','failed','shipped'));
CREATE INDEX IF NOT EXISTS recipes_library_gap_queued ON recipes.library_gap(queued_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS recipes_library_gap_approved ON recipes.library_gap(kind) WHERE status = 'approved';
CREATE TABLE IF NOT EXISTS recipes.library_gap_member (
  gap_id uuid NOT NULL REFERENCES recipes.library_gap(id) ON DELETE CASCADE,
  member text NOT NULL CHECK (member ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (gap_id, member)
);
GRANT SELECT, INSERT, UPDATE ON recipes.library_gap TO quintaste_app;
GRANT SELECT, INSERT ON recipes.library_gap_member TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT, UPDATE ON recipes.library_gap TO quintaste_admin;
  END IF;
END $$;
COMMIT;
