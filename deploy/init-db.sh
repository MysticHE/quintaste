#!/bin/bash
set -euo pipefail
psql -v ON_ERROR_STOP=1 -v app_password="$APP_DB_PASSWORD" -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
CREATE ROLE quintaste_app WITH LOGIN PASSWORD :'app_password';
ALTER DATABASE quintaste OWNER TO quintaste_app;
GRANT ALL ON SCHEMA public TO quintaste_app;
SQL
