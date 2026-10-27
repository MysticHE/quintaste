"""QT Gamer bridge: draws the pictures recipe levels are missing (docs/game/RECIPE_LEVELS_PLAN.md §8.5, Phase 0, 22 Oct 2026).

The app queues one picture job per missing art key (server/game/art.mjs). This bridge claims a job over the signed app
routes, writes a one-picture manifest next to gamer/generate.py, runs QT Gamer's own generator (two variants on the
house style reference) and its quality checks (gamer/process_lite.py: flat background, cut-out, margins, coverage,
colour spill), and posts the sprites that pass as drafts, or a failure naming what went wrong. The app re-checks and
stores them as drafts; the artist approves each one before members see it. Nothing here publishes, and no other image
model is ever tried: a failure is reported as a failure.

Built and checked locally only; not deployed. Run with Hermes's Python (generate.py needs its image provider):
`python game_art_bridge.py` (long-lived) or `--once` for a single claim.
"""
from __future__ import annotations
import argparse
import base64
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
from app_signing import open_signed  # noqa: E402  (the shared signer)
GAMER = Path(__file__).resolve().parent / 'gamer'
ROUTES = ('/api/game-art/bot/claim', '/api/game-art/bot/jobs/')
VARIANTS, TIER, RUN_SECONDS, IDLE_SECONDS = 2, os.environ.get('QT_GAMER_TIER', 'gpt-image-2-high'), 900, 30
MAX_SPRITE = 580_000  # the app accepts 600 KB per variant
# The art kinds the app queues, as QT Gamer style kinds; red subjects are drawn on cyan so the cut-out keeps them.
KINDS = {'ingredient': 'ingredient', 'dish': 'dish', 'station': 'prop', 'prop': 'prop'}
RED = ('red', 'chilli', 'chili', 'tomato', 'strawberr', 'beet', 'sambal')

sys.path.insert(0, str(GAMER))
from process_lite import process  # noqa: E402  (QT Gamer's own checks)


def signed(route: str, data=None):
    """One signed POST to the app (server/bot-signature.mjs). Returns parsed JSON."""
    if not route.startswith(ROUTES):
        raise ValueError('Unapproved app route')
    raw = json.dumps(data, separators=(',', ':')).encode() if data is not None else b''
    try:
        with open_signed(ROOT, 'POST', route, raw) as response:
            return json.loads(response.read(1_000_001))
    except urllib.error.HTTPError as exc:
        if exc.code == 422:  # the app refused every variant; its reasons are in the body
            return json.loads(exc.read(100_000))
        raise


def manifest_for(job: dict) -> dict:
    subject = job['subject'].strip()
    chroma = 'cyan' if any(w in subject.lower() for w in RED) else 'magenta'
    details = job.get('details') or ('One serving, as cooked in a Singapore home kitchen.' if job['kind'] == 'dish' else 'Fresh and recognisable, as sold in a Singapore market.')
    return {'assets': [{'id': job['artKey'], 'kind': KINDS[job['kind']], 'subject': subject, 'details': details, 'chroma': chroma, 'status': 'todo'}]}


def draw(job: dict) -> dict:
    """Runs QT Gamer for one job; returns the answer for the app."""
    run = 'job-' + job['id'][:8]
    manifest = GAMER / f'concepts-{run}.json'
    manifest.write_text(json.dumps(manifest_for(job)), encoding='utf-8')
    try:
        subprocess.run([sys.executable, '-I', str(GAMER / 'generate.py'), '--run', run, '--manifest', manifest.name,
                        '--variants', str(VARIANTS), '--tier', TIER], cwd=GAMER, check=True, timeout=RUN_SECONDS,
                       stdout=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        return {'error': 'QT Gamer did not finish: ' + type(exc).__name__}
    finally:
        manifest.unlink(missing_ok=True)
    style = json.loads((GAMER / 'style.json').read_text(encoding='utf-8'))
    out = GAMER / 'runs' / run / job['artKey']
    variants, issues, provenance = [], [], {}
    for n in range(1, VARIANTS + 1):
        raw, req = out / f'raw-{n}.png', out / f'request-{n}.json'
        if not raw.is_file() or not req.is_file():
            issues.append(f'variant {n}: not generated')
            continue
        meta = json.loads(req.read_text(encoding='utf-8'))
        report, sprite = process(raw, meta, style)
        if not report['ok'] or sprite is None:
            issues.append(f'variant {n}: ' + '; '.join(report['issues']))
            continue
        buf = io.BytesIO()
        sprite.save(buf, 'PNG', optimize=True)
        if buf.tell() > MAX_SPRITE:
            issues.append(f'variant {n}: too large')
            continue
        variants.append(base64.b64encode(buf.getvalue()).decode())
        provenance = {k: meta.get(k) for k in ('prompt', 'tier', 'model', 'provider', 'reference', 'referenceSha256', 'requestedAt', 'seconds', 'rawSha256')}
        provenance['checks'] = {k: report.get(k) for k in ('coverage', 'borderStd', 'spill', 'size')}
    if not variants:
        return {'error': ('no variant passed the checks: ' + ' | '.join(issues))[:300]}
    return {'variants': variants, 'provenance': provenance}


def once() -> bool:
    """Claims and answers one job. Returns False when there was nothing to do."""
    job = signed('/api/game-art/bot/claim', {}).get('job')
    if not job:
        return False
    answer = draw(job)
    result = signed(f"/api/game-art/bot/jobs/{job['id']}/answer", answer)
    print(json.dumps({'job': job['id'], 'artKey': job['artKey'], 'status': result.get('status'), 'kept': len(result.get('variants') or []),
                      'refused': result.get('refused', [])}), flush=True)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--once', action='store_true', help='claim and answer at most one job, then exit')
    args = ap.parse_args()
    if args.once:
        once()
        return
    while True:
        try:
            if not once():
                time.sleep(IDLE_SECONDS)
        except (urllib.error.URLError, OSError, ValueError) as exc:
            print(json.dumps({'error': type(exc).__name__}), flush=True)
            time.sleep(IDLE_SECONDS)


if __name__ == '__main__':
    main()
