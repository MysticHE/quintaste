CREATE SCHEMA IF NOT EXISTS avatar;
CREATE TABLE IF NOT EXISTS avatar.job (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued','working','complete','failed','cancelled')),
  completed smallint NOT NULL DEFAULT 0 CHECK (completed BETWEEN 0 AND 4),
  message text,
  consent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  UNIQUE(user_id, request_id)
);
CREATE INDEX IF NOT EXISTS avatar_job_created ON avatar.job(created_at);
CREATE INDEX IF NOT EXISTS avatar_job_pending ON avatar.job(status,created_at);
CREATE TABLE IF NOT EXISTS avatar.budget (
  day date NOT NULL,
  scope text NOT NULL,
  attempts integer NOT NULL CHECK (attempts > 0),
  PRIMARY KEY(day,scope)
);
CREATE TABLE IF NOT EXISTS avatar.throttle (
  scope text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 1
);
INSERT INTO ops.control(key,enabled,notice) VALUES('avatars',false,'Avatar generation is being prepared.') ON CONFLICT DO NOTHING;
GRANT USAGE ON SCHEMA avatar TO quintaste_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA avatar TO quintaste_app;
GRANT INSERT ON ops.case_record TO quintaste_app;
GRANT SELECT(id,subject_id,created_at,kind) ON ops.case_record TO quintaste_app;
