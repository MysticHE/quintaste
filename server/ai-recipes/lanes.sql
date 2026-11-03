-- Two lanes for the QT bots (docs/AI_FOOD_LIBRARY_PLAN.md, Phase E, 3 Nov 2026): `quick` for Snap a dish and My ingredients writing
--   and their nutrition fix rounds, `slow` for video and dish requests and wanted recipes. Each bridge claims the lanes it serves,
--   so a long video never holds up a member's quick recipe. A fix round carries the recipe written so far, so the payload limit
--   grows from 8 KB to 60 KB.
-- Apply with the operations role after a backup, after server/ai-recipes/schema.sql. Idempotent.
-- Rollback: restore the previous app image; the column can stay (older images never read it, every row defaults to slow).
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE recipes.ai_bot_task ADD COLUMN IF NOT EXISTS lane text NOT NULL DEFAULT 'slow';
ALTER TABLE recipes.ai_bot_task DROP CONSTRAINT IF EXISTS ai_bot_task_lane;
ALTER TABLE recipes.ai_bot_task ADD CONSTRAINT ai_bot_task_lane CHECK (lane IN ('quick','slow'));
-- The old 8 KB check is found by what it checks, not by its name (a hand-applied schema may have named it differently).
DO $$
DECLARE c text;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid = 'recipes.ai_bot_task'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%octet_length((payload)::text)%' LOOP
    EXECUTE format('ALTER TABLE recipes.ai_bot_task DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE recipes.ai_bot_task ADD CONSTRAINT ai_bot_task_payload_check CHECK (octet_length(payload::text) <= 60000);
-- When the task last went into line: a fix round goes back in line (keeping its first place by created_at) and waits from here.
ALTER TABLE recipes.ai_bot_task ADD COLUMN IF NOT EXISTS queued_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS recipes_ai_bot_task_lane ON recipes.ai_bot_task(lane, created_at) WHERE status = 'queued';
COMMIT;
