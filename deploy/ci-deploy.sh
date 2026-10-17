#!/usr/bin/env bash
# QuinTaste continuous deployment entry point on the VPS (installed as /docker/quintaste/bin/ci-deploy.sh).
# Runs only as the forced command of the CI deploy key: `deploy <release-id> <sha256>` with the release archive on stdin.
# Follows docs/DEPLOYMENT_RUNBOOK.md: verify archive, refuse schema/Compose changes, build, back up, wait for avatar
# jobs, snapshot, promote app/preview (and admin when it changed), health-check, roll back on failure, prune old releases.
set -euo pipefail
umask 077
ROOT=/docker/quintaste
APP_URL=https://quintaste.srv1902914.hstgr.cloud
cd "$ROOT"
log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
# Before promotion a failure removes the received archive and extracted folder (build logs stay for diagnosis).
PROMOTING=false
fail() { log "FAILED: $1"; if ! $PROMOTING && [[ -n "${RELEASE:-}" && "${RECEIVED:-false}" == true ]]; then rm -rf "$ROOT/releases/$RELEASE" "$ROOT/releases/$RELEASE.tgz"; fi; exit "${2:-1}"; }

read -r verb RELEASE SHA extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$verb" == "deploy" && -z "${extra:-}" ]] || fail "Only 'deploy <release> <sha256>' is accepted" 2
[[ "$RELEASE" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$ ]] || fail "Invalid release id" 2
[[ "$SHA" =~ ^[a-f0-9]{64}$ ]] || fail "Invalid archive digest" 2

exec 9> "$ROOT/.ci-deploy.lock"
flock -n 9 || fail "Another deployment is running" 3
[[ ! -e "releases/$RELEASE.tgz" && ! -e "releases/$RELEASE" ]] || fail "Release id already exists" 2

# 1. Receive and verify the archive (at most 1 GiB).
head -c 1073741824 > "releases/$RELEASE.tgz"
actual=$(sha256sum "releases/$RELEASE.tgz" | cut -d' ' -f1)
[[ "$actual" == "$SHA" ]] || { rm -f "releases/$RELEASE.tgz"; fail "Archive digest mismatch" 2; }
mkdir "releases/$RELEASE"
tar -xzf "releases/$RELEASE.tgz" -C "releases/$RELEASE"
RECEIVED=true
log "Received $RELEASE"

# 2. Gates against the live release: schema and Compose changes need the manual runbook procedure.
LIVE=$(docker inspect --format '{{.Config.Image}}' quintaste-staging-app-1 | sed 's/^quintaste-app://')
[[ -d "releases/$LIVE" ]] || fail "Live release folder releases/$LIVE is missing; deploy manually" 4
# Content digests ignore CR line endings: Windows-packaged and CI-packaged releases must compare equal.
digest() { (cd "releases/$1" && find "${@:2}" -type f 2>/dev/null | LC_ALL=C sort | while read -r f; do printf '%s ' "$f"; tr -d '\r' < "$f" | sha256sum; done) | sha256sum | cut -d' ' -f1; }
schema_new=$(digest "$RELEASE" server admin/db -name '*.sql')
schema_live=$(digest "$LIVE" server admin/db -name '*.sql')
[[ "$schema_new" == "$schema_live" ]] || fail "Database schema files changed since $LIVE; apply the migration manually (runbook section 4)" 10
compose_new=$(digest "$RELEASE" deploy -name '*.yml')
compose_live=$(digest "$LIVE" deploy -name '*.yml')
[[ "$compose_new" == "$compose_live" ]] || fail "Compose files changed since $LIVE; review and deploy manually" 11
SERVICES="app preview"
admin_new=$(digest "$RELEASE" admin)
admin_live=$(digest "$LIVE" admin)
[[ "$admin_new" == "$admin_live" ]] || SERVICES="app preview admin"
log "Live $LIVE; updating: $SERVICES"

# 3. Build images sequentially (shared VPS memory).
docker build --target runtime -t "quintaste-app:$RELEASE" "releases/$RELEASE" > "releases/$RELEASE-app.log" 2>&1 || fail "App build failed (releases/$RELEASE-app.log)" 5
log "Built app"
docker build --target preview -t "quintaste-preview:$RELEASE" "releases/$RELEASE" > "releases/$RELEASE-preview.log" 2>&1 || fail "Preview build failed (releases/$RELEASE-preview.log)" 5
log "Built preview"
if [[ "$SERVICES" == *admin* ]]; then
  docker build -f "releases/$RELEASE/admin/Dockerfile" -t "quintaste-admin:$RELEASE" "releases/$RELEASE" > "releases/$RELEASE-admin.log" 2>&1 || fail "Admin build failed" 5
  log "Built admin"
fi

# 4. Backup and wait for active avatar work (up to 10 minutes).
systemctl start quintaste-backup.service
[[ "$(systemctl show -p Result --value quintaste-backup.service)" == "success" ]] || fail "Backup failed" 6
log "Backup complete"
for _ in $(seq 1 60); do
  active=$(docker exec quintaste-staging-db-1 psql -At -U quintaste -d quintaste -c \
    "SELECT count(*) FROM avatar.job WHERE status IN ('queued','working') AND expires_at>now()" < /dev/null)
  [[ "$active" == "0" ]] && break
  sleep 10
done
[[ "$active" == "0" ]] || fail "Avatar jobs still active; try again later" 7

# 5. Rollback snapshot and image selectors.
RELEASE="$RELEASE" SERVICES="$SERVICES" python3 - <<'PY'
import os, pathlib, re, shutil, subprocess
root = pathlib.Path('/docker/quintaste')
release, services = os.environ['RELEASE'], os.environ['SERVICES'].split()
mapping = {'app': ('APP_IMAGE', 'quintaste-app'), 'preview': ('PREVIEW_IMAGE', 'quintaste-preview'), 'admin': ('ADMIN_IMAGE', 'quintaste-admin')}
for service in services:
    subprocess.run(['docker', 'image', 'inspect', mapping[service][1] + ':' + release], stdout=subprocess.DEVNULL, check=True)
snapshot = root / 'deployment-backups' / release
snapshot.parent.mkdir(mode=0o700, exist_ok=True)
snapshot.mkdir(mode=0o700)
for name in ['.env', 'compose.yml', 'admin.compose.yml', 'avatar.compose.yml']:
    shutil.copy2(root / name, snapshot / name)
    (snapshot / name).chmod(0o600)
text = (root / '.env').read_text()
for service in services:
    key, repository = mapping[service]
    text, count = re.subn(r'^' + key + r'=.*$', key + '=' + repository + ':' + release, text, flags=re.M)
    assert count == 1, 'Image selector missing or duplicated'
(root / '.env').write_text(text)
(root / '.env').chmod(0o600)
PY
log "Snapshot saved"

compose() { docker compose -f compose.yml -f admin.compose.yml -f avatar.compose.yml "$@"; }
rollback() {
  log "Rolling back to $LIVE"
  for name in .env compose.yml admin.compose.yml avatar.compose.yml; do cp -p "deployment-backups/$RELEASE/$name" "$name"; done
  compose up -d --no-deps --wait --wait-timeout 240 $SERVICES < /dev/null || true
}

# 6. Promote and verify; any failure restores the previous images.
PROMOTING=true
if ! compose up -d --no-deps --wait --wait-timeout 240 $SERVICES < /dev/null; then rollback; fail "Containers did not become healthy; rolled back" 20; fi
check() { [[ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$APP_URL$1")" == "$2" ]]; }
healthy=true
for attempt in 1 2 3; do
  healthy=true
  check /healthz 200 || healthy=false
  check /api/menus 200 || healthy=false
  entry=$(curl -s --max-time 20 "$APP_URL/" | grep -o '/_expo/static/js/web/entry-[a-f0-9]*\.js' | head -1 || true)
  [[ -n "$entry" ]] && check "$entry" 200 || healthy=false
  $healthy && break
  sleep 10
done
if ! $healthy; then rollback; fail "Live checks failed; rolled back" 21; fi
log "Live checks passed"

# 7. Keep the newest releases only.
"$ROOT/bin/prune-releases.sh" --apply 3 > "releases/$RELEASE-prune.log" 2>&1 || log "Prune reported an error (see releases/$RELEASE-prune.log)"
docker ps --filter name=quintaste-staging --format '{{.Names}} {{.Image}} {{.Status}}'
log "Deployed $RELEASE ($SERVICES)"
