-- Social rebuild, 24 October 2026 (owner decisions; docs/SOCIAL_FRIENDS_PLAN.md): friends, 1-to-1 dinner invites, photo
-- profiles checked by staff against a live selfie, and cooking classes by approved teachers.
-- Additive and safe to apply twice. Apply with the operations role after a backup, after schema.sql and tables.sql, before
-- the rebuilt Social router. Rollback: restore the previous app image; older images ignore every column and table here.
--   * profile.birth_date: the age shown on Social; people, friends, chat and dinner invites are for 21 and over.
--   * photo: up to six photos per member; position 0 is the main photo the selfie is compared with.
--   * verification: one row per member. The selfie is AES-256-GCM ciphertext, cleared 30 days after the decision. A
--     member is verified while approved and the main photo still has the digest that was checked.
--   * friend_request / friend / thread / thread_message: requests with a hello, friendships as a canonical pair, one chat per pair.
--   * dinner / dinner_report: a 1-to-1 invitation at a catalogue place, answered by whoever it waits on; after the
--     dinner each person says whether they met, whether they would eat together again (private) and an optional note.
--   * host / class / class_seat / class_chat / class_message: teachers staff approved, their classes, seats and questions.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE social.profile ADD COLUMN IF NOT EXISTS birth_date date CONSTRAINT social_profile_birth_date CHECK (birth_date >= DATE '1920-01-01');

CREATE TABLE IF NOT EXISTS social.photo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 5),
  image bytea NOT NULL CHECK (octet_length(image) <= 460800),
  thumb bytea NOT NULL CHECK (octet_length(thumb) <= 40000),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Checked at the end of each statement, so one UPDATE can reorder a member's photos.
  CONSTRAINT social_photo_position UNIQUE (user_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE IF NOT EXISTS social.verification (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'none' CHECK (status IN ('none','pending','approved','rejected')),
  next_pose text CHECK (next_pose ~ '^[a-z-]{3,30}$'),
  pose text CHECK (pose ~ '^[a-z-]{3,30}$'),
  selfie bytea CHECK (octet_length(selfie) <= 1000000),
  photo_digest text CHECK (photo_digest ~ '^[a-f0-9]{64}$'),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 300),
  submitted_at timestamptz,
  decided_by uuid,
  decided_at timestamptz,
  delete_after timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'none' OR (pose IS NOT NULL AND photo_digest IS NOT NULL AND submitted_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS social_verification_queue ON social.verification(submitted_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS social_verification_purge ON social.verification(delete_after) WHERE selfie IS NOT NULL AND delete_after IS NOT NULL;

CREATE TABLE IF NOT EXISTS social.friend_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  to_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK (from_id <> to_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS social_friend_request_open ON social.friend_request (least(from_id, to_id), greatest(from_id, to_id)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS social_friend_request_to ON social.friend_request(to_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS social_friend_request_from ON social.friend_request(from_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS social.friend (
  a_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  b_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  origin text NOT NULL DEFAULT 'request' CHECK (origin IN ('request','meal')),
  since timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (a_id, b_id),
  -- Byte order, the same as JavaScript's string comparison for account ids, whatever the database collation.
  CHECK (a_id COLLATE "C" < b_id COLLATE "C")
);
CREATE INDEX IF NOT EXISTS social_friend_b ON social.friend(b_id);

CREATE TABLE IF NOT EXISTS social.thread (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  a_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  b_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  a_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  b_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (a_id, b_id),
  CHECK (a_id COLLATE "C" < b_id COLLATE "C")
);
CREATE INDEX IF NOT EXISTS social_thread_b ON social.thread(b_id);

CREATE TABLE IF NOT EXISTS social.dinner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  guest_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  place_id text NOT NULL CHECK (place_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  place_name text NOT NULL CHECK (length(place_name) BETWEEN 1 AND 160),
  starts timestamptz NOT NULL,
  pay text NOT NULL CHECK (pay IN ('split','host','own')),
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 300),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','cancelled','expired')),
  -- Who must answer next: the guest, or the host after the guest suggested another time.
  waiting_on text REFERENCES public."user"(id) ON DELETE CASCADE,
  suggested boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  cancelled_by text REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (host_id <> guest_id),
  CHECK (status <> 'invited' OR waiting_on IN (host_id, guest_id))
);
CREATE UNIQUE INDEX IF NOT EXISTS social_dinner_open ON social.dinner (least(host_id, guest_id), greatest(host_id, guest_id)) WHERE status = 'invited';
CREATE INDEX IF NOT EXISTS social_dinner_host ON social.dinner(host_id, starts DESC);
CREATE INDEX IF NOT EXISTS social_dinner_guest ON social.dinner(guest_id, starts DESC);

CREATE TABLE IF NOT EXISTS social.dinner_report (
  dinner_id uuid NOT NULL REFERENCES social.dinner(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  met text NOT NULL CHECK (met IN ('yes','no_show','didnt_go')),
  eat_again boolean,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dinner_id, user_id)
);

CREATE TABLE IF NOT EXISTS social.thread_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES social.thread(id) ON DELETE CASCADE,
  sender_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','event','dinner')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  dinner_id uuid REFERENCES social.dinner(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_thread_message_thread ON social.thread_message(thread_id, created_at);

CREATE TABLE IF NOT EXISTS social.host (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 60),
  area text NOT NULL DEFAULT '' CHECK (length(area) <= 60),
  experience text NOT NULL CHECK (length(experience) BETWEEN 1 AND 600),
  teaches text NOT NULL CHECK (length(teaches) BETWEEN 1 AND 300),
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 300),
  applied_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid,
  decided_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_host_queue ON social.host(applied_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS social.class (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id text NOT NULL REFERENCES social.host(user_id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  makes text NOT NULL DEFAULT '' CHECK (length(makes) <= 600),
  starts timestamptz NOT NULL,
  ends timestamptz NOT NULL,
  venue text NOT NULL DEFAULT '' CHECK (length(venue) <= 160),
  area text NOT NULL DEFAULT '' CHECK (length(area) <= 60),
  seats smallint NOT NULL CHECK (seats BETWEEN 1 AND 30),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents BETWEEN 0 AND 100000),
  diets text[] NOT NULL DEFAULT '{Plant-Based}' CHECK (
    cardinality(diets) BETWEEN 1 AND 2 AND diets <@ ARRAY['Vegan','Vegetarian','Plant-Based']::text[]
    AND (NOT 'Plant-Based' = ANY(diets) OR diets = '{Plant-Based}')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  hidden_at timestamptz,
  hidden_reason text CHECK (hidden_reason IS NULL OR length(hidden_reason) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends > starts AND ends <= starts + interval '12 hours')
);
CREATE INDEX IF NOT EXISTS social_class_upcoming ON social.class(starts) WHERE status = 'posted' AND hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS social_class_host ON social.class(host_id, starts DESC);

CREATE TABLE IF NOT EXISTS social.class_seat (
  class_id uuid NOT NULL REFERENCES social.class(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','left','removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, user_id)
);
CREATE INDEX IF NOT EXISTS social_class_seat_user ON social.class_seat(user_id, status);

-- Questions between one member and the teacher of one class, before or after joining.
CREATE TABLE IF NOT EXISTS social.class_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES social.class(id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  member_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  host_read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, member_id)
);
CREATE TABLE IF NOT EXISTS social.class_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES social.class_chat(id) ON DELETE CASCADE,
  sender_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','event')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_class_message_chat ON social.class_message(chat_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON social.photo, social.verification, social.friend_request, social.friend, social.thread, social.thread_message,
  social.dinner, social.dinner_report, social.host, social.class, social.class_seat, social.class_chat, social.class_message TO quintaste_app;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA social TO quintaste_admin;
    GRANT SELECT ON social.profile, social.photo, social.class, social.class_seat TO quintaste_admin;
    GRANT SELECT, UPDATE ON social.verification, social.host TO quintaste_admin;
    GRANT UPDATE (status, hidden_at, hidden_reason, updated_at) ON social.class TO quintaste_admin;
    GRANT SELECT, INSERT ON social.class_chat, social.class_message TO quintaste_admin;
    GRANT UPDATE (updated_at) ON social.class_chat TO quintaste_admin;
  END IF;
END $$;
COMMIT;
