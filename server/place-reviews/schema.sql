-- Place reviews v1: additive. Apply with the operations role after a backup.
-- Rollback: restore the previous app/preview images; leave this schema and its data.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS community.place_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text NOT NULL CHECK (place_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id)
);
CREATE INDEX IF NOT EXISTS place_review_recent ON community.place_review(place_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS place_review_rating ON community.place_review(place_id, rating, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS place_review_author ON community.place_review(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON community.place_review TO quintaste_app;
CREATE TABLE IF NOT EXISTS community.place_review_photo (
  id uuid PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES community.place_review(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
  bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 450000),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  UNIQUE (review_id, position)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON community.place_review_photo TO quintaste_app;
COMMIT;
