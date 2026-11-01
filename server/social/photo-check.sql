-- Photo check without a pose or separate selfie, 1 November 2026 (owner decision): the member's main photo must be a real selfie of
-- them and staff check that photo. A sent check no longer needs a pose; it still needs the photo it checks and when it was sent.
-- Older checks keep their pose and selfie (the selfie is still erased 30 days after the decision).
-- Safe to apply twice. Apply with the operations role after a backup, after friends.sql, before the app image that sends checks
-- without a pose. Rollback: restore the previous app image; the looser rule accepts what older images send.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE name text;
BEGIN
  -- The unnamed CHECK from friends.sql that required a pose on every sent check.
  FOR name IN SELECT conname FROM pg_constraint WHERE conrelid = 'social.verification'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%pose IS NOT NULL%' LOOP
    EXECUTE format('ALTER TABLE social.verification DROP CONSTRAINT %I', name);
  END LOOP;
END $$;
ALTER TABLE social.verification DROP CONSTRAINT IF EXISTS social_verification_sent;
ALTER TABLE social.verification ADD CONSTRAINT social_verification_sent
  CHECK (status = 'none' OR (photo_digest IS NOT NULL AND submitted_at IS NOT NULL));
COMMIT;
