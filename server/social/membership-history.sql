-- Additive privacy migration; apply after a backup, before the updated Social router.
-- Rollback retains this column. Never infer acceptance from names or chat text.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE social.member ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
UPDATE social.member m SET accepted_at=m.updated_at
  WHERE m.accepted_at IS NULL AND (m.status='accepted' OR
    (m.status='left' AND EXISTS (SELECT 1 FROM social."group" g WHERE g.id=m.group_id AND g.created_by=m.user_id)));
-- Older non-creator 'left' rows cannot prove acceptance and retain introduction-only access.
COMMIT;
