BEGIN;
SELECT pg_advisory_xact_lock(1902914310);
CREATE SCHEMA IF NOT EXISTS staff;
CREATE SCHEMA IF NOT EXISTS ops;
REVOKE ALL ON SCHEMA staff,ops FROM PUBLIC;
CREATE TABLE IF NOT EXISTS staff.member (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 subject text UNIQUE, role text NOT NULL CHECK(role IN ('owner','operator','support','reviewer','auditor')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff.session (
 hash text PRIMARY KEY, member_id uuid NOT NULL REFERENCES staff.member(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 touched_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz
);
CREATE INDEX IF NOT EXISTS staff_session_member ON staff.session(member_id);
CREATE TABLE IF NOT EXISTS staff.oauth (
 hash text PRIMARY KEY, verifier text NOT NULL, nonce text NOT NULL, state text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes'
);
CREATE TABLE IF NOT EXISTS staff.credential (
 id text PRIMARY KEY, member_id uuid NOT NULL REFERENCES staff.member(id) ON DELETE CASCADE,
 public_key bytea NOT NULL, counter bigint NOT NULL, transports text[] NOT NULL DEFAULT '{}',
 name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz
);
CREATE TABLE IF NOT EXISTS staff.challenge (
 session_hash text PRIMARY KEY REFERENCES staff.session(hash) ON DELETE CASCADE,
 value text NOT NULL, intent text NOT NULL CHECK(intent IN ('register','authenticate')),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes'
);
CREATE TABLE IF NOT EXISTS staff.throttle (
 key text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL,
 PRIMARY KEY(key,window_start)
);
CREATE TABLE IF NOT EXISTS staff.audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, occurred_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid REFERENCES staff.member(id), action text NOT NULL, target text NOT NULL,
 reason text NOT NULL, details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS staff_audit_time ON staff.audit(occurred_at DESC);
CREATE TABLE IF NOT EXISTS ops.restriction (
 user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
 reason text NOT NULL, active boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops.control (
 key text PRIMARY KEY, enabled boolean NOT NULL, notice text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ops.control(key,enabled) VALUES('registration',true),('discovery',true),('menus',true),
 ('ai',false),('social',false),('market',false),('games',false),('identity',false)
 ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ops.case_record (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('report','harm','correction','incident','privacy')),
 title text NOT NULL, description text NOT NULL, subject_id text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','triaged','investigating','resolved','dismissed')),
 severity text NOT NULL DEFAULT 'normal' CHECK(severity IN ('normal','high','critical')),
 assigned_to uuid REFERENCES staff.member(id), created_by uuid REFERENCES staff.member(id),
 resolution text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 version integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ops_case_queue ON ops.case_record(status,due_at);
CREATE TABLE IF NOT EXISTS ops.case_note (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_id uuid NOT NULL REFERENCES ops.case_record(id),
 author_id uuid NOT NULL REFERENCES staff.member(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops.content_decision (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), content_id text NOT NULL, revision text NOT NULL,
 decision text NOT NULL CHECK(decision IN ('reviewed','changes_requested','withdrawn')),
 reason text NOT NULL, reviewer_id uuid NOT NULL REFERENCES staff.member(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ops.integration_check (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, provider text NOT NULL,
 status text NOT NULL, http_status integer, checked_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
