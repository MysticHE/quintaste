#!/bin/bash
set -euo pipefail
umask 077
cd /docker/quintaste
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dump="backups/${stamp}.sql.gz"
docker compose -f compose.yml exec -T db pg_dump -U quintaste -d quintaste | gzip > "${dump}.pending"
gzip -t "${dump}.pending"
mv "${dump}.pending" "$dump"
tar -czf "backups/${stamp}-state.tar.gz" state/places-allowance.json state/google-usage.json
find /docker/quintaste/backups -maxdepth 1 -type f -mtime +6 -delete
