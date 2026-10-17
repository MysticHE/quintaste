CREATE SCHEMA IF NOT EXISTS account_access;
CREATE TABLE IF NOT EXISTS account_access.master_identity (
  email text PRIMARY KEY,
  google_subject text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Pin the explicitly authorized owner to the Google identity already verified by staff login.
INSERT INTO account_access.master_identity(email,google_subject)
SELECT email,subject FROM staff.member
WHERE email='hui.en194@gmail.com' AND active AND role='owner' AND subject IS NOT NULL
ON CONFLICT(email) DO NOTHING;
GRANT USAGE ON SCHEMA account_access TO quintaste_app;
GRANT SELECT ON account_access.master_identity TO quintaste_app;

CREATE SCHEMA IF NOT EXISTS customer_oauth;
CREATE TABLE IF NOT EXISTS customer_oauth.flow (
  id uuid PRIMARY KEY,
  launch_hash text NOT NULL UNIQUE,
  proof_hash text NOT NULL,
  browser_hash text,
  platform text NOT NULL CHECK(platform IN ('web','native')),
  return_to text NOT NULL DEFAULT '/account',
  display_code text NOT NULL,
  phase text NOT NULL DEFAULT 'created' CHECK(phase IN ('created','opened','ready')),
  ticket text,
  user_id text REFERENCES public."user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes'
);
ALTER TABLE customer_oauth.flow ADD COLUMN IF NOT EXISTS return_to text NOT NULL DEFAULT '/account';
ALTER TABLE customer_oauth.flow ADD COLUMN IF NOT EXISTS return_url text;
ALTER TABLE customer_oauth.flow ADD COLUMN IF NOT EXISTS callback_hash text;
CREATE INDEX IF NOT EXISTS customer_oauth_expiry ON customer_oauth.flow(expires_at);
GRANT USAGE ON SCHEMA customer_oauth TO quintaste_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON customer_oauth.flow TO quintaste_app;
