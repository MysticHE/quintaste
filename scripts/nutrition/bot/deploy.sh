#!/bin/sh
# Deploys the QT bot's nutrition v2 files on the VPS (run as root on srv1902914, from any folder).
# Backup first, install with the folder's root-owned read-only convention, run the bot tests in the Hermes
# container, record hashes. Revert = copy the backup folder's files back.
# Expects the four files in /root/qt-nutrition-upload/: nutrition.py nutrition_sg.json publisher.py test_nutrition.py
set -eu
QT=/docker/hermes-agent-yril/data/qt-team
UP=/root/qt-nutrition-upload
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BK=$QT/operator-tests/nutrition-table-$STAMP
mkdir -p "$BK"
for f in nutrition.py nutrition_sg.json publisher.py; do cp -p "$QT/$f" "$BK/$f"; done
for f in nutrition.py nutrition_sg.json publisher.py test_nutrition.py; do
  install -o root -g root -m 0444 "$UP/$f" "$QT/$f"
done
docker exec -w /opt/data/qt-team hermes-agent-yril-hermes-agent-1 python3 -m unittest -q > "$BK/tests.txt" 2>&1 || { echo "TESTS FAILED, see $BK/tests.txt"; tail -20 "$BK/tests.txt"; exit 1; }
tail -3 "$BK/tests.txt"
{ echo "{\"deployedAt\":\"$STAMP\",\"backup\":\"$BK\",\"hashes\":{"; first=1; for f in nutrition.py nutrition_sg.json publisher.py test_nutrition.py; do h=$(sha256sum "$QT/$f" | cut -d' ' -f1); [ $first = 1 ] || echo ","; first=0; printf '"%s":"%s"' "$f" "$h"; done; echo "}}"; } > "$BK/release.json"
cat "$BK/release.json"
# Dry run of the backfill: which live recipes would get figures (no publication, no model call).
docker exec -w /opt/data/qt-team hermes-agent-yril-hermes-agent-1 python3 -c "
import publisher as p
live=p.request('GET','/control/state'); c=[]; h=[]
states={(r['kind'],r['id']):r.get('hash') for r in live['records']}
p.nutrition_candidates(live,states,{},c,h)
print('candidates',[(x['id'],x['data']['nutrition']['basis'],x['data']['nutrition']['perServing']['kcal']) for x in c])
print('held',h)
" | tee "$BK/backfill-dry-run.txt"
