-- Creator library v1 (docs/COOKER_CREATOR_LIBRARY_PLAN.md, 21 October 2026): vegetarian and vegan recipe creators, their public
-- channels and every recipe page QT Cooker has looked at. Staff edit creators in the admin console; the bot reads and writes only
-- through the signed routes in server/creators/bot-router.mjs. Apply with the operations role after a backup. Additive and repeatable.
-- Rollback: restore the previous app image; leave these tables (older images never read them).
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS creators;

-- A person or organisation that publishes recipes. diets are the creator's own focus (a general creator has none); region ranks
-- Singapore first, then Asia, then worldwide (owner, 21 Oct 2026). invite is for later outreach, which the owner approves.
CREATE TABLE IF NOT EXISTS creators.creator (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  kind text NOT NULL DEFAULT 'person' CHECK (kind IN ('person','organisation')),
  country text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  region text NOT NULL DEFAULT 'world' CHECK (region IN ('singapore','asia','world')),
  languages text[] NOT NULL DEFAULT '{}' CHECK (cardinality(languages) <= 6),
  diets text[] NOT NULL DEFAULT '{}' CHECK (diets <@ ARRAY['vegan','vegetarian','five-pungent-free','buddhist','jain']::text[]),
  cuisines text[] NOT NULL DEFAULT '{}' CHECK (cardinality(cuisines) <= 8),
  website text CHECK (website IS NULL OR (website ~ '^https://[^\s]+$' AND length(website) <= 300)),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','blocked')),
  pinned boolean NOT NULL DEFAULT false,
  invite text NOT NULL DEFAULT 'not-yet' CHECK (invite IN ('not-yet','ready','invited','declined')),
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  found_by text NOT NULL DEFAULT 'staff' CHECK (found_by IN ('seed','scout','cooker','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creators_creator_rank ON creators.creator(status, pinned DESC, region);

-- One public account or site per platform. followers and posts are what the public page showed when checked.
CREATE TABLE IF NOT EXISTS creators.channel (
  creator_id text NOT NULL REFERENCES creators.creator(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('website','youtube','instagram','tiktok','facebook','xiaohongshu','pinterest','other')),
  handle text NOT NULL CHECK (length(btrim(handle)) BETWEEN 1 AND 120),
  url text NOT NULL CHECK (url ~ '^https://[^\s]+$' AND length(url) <= 300),
  followers integer CHECK (followers IS NULL OR followers >= 0),
  posts integer CHECK (posts IS NULL OR posts >= 0),
  checked_at timestamptz,
  checked_by text NOT NULL DEFAULT 'staff' CHECK (checked_by IN ('seed','scout','staff')),
  evidence_url text CHECK (evidence_url IS NULL OR (evidence_url ~ '^https://[^\s]+$' AND length(evidence_url) <= 600)),
  PRIMARY KEY (creator_id, platform, handle)
);
CREATE INDEX IF NOT EXISTS creators_channel_platform ON creators.channel(platform);

-- Every recipe page QT Cooker looked at, keyed like recipe_quality.page_key (host without www + path without a trailing slash), so
-- a page is drafted once and keeps one recipe id. coverage is the share of ingredient weight the nutrition table matched.
CREATE TABLE IF NOT EXISTS creators.recipe_source (
  page_key text PRIMARY KEY CHECK (length(page_key) BETWEEN 3 AND 400),
  url text NOT NULL CHECK (url ~ '^https://[^\s]+$' AND length(url) <= 600),
  creator_id text REFERENCES creators.creator(id) ON DELETE SET NULL,
  platform text NOT NULL DEFAULT 'website' CHECK (platform IN ('website','youtube','instagram','tiktok','facebook','xiaohongshu','pinterest','other')),
  name text NOT NULL DEFAULT '' CHECK (length(name) <= 160),
  recipe_id text CHECK (recipe_id IS NULL OR recipe_id ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  status text NOT NULL CHECK (status IN ('shortlisted','rejected','drafted','held','published','withdrawn')),
  reasons text[] NOT NULL DEFAULT '{}' CHECK (cardinality(reasons) <= 8),
  coverage numeric(4,3) CHECK (coverage IS NULL OR coverage BETWEEN 0 AND 1),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creators_source_creator ON creators.recipe_source(creator_id, status);
CREATE INDEX IF NOT EXISTS creators_source_status ON creators.recipe_source(status, last_seen DESC);

-- Each creator's track record, for ranking and the admin list.
CREATE OR REPLACE VIEW creators.score AS
  SELECT c.id AS creator_id,
    count(s.*) FILTER (WHERE s.status <> 'rejected')::int AS passed,
    count(s.*) FILTER (WHERE s.status = 'published')::int AS published,
    count(s.*) FILTER (WHERE s.status = 'held')::int AS held,
    count(s.*) FILTER (WHERE s.status = 'rejected')::int AS rejected,
    round(avg(s.coverage), 3) AS coverage,
    max(s.last_seen) FILTER (WHERE s.status = 'published') AS last_published
  FROM creators.creator c LEFT JOIN creators.recipe_source s ON s.creator_id = c.id
  GROUP BY c.id;

-- Seed: the well-known creators Cooker already ranks first (ops/qt-team/trusted_creators.json, owner, 18 Oct 2026).
INSERT INTO creators.creator (id, name, kind, country, region, diets, cuisines, website, found_by) VALUES
  ('noob-cook', 'Noob Cook', 'person', 'SG', 'singapore', '{}', '{singaporean,chinese}', 'https://noobcook.com', 'seed'),
  ('tzu-chi-singapore', 'Tzu Chi Singapore', 'organisation', 'SG', 'singapore', '{vegetarian,buddhist}', '{chinese}', 'https://tzuchi.org.sg', 'seed'),
  ('healthhub', 'HealthHub (Health Promotion Board)', 'organisation', 'SG', 'singapore', '{}', '{singaporean}', 'https://healthhub.sg', 'seed'),
  ('rasa-malaysia', 'Rasa Malaysia', 'person', NULL, 'asia', '{}', '{malaysian,chinese}', 'https://rasamalaysia.com', 'seed'),
  ('roti-n-rice', 'Roti n Rice', 'person', NULL, 'asia', '{}', '{malaysian}', 'https://rotinrice.com', 'seed'),
  ('huang-kitchen', 'Huang Kitchen', 'person', NULL, 'asia', '{}', '{malaysian,chinese}', 'https://huangkitchen.com', 'seed'),
  ('woon-heng', 'Woon Heng', 'person', NULL, 'asia', '{vegan}', '{malaysian,chinese}', 'https://woonheng.com', 'seed'),
  ('just-one-cookbook', 'Just One Cookbook', 'person', NULL, 'asia', '{}', '{japanese}', 'https://justonecookbook.com', 'seed'),
  ('okonomi-kitchen', 'Okonomi Kitchen', 'person', NULL, 'asia', '{vegan}', '{japanese}', 'https://okonomikitchen.com', 'seed'),
  ('the-woks-of-life', 'The Woks of Life', 'person', NULL, 'asia', '{}', '{chinese}', 'https://thewoksoflife.com', 'seed'),
  ('omnivores-cookbook', 'Omnivore''s Cookbook', 'person', NULL, 'asia', '{}', '{chinese}', 'https://omnivorescookbook.com', 'seed'),
  ('red-house-spice', 'Red House Spice', 'person', NULL, 'asia', '{}', '{chinese}', 'https://redhousespice.com', 'seed'),
  ('wok-and-kin', 'Wok and Kin', 'person', NULL, 'asia', '{}', '{chinese}', 'https://wokandkin.com', 'seed'),
  ('china-sichuan-food', 'China Sichuan Food', 'person', NULL, 'asia', '{}', '{chinese}', 'https://chinasichuanfood.com', 'seed'),
  ('made-with-lau', 'Made With Lau', 'person', NULL, 'asia', '{}', '{chinese}', 'https://madewithlau.com', 'seed'),
  ('tiffy-cooks', 'Tiffy Cooks', 'person', NULL, 'asia', '{}', '{chinese,taiwanese}', 'https://tiffycooks.com', 'seed'),
  ('daily-cooking-quest', 'Daily Cooking Quest', 'person', NULL, 'asia', '{}', '{indonesian}', 'https://dailycookingquest.com', 'seed'),
  ('veg-recipes-of-india', 'Veg Recipes of India', 'person', NULL, 'asia', '{vegetarian}', '{indian}', 'https://vegrecipesofindia.com', 'seed'),
  ('hebbars-kitchen', 'Hebbar''s Kitchen', 'person', NULL, 'asia', '{vegetarian}', '{indian}', 'https://hebbarskitchen.com', 'seed'),
  ('swasthis-recipes', 'Swasthi''s Recipes', 'person', NULL, 'asia', '{}', '{indian}', 'https://indianhealthyrecipes.com', 'seed'),
  ('archanas-kitchen', 'Archana''s Kitchen', 'person', NULL, 'asia', '{vegetarian}', '{indian}', 'https://archanaskitchen.com', 'seed'),
  ('rainbow-plant-life', 'Rainbow Plant Life', 'person', NULL, 'world', '{vegan}', '{}', 'https://rainbowplantlife.com', 'seed'),
  ('minimalist-baker', 'Minimalist Baker', 'person', NULL, 'world', '{vegan}', '{}', 'https://minimalistbaker.com', 'seed'),
  ('cheap-lazy-vegan', 'Cheap Lazy Vegan', 'person', NULL, 'world', '{vegan}', '{asian}', 'https://cheaplazyvegan.com', 'seed'),
  ('bbc-good-food', 'BBC Good Food', 'organisation', NULL, 'world', '{}', '{}', 'https://bbcgoodfood.com', 'seed'),
  ('serious-eats', 'Serious Eats', 'organisation', NULL, 'world', '{}', '{}', 'https://seriouseats.com', 'seed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO creators.channel (creator_id, platform, handle, url, checked_by)
  SELECT id, 'website', regexp_replace(website, '^https://', ''), website, 'seed' FROM creators.creator WHERE found_by = 'seed' AND website IS NOT NULL
ON CONFLICT DO NOTHING;

GRANT USAGE ON SCHEMA creators TO quintaste_app;
GRANT SELECT, INSERT, UPDATE ON creators.creator, creators.channel, creators.recipe_source TO quintaste_app;
GRANT SELECT ON creators.score TO quintaste_app;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quintaste_admin') THEN
    GRANT USAGE ON SCHEMA creators TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE ON creators.creator TO quintaste_admin;
    GRANT SELECT, INSERT, UPDATE, DELETE ON creators.channel TO quintaste_admin;
    GRANT SELECT ON creators.recipe_source, creators.score TO quintaste_admin;
  END IF;
END $$;
COMMIT;
