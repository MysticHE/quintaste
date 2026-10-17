-- Staff content management v1: additive. Apply with the operations role after a backup, after the community,
-- social, market, place-reviews and admin schemas. Rollback: restore the previous app/admin images; leave these
-- tables and columns (older images ignore them).
-- content.item holds staff edits (origin 'edit', a field patch over packaged or bot content) and staff-created
-- items (origin 'staff', a complete record). Staff edits win over bot updates until staff clear them.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE SCHEMA IF NOT EXISTS content;
CREATE TABLE IF NOT EXISTS content.item (
  kind text NOT NULL CHECK (kind IN ('place','menu','recipe','event')),
  id text NOT NULL CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  origin text NOT NULL CHECK (origin IN ('edit','staff')),
  hidden boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 200000),
  version integer NOT NULL DEFAULT 1,
  updated_by uuid REFERENCES staff.member(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS content_item_updated ON content.item(updated_at DESC);
CREATE TABLE IF NOT EXISTS content.asset (
  sha256 text PRIMARY KEY CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 700000),
  width integer NOT NULL CHECK (width BETWEEN 1 AND 4000),
  height integer NOT NULL CHECK (height BETWEEN 1 AND 4000),
  created_by uuid REFERENCES staff.member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA content TO quintaste_app;
GRANT SELECT ON content.item, content.asset TO quintaste_app;

-- Places withdrawn through the earlier editorial review become hidden staff items, so they can be restored.
INSERT INTO content.item(kind, id, origin, hidden)
  SELECT DISTINCT 'place', content_id, 'edit', true FROM ops.content_decision
  WHERE decision = 'withdrawn' AND content_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'
  ON CONFLICT DO NOTHING;

-- Member content moderation: hidden rows stay for the author and staff but leave public views.
ALTER TABLE community.place_review ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE community.place_review ADD COLUMN IF NOT EXISTS hidden_reason text CHECK (hidden_reason IS NULL OR length(hidden_reason) <= 1000);
ALTER TABLE social.gathering ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE social.gathering ADD COLUMN IF NOT EXISTS hidden_reason text CHECK (hidden_reason IS NULL OR length(hidden_reason) <= 1000);
ALTER TABLE market."order" ADD COLUMN IF NOT EXISTS review_hidden boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA content TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE, DELETE ON content.item TO quintaste_admin;
    GRANT SELECT, INSERT ON content.asset TO quintaste_admin;
    GRANT USAGE ON SCHEMA community TO quintaste_admin;
    GRANT SELECT ON community.place_review, community.place_review_photo TO quintaste_admin;
    GRANT UPDATE (hidden_at, hidden_reason) ON community.place_review TO quintaste_admin;
    GRANT USAGE ON SCHEMA social TO quintaste_admin;
    GRANT SELECT ON social.gathering, social.attendee TO quintaste_admin;
    GRANT UPDATE (state, hidden_at, hidden_reason, updated_at) ON social.gathering TO quintaste_admin;
    GRANT SELECT ON market.photo TO quintaste_admin;
    GRANT UPDATE (review_hidden) ON market."order" TO quintaste_admin;
  END IF;
END $$;
COMMIT;
