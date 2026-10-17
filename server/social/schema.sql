-- Social: opt-in profiles, small groups with chat and plans, public gatherings and host applications. Additive; apply after community/schema.sql.
CREATE SCHEMA IF NOT EXISTS social;
CREATE TABLE IF NOT EXISTS social.profile (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '' CHECK (length(first_name) <= 40),
  area text NOT NULL DEFAULT '' CHECK (length(area) <= 60),
  diet text NOT NULL DEFAULT 'Vegan' CHECK (diet IN ('Vegan','Vegetarian')),
  practices text[] NOT NULL DEFAULT '{}',
  times text[] NOT NULL DEFAULT '{}',
  group_size smallint NOT NULL DEFAULT 4 CHECK (group_size IN (2,4,6)),
  about text NOT NULL DEFAULT '' CHECK (length(about) <= 180),
  interests text[] NOT NULL DEFAULT '{}',
  excluded text[] NOT NULL DEFAULT '{}',
  visible boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_profile_visible ON social.profile(visible, updated_at DESC);
CREATE TABLE IF NOT EXISTS social."group" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  size smallint NOT NULL CHECK (size IN (2,4,6)),
  intro text NOT NULL CHECK (length(intro) BETWEEN 1 AND 300),
  venue text NOT NULL DEFAULT '' CHECK (length(venue) <= 160),
  starts timestamptz,
  food text NOT NULL DEFAULT '' CHECK (length(food) <= 1000),
  pay text NOT NULL DEFAULT 'own' CHECK (pay IN ('own','split','organiser')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS social.member (
  group_id uuid NOT NULL REFERENCES social."group"(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('invited','accepted','declined','left')),
  confirmed boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  read_at timestamptz NOT NULL DEFAULT to_timestamp(0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS social_member_user ON social.member(user_id, status);
-- Existing installations also apply membership-history.sql once before deploying the updated router.
CREATE TABLE IF NOT EXISTS social.message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social."group"(id) ON DELETE CASCADE,
  sender_id text REFERENCES public."user"(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','event')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_message_group ON social.message(group_id, created_at);
CREATE TABLE IF NOT EXISTS social.gathering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organiser_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  area text NOT NULL DEFAULT '' CHECK (length(area) <= 60),
  venue text NOT NULL DEFAULT '' CHECK (length(venue) <= 160),
  starts timestamptz,
  seats smallint NOT NULL DEFAULT 4 CHECK (seats BETWEEN 2 AND 30),
  diet text NOT NULL DEFAULT 'Vegan' CHECK (diet IN ('Vegan','Vegetarian')),
  food text NOT NULL DEFAULT '' CHECK (length(food) <= 1000),
  pay text NOT NULL DEFAULT 'own' CHECK (pay IN ('own','split','organiser')),
  alcohol_free boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','posted','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_gathering_upcoming ON social.gathering(state, starts);
CREATE TABLE IF NOT EXISTS social.attendee (
  gathering_id uuid NOT NULL REFERENCES social.gathering(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (gathering_id, user_id)
);
CREATE TABLE IF NOT EXISTS social.application (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('Cooking class','Home dining')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (octet_length(payload::text) <= 20000),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','submitted')),
  case_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS social_application_user ON social.application(user_id, updated_at DESC);
INSERT INTO ops.control(key, enabled, notice) VALUES ('social', false, '') ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA social TO quintaste_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA social TO quintaste_app;
