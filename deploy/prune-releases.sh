#!/usr/bin/env bash
# Keeps the newest QuinTaste releases on the VPS and removes older archives, extracted folders and images.
# Never touches images used by running containers, other projects, volumes, the database or rollback snapshots.
# Usage: prune-releases.sh [--apply] [keep-count]   (dry run unless --apply)
set -euo pipefail
cd /docker/quintaste
APPLY=false; [[ "${1:-}" == "--apply" ]] && { APPLY=true; shift; }
KEEP="${1:-3}"
[[ "$KEEP" =~ ^[0-9]+$ && "$KEEP" -ge 2 ]] || { echo "Keep at least 2 releases"; exit 2; }

# Releases ordered newest first by archive time.
mapfile -t releases < <(ls -t releases/*.tgz 2>/dev/null | sed 's#^releases/##; s#\.tgz$##')
declare -A keep=()
for id in "${releases[@]:0:$KEEP}"; do keep["$id"]=1; done
# Anything a container currently runs is always kept.
while read -r image; do
  [[ "$image" =~ ^quintaste-(app|preview|admin):(.+)$ ]] && keep["${BASH_REMATCH[2]}"]=1
done < <(docker ps -a --format '{{.Image}}')
# The previous image selectors in the newest rollback snapshot stay available for rollback.
latest_snapshot=$(ls -td deployment-backups/*/ 2>/dev/null | head -1)
if [[ -n "$latest_snapshot" && -f "$latest_snapshot/.env" ]]; then
  while read -r tag; do keep["$tag"]=1; done < <(grep -E '^(APP|PREVIEW|ADMIN)_IMAGE=' "$latest_snapshot/.env" | sed -E 's/^[A-Z_]+=quintaste-[a-z]+://')
fi
echo "Keeping: ${!keep[*]}"

run() { if $APPLY; then "$@"; else echo "would run: $*"; fi; }
while read -r ref; do
  tag="${ref#*:}"
  [[ -n "${keep[$tag]:-}" ]] && continue
  run docker rmi "$ref"
done < <(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E '^quintaste-(app|preview|admin):' || true)
for id in "${releases[@]}"; do
  [[ -n "${keep[$id]:-}" ]] && continue
  run rm -f "releases/$id.tgz"
  [[ -d "releases/$id" ]] && run rm -rf "releases/$id"
done
df -h / | tail -1
