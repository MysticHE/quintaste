-- Collection, 1 November 2026 (owner decisions; docs/COLLECTION_PLAN.md): credits earned from tasks, avatar borders bought
-- with credits, and badges earned from task lists. Credits are the café credits that already exist (game.profile,
-- game.ledger): this file adds no currency. Additive and safe to apply twice. Apply with the operations role after a
-- backup and after server/game/schema.sql and server/social/friends.sql, before the app image that reads it.
--   * social.profile.border: the avatar border a member wears (owned borders are game.owned items 'border:<id>').
--   * community.badge_award: a badge once earned is kept unless staff revoke it (revoked badges are not earned again).
--   * community.badge_shown: up to three earned badges a member shows on their profile, in order.
--   * ops.control 'collection' starts off.
-- Gifts (phase 2): community.gift (one row per gift sent; paid gifts carry the store's transaction id, the master account's
-- are 'free'), a 'gift' kind of chat line pointing at it, social.profile.gifts_off (a member can stop receiving gifts),
-- and ops.control 'gifts', also off. Gifts go to anyone whose profile the sender can see; every member sends one free Rose a
-- Singapore week (store 'weekly'), and the receiver can like a gift (liked_at) for the sender to see.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE social.profile ADD COLUMN IF NOT EXISTS border text CHECK (border IS NULL OR border ~ '^[a-z][a-z0-9-]{1,39}$');

CREATE TABLE IF NOT EXISTS community.badge_award (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  badge text NOT NULL CHECK (badge ~ '^[a-z][a-z0-9-]{1,39}$'),
  earned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by text,
  revoke_reason text CHECK (revoke_reason IS NULL OR length(revoke_reason) BETWEEN 1 AND 500),
  PRIMARY KEY (user_id, badge),
  CHECK ((revoked_at IS NULL) = (revoke_reason IS NULL))
);

CREATE TABLE IF NOT EXISTS community.badge_shown (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  badge text NOT NULL CHECK (badge ~ '^[a-z][a-z0-9-]{1,39}$'),
  PRIMARY KEY (user_id, position),
  UNIQUE (user_id, badge)
);

-- Daily limits and badge counts read the ledger by account and kind.
CREATE INDEX IF NOT EXISTS game_ledger_user_kind ON game.ledger(user_id, kind);

INSERT INTO ops.control(key, enabled, notice) VALUES ('collection', false, '') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS community.gift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  receiver_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  gift text NOT NULL CHECK (gift ~ '^[a-z][a-z0-9-]{1,39}$'),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 100),
  store text NOT NULL CONSTRAINT gift_store_check CHECK (store IN ('free','weekly','apple','google')),
  store_transaction text UNIQUE CHECK (store_transaction IS NULL OR length(store_transaction) BETWEEN 1 AND 200),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','refunded')),
  note_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  liked_at timestamptz,
  CONSTRAINT gift_check CHECK ((store IN ('free','weekly')) = (store_transaction IS NULL))
);
-- For a gift table made before the weekly Rose and likes.
ALTER TABLE community.gift ADD COLUMN IF NOT EXISTS liked_at timestamptz;
-- A thank-you from the receiver, when the sender last looked at likes and thank-yous (the Collection button counts newer
-- ones) and which reactions were already passed on to the sender (a chat line and a phone alert, once each).
ALTER TABLE community.gift ADD COLUMN IF NOT EXISTS thanked_at timestamptz, ADD COLUMN IF NOT EXISTS seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS announced text[] NOT NULL DEFAULT '{}';
ALTER TABLE community.gift DROP CONSTRAINT IF EXISTS gift_store_check, DROP CONSTRAINT IF EXISTS gift_check,
  ADD CONSTRAINT gift_store_check CHECK (store IN ('free','weekly','apple','google')),
  ADD CONSTRAINT gift_check CHECK ((store IN ('free','weekly')) = (store_transaction IS NULL));
CREATE INDEX IF NOT EXISTS community_gift_receiver ON community.gift(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_gift_sender ON community.gift(sender_id, created_at DESC);
ALTER TABLE social.thread_message ADD COLUMN IF NOT EXISTS gift_id uuid REFERENCES community.gift(id) ON DELETE SET NULL;
-- The inbox leaves out gifts that are chat lines; gift deletes also look here (ON DELETE SET NULL).
CREATE INDEX IF NOT EXISTS thread_message_gift ON social.thread_message(gift_id) WHERE gift_id IS NOT NULL;
ALTER TABLE social.thread_message DROP CONSTRAINT IF EXISTS thread_message_kind_check;
ALTER TABLE social.thread_message ADD CONSTRAINT thread_message_kind_check CHECK (kind IN ('text','event','dinner','gift'));
ALTER TABLE social.profile ADD COLUMN IF NOT EXISTS gifts_off boolean NOT NULL DEFAULT false;
INSERT INTO ops.control(key, enabled, notice) VALUES ('gifts', false, '') ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON community.badge_award TO quintaste_app;
GRANT SELECT, INSERT, DELETE ON community.badge_shown TO quintaste_app;
GRANT UPDATE (border, gifts_off) ON social.profile TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON community.gift TO quintaste_app;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT SELECT ON community.badge_award, community.badge_shown TO quintaste_admin;
    GRANT UPDATE (revoked_at, revoked_by, revoke_reason) ON community.badge_award TO quintaste_admin;
    GRANT DELETE ON community.badge_shown TO quintaste_admin;
    GRANT SELECT ON community.gift TO quintaste_admin;
    GRANT UPDATE (note_hidden) ON community.gift TO quintaste_admin;
    -- Staff credit adjustments are ledger rows (kind 'staff'); the ledger trigger moves the balance.
    GRANT USAGE ON SCHEMA game TO quintaste_admin;
    GRANT INSERT ON game.profile, game.ledger TO quintaste_admin;
    GRANT UPDATE (credits, updated_at) ON game.profile TO quintaste_admin;
    GRANT USAGE ON SEQUENCE game.ledger_id_seq TO quintaste_admin;
  END IF;
END $$;

COMMIT;
