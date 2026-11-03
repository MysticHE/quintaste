"""QT Videomaker: writes members' AI recipes for the app (owner request, 21 Oct 2026).

The app worker hands each job to the bots when the `ai_recipes_bots` control is on (server/ai-recipes/bots.mjs). This
bridge claims one task at a time from the signed app routes, downloads its video if there is one, runs Hermes as the
qt-videomaker profile (video tasks: the `video` toolset, so video_analyze watches the file; dish requests: the `web`
toolset), and posts the recipe JSON or a failure back. The app checks, photographs and saves the answer. Nothing here
publishes, and nothing falls back to another model: a failure is reported as a failure.

It also answers Find More With AI for ingredient swaps (3 Nov 2026, server/swaps/ai.mjs): the app sends one recipe line, its
role and up to ten library candidates; the model picks at most three with a reason, and the app builds and checks every option
itself. Swap asks go first, since a member waits for them in the app; no tools are given for them.

Run as a long-lived process (`python ai_recipes_bridge.py`), or `--once` for a single claim. Several bridges can run at
once: the app hands each task to exactly one of them.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import shutil
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
from app_signing import open_signed  # noqa: E402  (the shared signer)
import hermes_run  # noqa: E402  (the shared Hermes runner)
PROFILE = 'qt-videomaker'
ROUTES = ('/api/ai-recipes/bot/claim', '/api/ai-recipes/bot/tasks/', '/api/swaps/bot/claim', '/api/swaps/bot/tasks/')
MAX_VIDEO = 32 * 1024 * 1024
RUN_SECONDS, MAX_TURNS, IDLE_SECONDS = 900, 30, 10
MAX_ANSWER = 230_000  # the app accepts 240 KB of answer
SWAP_SECONDS, SWAP_TURNS, MAX_SWAP_ANSWER = 180, 2, 11_000  # the app accepts 12 KB
DISCOVERY = ('tool_search', 'tool_describe')
ALLOWED = {'video': ('video_analyze',) + DISCOVERY, 'web': ('web_search', 'web_extract') + DISCOVERY}


def signed(method: str, route: str, data=None, save_to: Path | None = None):
    """One signed call to the app. Returns parsed JSON, or the number of bytes written when `save_to` is given."""
    if not route.startswith(ROUTES):
        raise ValueError('Unapproved app route')
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode() if data is not None else b''
    with open_signed(ROOT, method, route, raw) as response:
        if save_to is None:
            return json.loads(response.read(1_000_001))
        written = 0
        with save_to.open('wb') as out:
            while chunk := response.read(1 << 20):
                written += len(chunk)
                if written > MAX_VIDEO:
                    raise ValueError('video larger than the bridge accepts')
                out.write(chunk)
        return written


def reserve():
    """Every model call is checked and ledgered through the team's own reserve() (state/usage.jsonl), so any daily or
    monthly cap the owner sets in policy.json applies to members' AI recipes too. Raises when a cap is reached."""
    import workflow
    workflow.reserve(json.loads((ROOT / 'policy.json').read_text(encoding='utf-8')), 'model')


def prompt_for(task: dict, video: Path | None) -> str:
    brief = task['brief']
    if task['kind'] == 'video' and video:
        how = ('Watch the video with the video_analyze tool, video_url set to the absolute path ' + str(video) + '. '
               'Ask it for every step in order with the second it starts and a second where a still frame shows that step clearly, '
               'every ingredient with the amount shown, spoken or written on screen, and the second that best shows the finished dish. '
               'Call it exactly once (each call is billed per second of video), asking for everything in that one question. Write the recipe from what it reports.')
    else:
        how = 'Research with web_search and read pages with web_extract (at most about 12 calls).'
    return (brief['system'] + '\n\n' + how + '\n\nTask: ' + brief['prompt'] + '\n\nReturn ONLY one JSON object, no Markdown: '
            'the recipe matching this JSON Schema, or {"error": "<short reason>"} when you cannot do it.\n'
            + json.dumps(brief['schema'], ensure_ascii=False))


def run_hermes(prompt: str, folder: Path, toolset: str):
    final, events = hermes_run.run(PROFILE, prompt, folder, toolset=toolset, allowed=ALLOWED[toolset], seconds=RUN_SECONDS,
                                   turns=MAX_TURNS, grace=90, reserve=reserve)
    if toolset == 'video' and not any(e.get('type') == 'tool_use' and e.get('name') == 'video_analyze' for e in events) \
            and '"error"' not in final.get('text', ''):
        raise RuntimeError('video_analyze was not called')
    return final, events


parse = hermes_run.parse


def sources(events) -> list[str]:
    """HTTPS pages actually read with web_extract, for the recipe's credit list."""
    urls = []
    for e in events:
        if e.get('type') == 'tool_use' and e.get('name') == 'web_extract':
            for url in (e.get('input') or {}).get('urls') or [(e.get('input') or {}).get('url')]:
                if isinstance(url, str) and url.startswith('https://') and url not in urls:
                    urls.append(url)
    return urls[:6]


def handle(task: dict) -> dict:
    folder = ROOT / 'ai-recipes' / dt.date.today().isoformat() / task['id']
    folder.mkdir(parents=True, exist_ok=True)
    video = None
    try:
        if task['kind'] == 'video' and not task.get('video'):
            return {'error': 'no video file'}  # the app sends none; never spend a model run on it
        if task['kind'] == 'video':
            ext = {'video/webm': '.webm', 'video/quicktime': '.mov'}.get(task['video'].get('mimeType'), '.mp4')
            video = folder / ('video' + ext)
            signed('GET', task['video']['path'], save_to=video)
        toolset = 'video' if task['kind'] == 'video' else 'web'
        final, events = run_hermes(prompt_for(task, video), folder, toolset)
        answer = parse(final.get('text', ''))
        if 'error' in answer and 'steps' not in answer:
            return {'error': str(answer['error'])[:280]}
        tokens = final.get('tokens') or {}
        return {'recipe': answer, 'sources': sources(events),
                'usage': {'model': PROFILE, 'input': tokens.get('input', 0) if isinstance(tokens, dict) else 0,
                          'output': tokens.get('output', 0) if isinstance(tokens, dict) else 0}}
    except Exception as exc:  # reported to the app as the job's failure
        return {'error': (type(exc).__name__ + ': ' + str(exc))[:280]}
    finally:
        if video and video.exists():
            video.unlink()


def post(route: str, answer: dict):
    """Sends an answer, retrying server errors and network trouble; a 4xx means the app will never take it."""
    for wait in (5, 15, 45, None):
        try:
            signed('POST', route, answer)
            return
        except urllib.error.HTTPError as exc:
            if exc.code < 500 or wait is None:
                raise
        except (urllib.error.URLError, OSError):
            if wait is None:
                raise
        time.sleep(wait)


def handle_swap(task: dict) -> dict:
    """Picks for one swap ask: {"picks": [...], "newItems": [...]} or {"error": ...}. The app keeps only candidates it sent."""
    folder = ROOT / 'ai-recipes' / 'swaps' / dt.date.today().isoformat() / task['id']
    folder.mkdir(parents=True, exist_ok=True)
    try:
        brief = task['brief']
        prompt = (brief['system'] + '\n\n' + brief['prompt'] + '\n\nReturn ONLY one JSON object, no Markdown, matching this JSON Schema, '
                  'or {"error": "<short reason>"} when you cannot answer:\n' + json.dumps(brief['schema'], ensure_ascii=False))
        final, _events = hermes_run.run(PROFILE, prompt, folder, toolset='web', allowed=DISCOVERY, seconds=SWAP_SECONDS, turns=SWAP_TURNS,
                                        grace=30, reserve=reserve, keep=False)
        shutil.rmtree(folder, ignore_errors=True)  # a successful run leaves nothing; a failed one keeps its logs
        answer = parse(final.get('text', ''))
        if 'error' in answer and 'picks' not in answer:
            return {'error': str(answer['error'])[:280]}
        candidates = set(task.get('candidates') or [])
        picks = [p for p in answer.get('picks') or [] if isinstance(p, dict) and p.get('key') in candidates][:3]
        return {'picks': picks, 'newItems': [str(v)[:60] for v in answer.get('newItems') or [] if isinstance(v, str)][:3]}
    except Exception as exc:  # reported to the app as the ask's failure
        return {'error': (type(exc).__name__ + ': ' + str(exc))[:280]}


def swap_once() -> bool:
    try:
        task = signed('POST', '/api/swaps/bot/claim', {}).get('task')
    except urllib.error.HTTPError as exc:
        if exc.code == 404:  # an app build without swap asks (older image, rollback): recipe tasks still run
            return False
        raise
    if not task:
        return False
    answer = handle_swap(task)
    if len(json.dumps(answer, ensure_ascii=False).encode()) > MAX_SWAP_ANSWER:
        answer = {'error': 'swap answer too large'}
    post('/api/swaps/bot/tasks/' + task['id'] + '/result', answer)
    return True


def once() -> bool:
    task = signed('POST', '/api/ai-recipes/bot/claim', {}).get('task')
    if not task:
        return False
    answer = handle(task)
    (ROOT / 'ai-recipes' / 'last.json').write_text(json.dumps({'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'id': task['id'],
        'kind': task['kind'], 'ok': 'error' not in answer, 'error': answer.get('error')}, indent=2), encoding='utf-8')
    if len(json.dumps(answer, ensure_ascii=False).encode()) > MAX_ANSWER:
        answer = {'error': 'recipe answer too large'}
    post('/api/ai-recipes/bot/tasks/' + task['id'] + '/result', answer)
    # Counts for the Mochi kitchen page (no ids): only answers the app received, judged by what was finally sent.
    with (ROOT / 'ai-recipes' / 'done.jsonl').open('a', encoding='utf-8') as ledger:
        ledger.write(json.dumps({'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'ok': 'error' not in answer}) + '\n')
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if shutil.which('hermes') is None:
        sys.exit('hermes is not on PATH')
    if args.once:
        print('claimed' if swap_once() or once() else 'no task')
        return
    while True:
        try:
            if not (swap_once() or once()):
                time.sleep(IDLE_SECONDS)
        except (urllib.error.URLError, OSError, ValueError) as exc:
            print('bridge error:', type(exc).__name__, str(exc)[:200], file=sys.stderr, flush=True)
            time.sleep(30)


if __name__ == '__main__':
    main()
