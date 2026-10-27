-- Chefs in the admin console (docs/ADMIN_CHEFS_PLAN.md §6). Additive and repeatable: apply with the operations role after a
-- backup, after admin/db/schema.sql. Each QT bot ("chef") records every decision here; a lane acts only while its Features
-- switch is on (mode in the note), and the owner answers the decisions a chef was not allowed to make alone.
BEGIN;
ALTER TABLE staff.audit ADD COLUMN IF NOT EXISTS bot text CHECK (bot IS NULL OR bot ~ '^[a-z]{2,20}$');
CREATE TABLE IF NOT EXISTS ops.chef_decision (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 chef text NOT NULL CHECK (chef ~ '^[a-z]{2,20}$'),
 lane text NOT NULL CHECK (lane ~ '^[a-z-]{2,30}$'),
 target text NOT NULL CHECK (length(target) BETWEEN 1 AND 200),
 action text NOT NULL CHECK (action ~ '^[a-z-]{2,30}$'),
 input jsonb NOT NULL DEFAULT '{}' CHECK (octet_length(input::text) <= 8000),
 reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
 evidence jsonb NOT NULL DEFAULT '{}' CHECK (octet_length(evidence::text) <= 16000),
 confidence real CHECK (confidence BETWEEN 0 AND 1),
 review text NOT NULL CHECK (review IN ('agree', 'disagree')),
 why_ask text,
 mode text NOT NULL CHECK (mode IN ('watch', 'on')),
 outcome text NOT NULL CHECK (outcome IN ('watched', 'done', 'asked', 'approved', 'rejected', 'undone', 'failed')),
 result jsonb NOT NULL DEFAULT '{}' CHECK (octet_length(result::text) <= 8000),
 note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
 idem text NOT NULL CHECK (length(idem) BETWEEN 8 AND 120),
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 decided_by uuid REFERENCES staff.member(id),
 UNIQUE (chef, idem)
);
-- Reasons to ask the owner, kept as a named check so a re-run brings an older table up to date ('batch': a recall on another batch).
ALTER TABLE ops.chef_decision DROP CONSTRAINT IF EXISTS chef_decision_why_ask_check;
ALTER TABLE ops.chef_decision ADD CONSTRAINT chef_decision_why_ask_check
  CHECK (why_ask IN ('disagree', 'weak', 'no-to-member', 'irreversible', 'rule', 'batch'));
CREATE INDEX IF NOT EXISTS ops_chef_decision_outcome ON ops.chef_decision(outcome, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_chef_decision_target ON ops.chef_decision(lane, target, created_at DESC);
-- Notes a chef adds to a case (Coco on place reports); staff notes stay in ops.case_note, whose author must be staff.
CREATE TABLE IF NOT EXISTS ops.case_bot_note (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES ops.case_record(id) ON DELETE CASCADE,
 bot text NOT NULL CHECK (bot ~ '^[a-z]{2,20}$'), body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_case_bot_note_case ON ops.case_bot_note(case_id, created_at);
-- One switch per lane, off until the owner turns it to Watch or On in Features.
INSERT INTO ops.control(key, enabled) VALUES ('chef_ingredients', false), ('chef_creators', false), ('chef_game_levels', false),
  ('chef_ai_recipes', false), ('chef_wanted', false), ('chef_member_recipes', false), ('chef_reviews', false), ('chef_gatherings', false),
  ('chef_place_reports', false), ('chef_recalls', false) ON CONFLICT DO NOTHING;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT, INSERT, UPDATE ON ops.chef_decision TO quintaste_admin;
    GRANT SELECT, INSERT ON ops.case_bot_note TO quintaste_admin;
  END IF;
END $$;
COMMIT;
