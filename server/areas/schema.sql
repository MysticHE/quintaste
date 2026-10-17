-- Area participation v1 (PRD QT-013 to QT-015): additive. Apply with the operations role after a backup,
-- after community/schema.sql. Rollback: restore the previous app image; leave these tables and their data.
-- Members opt in per layer (home, work) with a URA planning area only; no address or coordinates are stored.
-- Weekly snapshots publish bands for areas with at least 10 eligible accounts; smaller areas are not disclosed.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS community.area_participation (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  layer text NOT NULL CHECK (layer IN ('home','work')),
  area_code text NOT NULL CHECK (area_code ~ '^[A-Z]{2,3}$'),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, layer)
);
CREATE INDEX IF NOT EXISTS area_participation_area ON community.area_participation(layer, area_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON community.area_participation TO quintaste_app;
CREATE TABLE IF NOT EXISTS community.area_snapshot_week (
  week date PRIMARY KEY,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS community.area_snapshot (
  week date NOT NULL REFERENCES community.area_snapshot_week(week) ON DELETE CASCADE,
  layer text NOT NULL CHECK (layer IN ('home','work')),
  area_code text NOT NULL CHECK (area_code ~ '^[A-Z]{2,3}$'),
  band text NOT NULL CHECK (band IN ('10+','20+','50+','100+')),
  PRIMARY KEY (week, layer, area_code)
);
GRANT SELECT, INSERT, DELETE ON community.area_snapshot_week, community.area_snapshot TO quintaste_app;
INSERT INTO ops.control(key, enabled, notice) VALUES ('areas', false, '') ON CONFLICT DO NOTHING;
COMMIT;
