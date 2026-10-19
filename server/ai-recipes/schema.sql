-- AI recipes v1 (docs/AI_RECIPES_PLAN.md): a member asks for a dish or pastes a video link; a worker in the app server
-- reads it with Gemini through the Cloudflare AI Gateway, checks the result and publishes it as a live member recipe
-- (recipes.recipe) with origin and credit, or sends it to staff review when confidence is low.
-- Apply with the operations role after a backup, after the recipes schema. Idempotent.
-- Rollback: restore the previous app image; leave these tables (older images ignore them).
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS recipes.ai_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video','request')),
  -- The pasted link for a video job, or the member's description for a request.
  input text NOT NULL CHECK (length(input) BETWEEN 1 AND 500),
  -- sha256 of the normalised link, so the same video is read once for everyone.
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','working','published','review','failed')),
  attempts integer NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 500),
  recipe_id uuid REFERENCES recipes.recipe(id) ON DELETE SET NULL,
  -- Model calls and inline bytes, for the cost view; never the media itself.
  usage jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(usage::text) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS recipes_ai_job_queue ON recipes.ai_job(created_at) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS recipes_ai_job_member ON recipes.ai_job(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recipes_ai_job_hash ON recipes.ai_job(input_hash) WHERE status = 'published';
-- Off until the owner enables it; the notice may carry "daily=N" to cap jobs a day across all members.
INSERT INTO ops.control(key, enabled, notice) VALUES ('ai_recipes', false, '') ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON recipes.ai_job TO quintaste_app;
-- Provider keys entered in the staff console (v2, 19 Oct 2026): AES-256-GCM ciphertext (12-byte iv, 16-byte tag, data)
-- under the provider-secret-key file that only the app and admin containers can read, so a database copy alone
-- reveals nothing. `hint` is the last four characters, for the console. The app only reads; staff write.
CREATE TABLE IF NOT EXISTS ops.provider_secret (
  provider text PRIMARY KEY CHECK (provider ~ '^[a-z][a-z0-9_-]{1,31}$'),
  ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) BETWEEN 29 AND 4096),
  key_version integer NOT NULL DEFAULT 1,
  hint text NOT NULL DEFAULT '' CHECK (length(hint) <= 4),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON ops.provider_secret TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT ON recipes.ai_job TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ops.provider_secret TO quintaste_admin;
  END IF;
END $$;
COMMIT;
