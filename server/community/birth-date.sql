-- One birth date per account, 1 November 2026 (owner decision): the date given at the account's 18+ check is kept privately and
-- is the only birth date Social reads (age shown, Dining's 21 to 45, People's age filter, admin). Only the member sees the date.
-- Additive and safe to apply twice. Apply with the operations role after a backup, after community/schema.sql and
-- social/friends.sql, before the app image that reads it; apply it once more after that image is live, to copy any Social birth
-- dates saved by the older image in between. Rollback: restore the previous app image; older images ignore this table (the app
-- still mirrors the date into social.profile.birth_date for them).
--   * Set once by the member (sign-up, the account check after Google, or the first Social Basics save for older accounts);
--     staff correct a wrong one in admin Accounts › Manage (audited).
--   * 1920-01-01 or later, matching the app's checks; deleted with the account (ON DELETE CASCADE).
--   * Backfill: accounts that already gave a birth date on their Social profile keep that date.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS community.birth_date (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  birth_date date NOT NULL CONSTRAINT community_birth_date_range CHECK (birth_date >= DATE '1920-01-01'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO community.birth_date(user_id, birth_date)
SELECT user_id, birth_date FROM social.profile WHERE birth_date IS NOT NULL
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT ON community.birth_date TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    -- Age on Social › Photo checks, and the audited correction in Accounts › Manage.
    GRANT SELECT, INSERT, UPDATE (birth_date, updated_at) ON community.birth_date TO quintaste_admin;
  END IF;
END $$;
COMMIT;
