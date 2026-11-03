-- Explore contribution jobs v1. Additive; backup and rolled-back dry run before applying.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE community.place_review ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
ALTER TABLE community.place_review ADD COLUMN IF NOT EXISTS live_revision integer NOT NULL DEFAULT 0;
ALTER TABLE community.place_review ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE community.place_review SET published_at=created_at WHERE published AND published_at IS NULL;
CREATE TABLE IF NOT EXISTS ops.explore_work (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('report','review','review-report')),
 target text NOT NULL,
 review_id uuid REFERENCES community.place_review(id) ON DELETE CASCADE,
 issue_key text,
 revision integer NOT NULL DEFAULT 1,
 stage text NOT NULL DEFAULT 'coco' CHECK(stage IN ('coco','pandan','kaya','publish','verify','done')),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','working','needs-input','needs-changes','staff','published','resolved','cancelled','superseded')),
 payload jsonb NOT NULL DEFAULT '{}',
 result jsonb NOT NULL DEFAULT '{}',
 message text NOT NULL DEFAULT '',
 attempts integer NOT NULL DEFAULT 0,
 due_at timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz,
 token uuid,
 worker text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 verified_at timestamptz,
 CHECK(octet_length(payload::text)<600000),
 CHECK(octet_length(result::text)<600000)
);
CREATE INDEX IF NOT EXISTS explore_work_due ON ops.explore_work(stage,due_at,created_at) WHERE state IN ('queued','working');
CREATE UNIQUE INDEX IF NOT EXISTS explore_issue_active ON ops.explore_work(issue_key) WHERE issue_key IS NOT NULL AND state IN ('queued','working','needs-input','staff');
CREATE TABLE IF NOT EXISTS ops.explore_submission (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 submission_key text NOT NULL CHECK(length(submission_key) BETWEEN 8 AND 100),
 input_hash text NOT NULL,
 work_id uuid NOT NULL REFERENCES ops.explore_work(id) ON DELETE CASCADE,
 case_id uuid REFERENCES ops.case_record(id) ON DELETE SET NULL,
 details text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 seen_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,submission_key)
);
ALTER TABLE ops.explore_submission ADD COLUMN IF NOT EXISTS seen_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS explore_submission_owner ON ops.explore_submission(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS ops.explore_photo (
 id uuid PRIMARY KEY,
 work_id uuid NOT NULL REFERENCES ops.explore_work(id) ON DELETE CASCADE,
 owner_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 position smallint NOT NULL CHECK(position BETWEEN 0 AND 59),
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 450000),
 digest text NOT NULL,
 UNIQUE(work_id,position)
);
CREATE TABLE IF NOT EXISTS ops.explore_event (
 id bigserial PRIMARY KEY,
 work_id uuid NOT NULL REFERENCES ops.explore_work(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 what text NOT NULL,
 data jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(work_id,revision,what)
);
ALTER TABLE ops.explore_photo ADD COLUMN IF NOT EXISTS owner_id text REFERENCES public."user"(id) ON DELETE CASCADE;
UPDATE ops.explore_photo p SET owner_id=(SELECT s.user_id FROM ops.explore_submission s WHERE s.work_id=p.work_id ORDER BY s.created_at LIMIT 1) WHERE owner_id IS NULL;
ALTER TABLE ops.explore_photo ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE ops.explore_photo DROP CONSTRAINT IF EXISTS explore_photo_position_check;
ALTER TABLE ops.explore_photo ADD CONSTRAINT explore_photo_position_check CHECK(position BETWEEN 0 AND 59);
CREATE TABLE IF NOT EXISTS ops.explore_delivery (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 work_id uuid NOT NULL REFERENCES ops.explore_work(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 what text NOT NULL,
 payload jsonb NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','unknown','superseded')),
 token uuid,
 due_at timestamptz NOT NULL DEFAULT now(),
 message_id text,
 attempts integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(work_id,revision,what)
);
CREATE TABLE IF NOT EXISTS ops.explore_reward (
 work_id uuid PRIMARY KEY REFERENCES ops.explore_work(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 credits integer NOT NULL DEFAULT 20 CHECK(credits=20),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','paid','held','ineligible')),
 due_at timestamptz NOT NULL,
 paid_at timestamptz
);
CREATE TABLE IF NOT EXISTS ops.explore_patch (
 kind text NOT NULL CHECK(kind IN ('place','menu')),
 id text NOT NULL,
 data jsonb NOT NULL,
 staff_version integer NOT NULL,
 work_id uuid NOT NULL REFERENCES ops.explore_work(id),
 disabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,id)
);
CREATE OR REPLACE FUNCTION ops.invalidate_explore_patch() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 UPDATE ops.explore_patch SET disabled=true WHERE kind=coalesce(NEW.kind,OLD.kind) AND id=coalesce(NEW.id,OLD.id);
 RETURN coalesce(NEW,OLD);
END $$;
ALTER TABLE ops.explore_patch ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;
CREATE OR REPLACE TRIGGER content_invalidates_explore AFTER INSERT OR UPDATE OR DELETE ON content.item FOR EACH ROW EXECUTE FUNCTION ops.invalidate_explore_patch();
CREATE OR REPLACE FUNCTION ops.resolve_explore_cases(work uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE valid boolean;
BEGIN
 SELECT (w.verified_at IS NOT NULL AND w.state IN ('published','resolved')) OR
  (w.kind='review-report' AND w.state='resolved' AND w.result->'kaya'->>'decision'='approve') INTO valid FROM ops.explore_work w WHERE w.id=work;
 IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'Explore outcome is not verified' USING ERRCODE='42501'; END IF;
 UPDATE ops.case_record SET status='resolved',resolution='The contribution outcome was checked and confirmed.',version=version+1,updated_at=now()
 WHERE status IN ('open','triaged','investigating') AND
  (id IN(SELECT s.case_id FROM ops.explore_submission s WHERE s.work_id=work) OR subject_id='explore:work:'||work::text);
END $$;
REVOKE ALL ON FUNCTION ops.resolve_explore_cases(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ops.resolve_explore_cases(uuid) TO quintaste_app;
CREATE OR REPLACE FUNCTION ops.appeal_explore_case(work uuid,details text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM ops.explore_work w WHERE w.id=work AND w.state='staff') THEN RAISE EXCEPTION 'Appeal is not queued' USING ERRCODE='42501'; END IF;
 UPDATE ops.case_record SET status='open',resolution='',description=left(coalesce(description,'')||E'\nAdditional information: '||details,4000),version=version+1,updated_at=now() WHERE subject_id='explore:work:'||work::text;
 IF NOT FOUND THEN INSERT INTO ops.case_record(kind,title,description,subject_id) VALUES('report','Explore review appeal',left(details,4000),'explore:work:'||work::text); END IF;
END $$;
REVOKE ALL ON FUNCTION ops.appeal_explore_case(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ops.appeal_explore_case(uuid,text) TO quintaste_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ops.explore_work,ops.explore_submission,ops.explore_photo,ops.explore_event,ops.explore_delivery,ops.explore_reward,ops.explore_patch TO quintaste_app;
GRANT USAGE,SELECT ON SEQUENCE ops.explore_event_id_seq TO quintaste_app;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='quintaste_admin') THEN
  GRANT SELECT ON ops.explore_work,ops.explore_submission,ops.explore_photo,ops.explore_event,ops.explore_delivery,ops.explore_reward,ops.explore_patch TO quintaste_admin;
  GRANT UPDATE(state,stage,message,result,due_at,updated_at,token,lease_until,attempts) ON ops.explore_work TO quintaste_admin;
 END IF;
END $$;
COMMIT;
