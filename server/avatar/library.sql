CREATE TABLE IF NOT EXISTS avatar.saved (
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  payload bytea NOT NULL CHECK (octet_length(payload) <= 900000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,id)
);
CREATE TABLE IF NOT EXISTS avatar.preference (
  user_id text PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
  selected text NOT NULL DEFAULT 'default',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON avatar.saved,avatar.preference TO quintaste_app;
