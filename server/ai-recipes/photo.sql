-- Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §6, 3 Nov 2026): a member's dish photo becomes a meat-free recipe.
--   ai_job kind 'photo', with `options` (the dish, the dish card, the diet chosen, private or public); the photo itself
--   (My ingredients, §7: kind 'ingredients', `options` holds the member's items and basics, the diet and private or public.)
--   stays on the app's disk for the job only (server/ai-recipes/work.mjs sweeps it after 24 hours), never in the database.
--   recipes.recipe.private: the member chose to keep the recipe to themselves (owner decision 6, 2 Nov 2026); only its author
--   sees it, and it is left out of the feed, search, likes, reports and other members' views.
-- Apply with the operations role after a backup, after server/cook-search/schema.sql (which lists the same kinds). Idempotent.
-- Rollback: restore the previous app image; leave the column and kind (older images never write them).
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE recipes.ai_job DROP CONSTRAINT IF EXISTS ai_job_kind;
ALTER TABLE recipes.ai_job ADD CONSTRAINT ai_job_kind CHECK (kind IN ('video','request','demand','photo','ingredients'));
ALTER TABLE recipes.ai_job ADD COLUMN IF NOT EXISTS options jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE recipes.ai_job DROP CONSTRAINT IF EXISTS ai_job_options;
ALTER TABLE recipes.ai_job ADD CONSTRAINT ai_job_options CHECK (octet_length(options::text) <= 2000);
ALTER TABLE recipes.recipe ADD COLUMN IF NOT EXISTS private boolean NOT NULL DEFAULT false;
COMMIT;
