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
# `keep`: release ids whose archive and folder stay. `keepImage`: exact images that stay besides the newest releases' ones,
# so an admin release that is still running does not also keep that release's unused app and preview images.
declare -A keep=() newest=() keepImage=()
for id in "${releases[@]:0:$KEEP}"; do keep["$id"]=1; newest["$id"]=1; done
# Anything a container currently runs is always kept.
while read -r image; do
  [[ "$image" =~ ^quintaste-(app|preview|admin):(.+)$ ]] && { keep["${BASH_REMATCH[2]}"]=1; keepImage["$image"]=1; }
done < <(docker ps -a --format '{{.Image}}')
# The previous image selectors in the newest rollback snapshot stay available for rollback. No `| head` here: with hundreds of
# snapshots it closes the pipe early, ls dies of SIGPIPE (141) and pipefail stops the script before it prints anything.
mapfile -t snapshots < <(ls -td deployment-backups/*/ 2>/dev/null)
latest_snapshot="${snapshots[0]:-}"
if [[ -n "$latest_snapshot" && -f "$latest_snapshot/.env" ]]; then
  while read -r image; do keep["${image#*:}"]=1; keepImage["$image"]=1; done < <(grep -E '^(APP|PREVIEW|ADMIN)_IMAGE=' "$latest_snapshot/.env" | sed -E 's/^[A-Z_]+=//')
fi
echo "Keeping: ${!keep[*]}"

run() { if $APPLY; then "$@"; else echo "would run: $*"; fi; }
while read -r ref; do
  [[ -n "${newest[${ref#*:}]:-}" || -n "${keepImage[$ref]:-}" ]] && continue
  run docker rmi "$ref"
done < <(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E '^quintaste-(app|preview|admin):' || true)
for id in "${releases[@]}"; do
  [[ -n "${keep[$id]:-}" ]] && continue
  run rm -f "releases/$id.tgz"
done
# Extracted release folders (and a manual release's "-files" folder) not kept, including ones whose archive is already gone.
for dir in releases/*/; do
  name="${dir#releases/}"; name="${name%/}"
  [[ "$name" =~ ^[0-9]{8}-[A-Za-z0-9.-]+$ ]] || continue
  [[ -n "${keep[${name%-files}]:-}" ]] && continue
  run rm -rf "releases/$name"
done
df -h / | tail -1
