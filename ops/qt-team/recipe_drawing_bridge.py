"""QT Gamer draws the step pictures of members' AI recipes (owner, 31 Oct 2026: Gemini no longer draws them).

The app queues one drawing per recipe step that has no video frame (server/ai-recipes/drawings.mjs). This bridge claims one
at a time over the signed app routes (/api/ai-recipes/bot/drawings/*), has QT Gamer draw it through Hermes's own image tool
(image_worker.py, the same call Mango's recipe pictures use, on the team's ChatGPT plan), and posts the picture back, or a
failure. The app checks every drawing against its step before attaching it and asks for one redraw of a picture that does
not fit. Nothing here publishes, and no other image model is ever tried: a failure is reported as a failure.

Run with Hermes's Python as the hermes user: `python recipe_drawing_bridge.py` (long-lived; qt-recipe-drawings.service)
or `--once` for a single claim.
"""
from __future__ import annotations
import argparse
import base64
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import urllib.error

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
from app_signing import open_signed  # noqa: E402  (the shared signer)
ROUTE = '/api/ai-recipes/bot/drawings/'
DRAW_SECONDS, IDLE_SECONDS = 900, 20
MAX_PICTURE = 700_000  # the app accepts 1 MB of base64


def signed(route: str, data=None):
    """One signed POST to the app (server/bot-signature.mjs). Returns parsed JSON."""
    if not route.startswith(ROUTE):
        raise ValueError('Unapproved app route')
    raw = json.dumps(data, separators=(',', ':'), ensure_ascii=False).encode() if data is not None else b''
    try:
        with open_signed(ROOT, 'POST', route, raw) as response:
            return json.loads(response.read(100_001))
    except urllib.error.HTTPError as exc:
        if exc.code == 409:  # the drawing was taken back (answer too late); nothing to do
            return {'ok': False}
        raise


def reserve():
    """Ledgered with the team's other pictures (state/usage.jsonl), under any monthly image cap set in policy.json."""
    import workflow
    workflow.reserve(json.loads((ROOT / 'policy.json').read_text(encoding='utf-8')), 'image')


def draw(drawing: dict) -> dict:
    """One picture through image_worker.py; returns the app's answer: {'image': base64} or {'error': reason}."""
    folder = ROOT / 'images' / ('ai-drawing-' + drawing['id'])
    shutil.rmtree(folder, ignore_errors=True)
    folder.mkdir(parents=True)
    try:
        try:
            reserve()
        except RuntimeError as exc:
            return {'error': str(exc)[:200]}
        (folder / 'request.json').write_text(json.dumps({'prompt': drawing['prompt'], 'step': 1, 'kind': 'ai-recipe-step',
                                                         'requestHash': 'ai-drawing-' + drawing['id']}), encoding='utf-8')
        with (folder / 'worker.log').open('w') as log:
            proc = subprocess.Popen([sys.executable, str(ROOT / 'image_worker.py'), str(folder / 'request.json')],
                                    stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                status = proc.wait(timeout=DRAW_SECONDS)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
                return {'error': 'QT Gamer did not finish the drawing in time'}
        picture = folder / 'candidate.jpg'
        if status or not picture.is_file():
            failure = folder / 'failure.json'
            reason = json.loads(failure.read_text()).get('error', '') if failure.is_file() else ''
            return {'error': ('QT Gamer could not draw it: ' + reason)[:300]}
        data = picture.read_bytes()
        if len(data) > MAX_PICTURE:
            return {'error': 'drawing too large'}
        return {'image': base64.b64encode(data).decode()}
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def once() -> bool:
    """Claims and answers one drawing. Returns False when there was nothing to draw."""
    drawing = signed(ROUTE + 'claim', {}).get('drawing')
    if not drawing:
        return False
    started = time.monotonic()
    answer = draw(drawing)
    result = signed(f"{ROUTE}{drawing['id']}/answer", answer)
    print(json.dumps({'drawing': drawing['id'], 'drawn': 'image' in answer, 'error': answer.get('error'), 'accepted': result.get('ok'),
                      'seconds': round(time.monotonic() - started)}), flush=True)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true', help='claim and answer at most one drawing, then exit')
    if parser.parse_args().once:
        print('drew one' if once() else 'nothing to draw')
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
