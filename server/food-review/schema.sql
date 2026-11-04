-- One food-policy job per immutable content revision. Bots never receive direct database access.
BEGIN;
CREATE TABLE IF NOT EXISTS ops.food_review (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('recipe','listing','class','gathering','cooked-photo','editorial-recipe','editorial-event')),
 target text NOT NULL CHECK(length(target) BETWEEN 1 AND 150),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
 policy_version text NOT NULL,
 payload jsonb NOT NULL CHECK(octet_length(payload::text)<=100000),
 photos jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(photos)='array' AND jsonb_array_length(photos)<=40),
 phase text NOT NULL DEFAULT 'mint' CHECK(phase IN ('mint','kaya','done')),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','working','clear','held','asked','superseded')),
 decision jsonb NOT NULL DEFAULT '{}',
 token uuid,
 lease_until timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 20),
 due_at timestamptz NOT NULL DEFAULT now(),
 message text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ops.food_review DROP CONSTRAINT IF EXISTS food_review_kind_target_fingerprint_policy_version_key;
CREATE UNIQUE INDEX IF NOT EXISTS food_review_current_snapshot ON ops.food_review(kind,target,fingerprint,policy_version) WHERE state<>'superseded';
CREATE INDEX IF NOT EXISTS food_review_queue ON ops.food_review(state,due_at,created_at);
CREATE INDEX IF NOT EXISTS food_review_target ON ops.food_review(kind,target,created_at DESC);
CREATE TABLE IF NOT EXISTS ops.food_scan(id boolean PRIMARY KEY DEFAULT true CHECK(id),cursor text NOT NULL DEFAULT '');
INSERT INTO ops.food_scan(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ops.food_review_photo (
 review_id uuid NOT NULL REFERENCES ops.food_review(id) ON DELETE CASCADE,
 slot text NOT NULL CHECK(length(slot) BETWEEN 1 AND 30),
 digest text NOT NULL CHECK(digest ~ '^[a-f0-9]{64}$'),
 bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 700000),
 PRIMARY KEY(review_id,slot)
);
INSERT INTO ops.control(key,enabled,notice) VALUES ('chef_food_checks',false,'mode=watch') ON CONFLICT DO NOTHING;
GRANT SELECT,INSERT,UPDATE ON ops.food_review TO quintaste_app;
GRANT SELECT,UPDATE ON ops.food_scan TO quintaste_app;
GRANT SELECT,INSERT,DELETE ON ops.food_review_photo TO quintaste_app;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='quintaste_admin') THEN
  GRANT SELECT,INSERT,UPDATE ON ops.food_review TO quintaste_admin;
  GRANT SELECT,INSERT,DELETE ON ops.food_review_photo TO quintaste_admin;
 END IF;
END $$;
COMMIT;
