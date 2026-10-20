-- Social redesign, 20 October 2026 (owner request; docs/research/reports/Social engagement and comfort redesign.md).
-- Additive and safe to apply twice. Apply with the operations role after a backup, after schema.sql, before the updated
-- Social router. Rollback: restore the previous app image; older images ignore every column and table added here.
--   * profile: the practical facts locals look for (all optional, each with its own visibility), usual spots and prompts.
--   * face: a small picture a member chose to show on Social (from their own avatar); deleted with the account.
--   * group: an open table is a group that anyone may join (listed), at a catalogue place, with a balance option.
--   * member: the plan an invitee was offered, when it expires, who brought them, and what they said after the meal.
--   * kaki_say: one line written by a tablemate after a shared meal; shown only once the subject approves it.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE social.profile
  ADD COLUMN IF NOT EXISTS here_for text NOT NULL DEFAULT 'makan' CONSTRAINT social_profile_here_for CHECK (here_for IN ('friends','makan','more')),
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '' CONSTRAINT social_profile_gender CHECK (gender IN ('','woman','man')),
  ADD COLUMN IF NOT EXISTS birth_year smallint CONSTRAINT social_profile_birth_year CHECK (birth_year >= 1920),
  ADD COLUMN IF NOT EXISTS religion text NOT NULL DEFAULT '' CONSTRAINT social_profile_religion CHECK (length(religion) <= 30),
  ADD COLUMN IF NOT EXISTS ethnicity text NOT NULL DEFAULT '' CONSTRAINT social_profile_ethnicity CHECK (length(ethnicity) <= 30),
  ADD COLUMN IF NOT EXISTS why text[] NOT NULL DEFAULT '{}' CONSTRAINT social_profile_why CHECK (cardinality(why) <= 6),
  ADD COLUMN IF NOT EXISTS hobbies text[] NOT NULL DEFAULT '{}' CONSTRAINT social_profile_hobbies CHECK (cardinality(hobbies) <= 12),
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}' CONSTRAINT social_profile_languages CHECK (cardinality(languages) <= 8),
  ADD COLUMN IF NOT EXISTS education text NOT NULL DEFAULT '' CONSTRAINT social_profile_education CHECK (length(education) <= 30),
  ADD COLUMN IF NOT EXISTS work text NOT NULL DEFAULT '' CONSTRAINT social_profile_work CHECK (length(work) <= 40),
  ADD COLUMN IF NOT EXISTS grew_up text NOT NULL DEFAULT '' CONSTRAINT social_profile_grew_up CHECK (length(grew_up) <= 40),
  ADD COLUMN IF NOT EXISTS height smallint CONSTRAINT social_profile_height CHECK (height BETWEEN 120 AND 230),
  ADD COLUMN IF NOT EXISTS drinking text NOT NULL DEFAULT '' CONSTRAINT social_profile_drinking CHECK (drinking IN ('','No','Sometimes','Yes')),
  ADD COLUMN IF NOT EXISTS smoking text NOT NULL DEFAULT '' CONSTRAINT social_profile_smoking CHECK (smoking IN ('','No','Sometimes','Yes')),
  ADD COLUMN IF NOT EXISTS family text NOT NULL DEFAULT '' CONSTRAINT social_profile_family CHECK (length(family) <= 30),
  ADD COLUMN IF NOT EXISTS pets text[] NOT NULL DEFAULT '{}' CONSTRAINT social_profile_pets CHECK (cardinality(pets) <= 4),
  ADD COLUMN IF NOT EXISTS spots text[] NOT NULL DEFAULT '{}' CONSTRAINT social_profile_spots CHECK (cardinality(spots) <= 3),
  ADD COLUMN IF NOT EXISTS prompts jsonb NOT NULL DEFAULT '[]'::jsonb CONSTRAINT social_profile_prompts CHECK (jsonb_typeof(prompts) = 'array' AND octet_length(prompts::text) <= 2000),
  ADD COLUMN IF NOT EXISTS opening text NOT NULL DEFAULT '' CONSTRAINT social_profile_opening CHECK (length(opening) <= 120),
  ADD COLUMN IF NOT EXISTS hidden text[] NOT NULL DEFAULT '{gender,ethnicity}' CONSTRAINT social_profile_hidden CHECK (cardinality(hidden) <= 20),
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;
CREATE INDEX IF NOT EXISTS social_profile_spots ON social.profile USING gin (spots) WHERE visible;

CREATE TABLE IF NOT EXISTS social.face (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  image bytea NOT NULL CHECK (octet_length(image) <= 60000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social."group"
  ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS place_id text CONSTRAINT social_group_place CHECK (place_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  ADD COLUMN IF NOT EXISTS area_code text CONSTRAINT social_group_area CHECK (area_code ~ '^[A-Z]{2,3}$'),
  ADD COLUMN IF NOT EXISTS diets text[] NOT NULL DEFAULT '{Plant-Based}' CONSTRAINT social_group_diets CHECK (
    cardinality(diets) BETWEEN 1 AND 2 AND diets <@ ARRAY['Vegan','Vegetarian','Plant-Based']::text[]
    AND (NOT 'Plant-Based' = ANY(diets) OR diets = '{Plant-Based}')),
  ADD COLUMN IF NOT EXISTS same_gender text NOT NULL DEFAULT '' CONSTRAINT social_group_same_gender CHECK (same_gender IN ('','woman','man')),
  ADD COLUMN IF NOT EXISTS alcohol_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '' CONSTRAINT social_group_note CHECK (length(note) <= 120),
  -- 'table' groups come from Start a table (open or private); 'invite' groups from inviting one person.
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'invite' CONSTRAINT social_group_origin CHECK (origin IN ('invite','table'));
CREATE INDEX IF NOT EXISTS social_group_listed ON social."group"(starts) WHERE listed;

ALTER TABLE social.member
  ADD COLUMN IF NOT EXISTS offer jsonb CONSTRAINT social_member_offer CHECK (offer IS NULL OR octet_length(offer::text) <= 1000),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS kaki_of text REFERENCES public."user"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attended text CONSTRAINT social_member_attended CHECK (attended IN ('yes','no','changed')),
  ADD COLUMN IF NOT EXISTS attended_at timestamptz,
  ADD COLUMN IF NOT EXISTS eat_again text[] NOT NULL DEFAULT '{}' CONSTRAINT social_member_eat_again CHECK (cardinality(eat_again) <= 6),
  -- Removed from the member's own list; kept so attendance and no-show history survive.
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
-- The birth year is checked against the current year by the router; the stored bound stays open-ended.
ALTER TABLE social.profile DROP CONSTRAINT IF EXISTS social_profile_birth_year;
ALTER TABLE social.profile ADD CONSTRAINT social_profile_birth_year CHECK (birth_year >= 1920);
CREATE INDEX IF NOT EXISTS social_member_attended ON social.member(user_id, attended) WHERE attended IS NOT NULL;

CREATE TABLE IF NOT EXISTS social.kaki_say (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  by_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  group_id uuid REFERENCES social."group"(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 80),
  shown boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (about_id, by_id, group_id)
);
CREATE INDEX IF NOT EXISTS social_kaki_say_about ON social.kaki_say(about_id, shown);
GRANT SELECT, INSERT, UPDATE, DELETE ON social.face, social.kaki_say TO quintaste_app;

-- Tablemates report no-shows; one report counts at a table of two, two reports otherwise (see noShowSql in rules.mjs).
CREATE TABLE IF NOT EXISTS social.no_show (
  group_id uuid NOT NULL REFERENCES social."group"(id) ON DELETE CASCADE,
  about_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  by_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, about_id, by_id)
);
CREATE INDEX IF NOT EXISTS social_no_show_about ON social.no_show(about_id, created_at);
-- Seat hold: when only a woman can take the last seat of an open table, it is held for her for 24 hours. After that the
-- one woman seated may open it to anyone (balance_ok_by); the balance rule never relaxes without her say.
ALTER TABLE social."group" ADD COLUMN IF NOT EXISTS hold_until timestamptz, ADD COLUMN IF NOT EXISTS balance_ok_by text REFERENCES public."user"(id) ON DELETE SET NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON social.no_show TO quintaste_app;
-- Weekly Vegan/Vegetarian bands for Social area cards, published with the area snapshot (server/areas/snapshot.mjs).
CREATE TABLE IF NOT EXISTS community.area_diet_snapshot (
  week date NOT NULL REFERENCES community.area_snapshot_week(week) ON DELETE CASCADE,
  layer text NOT NULL CHECK (layer IN ('home','work')),
  area_code text NOT NULL CHECK (area_code ~ '^[A-Z]{2,3}$'),
  label text NOT NULL CHECK (label IN ('Vegan','Vegetarian')),
  band text NOT NULL CHECK (band IN ('10+','20+','50+','100+')),
  PRIMARY KEY (week, layer, area_code, label)
);
GRANT SELECT, INSERT, DELETE ON community.area_diet_snapshot TO quintaste_app;
COMMIT;
