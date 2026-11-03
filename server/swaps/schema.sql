-- Swap AI options (docs/AI_FOOD_LIBRARY_PLAN.md §5, 3 Nov 2026): "Find more with AI" under More options asks the QT bots to rank
--   library foods for one recipe line. One row per recipe content and line, shared by every member who asks (the answer is cached);
--   the bots claim rows over signed routes (server/swaps/bot-router.mjs) and post their picks. Code builds and checks every option
--   from the picks when it is shown; the row keeps only the picks.
-- Apply with the operations role after a backup, after server/ai-recipes/schema.sql (recipes schema, quintaste_app role). Idempotent.
-- Rollback: restore the previous app image; the table can stay (older images never read it).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS recipes.swap_ai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id text NOT NULL CHECK (length(recipe_id) BETWEEN 1 AND 100),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 200),
  line_id text NOT NULL CHECK (length(line_id) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','claimed','done','failed')),
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 20000),
  result jsonb CHECK (result IS NULL OR octet_length(result::text) <= 12000),
  error text NOT NULL DEFAULT '' CHECK (length(error) <= 300),
  attempts integer NOT NULL DEFAULT 0,
  requested_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  answered_at timestamptz,
  UNIQUE (recipe_id, content, line_id)
);
CREATE INDEX IF NOT EXISTS recipes_swap_ai_queued ON recipes.swap_ai(created_at) WHERE status = 'queued';
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes.swap_ai TO quintaste_app;
COMMIT;
