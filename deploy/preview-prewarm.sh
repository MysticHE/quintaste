#!/usr/bin/env bash
# Warm the Expo Go preview after it (re)starts (installed as /docker/quintaste/bin/preview-prewarm.sh).
# Metro compiles each platform on first request (2-3 minutes cold). This requests the Android and iOS manifests and
# downloads each launch bundle through the public preview URL, exactly as Expo Go does, so the first phone open after
# a deploy downloads a ready bundle. Logs HTTP status, time and size only. Exits 0 only when both bundles return 200.
set -uo pipefail
PREVIEW_URL=${PREVIEW_URL:-https://preview-quintaste.srv1902914.hstgr.cloud}
TIMEOUT=${PREWARM_TIMEOUT:-300}
log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

warm() {
  local platform=$1 status=000 bundle result code secs bytes
  # Traefik adds the route a moment after the container turns healthy, so retry the manifest for about a minute.
  for _ in $(seq 1 12); do
    status=$(curl -s -o "$tmp/$platform.json" -w '%{http_code}' --max-time 60 \
      -H "expo-platform: $platform" -H 'accept: application/expo+json,application/json' "$PREVIEW_URL/" || true)
    [[ "$status" == 200 ]] && break
    sleep 5
  done
  [[ "$status" == 200 ]] || { log "Preview $platform manifest HTTP $status"; return 1; }
  bundle=$(python3 - "$tmp/$platform.json" "$PREVIEW_URL/node_modules/" <<'PY'
import json, sys
url = json.load(open(sys.argv[1]))['launchAsset']['url']
print(url if url.startswith(sys.argv[2]) else '')
PY
  ) || bundle=''
  [[ -n "$bundle" ]] || { log "Preview $platform manifest has no launch bundle on $PREVIEW_URL"; return 1; }
  result=$(curl -s -o /dev/null -w '%{http_code} %{time_total} %{size_download}' --max-time "$TIMEOUT" "$bundle" || true)
  read -r code secs bytes <<< "${result:-000 0 0}"
  log "Preview $platform bundle HTTP $code in ${secs}s (${bytes} bytes)"
  [[ "$code" == 200 && "${bytes%.*}" -gt 100000 ]]
}

# Sequential on purpose: Metro compiles in one thread, so Android (the usual test phone) is ready first.
ok=0
for platform in android ios; do warm "$platform" || ok=1; done
exit "$ok"
