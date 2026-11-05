-- Owner, 5 November 2026: members may equip all five earned badges.
-- Apply after a backup, with the operations role, after collection/schema.sql and before the five-badge app/server.
-- Repeatable expansion; existing equipped badges and their order are preserved. No reward or award changes.
-- App/server rollback can keep this wider constraint. Do not shrink to three while positions 4 or 5 exist.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE community.badge_shown
  DROP CONSTRAINT IF EXISTS badge_shown_position_check,
  ADD CONSTRAINT badge_shown_position_check CHECK (position BETWEEN 1 AND 5);

COMMIT;
