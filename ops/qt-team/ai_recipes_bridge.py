"""QT Videomaker: writes members' AI recipes for the app (owner request, 21 Oct 2026).

The app worker hands each job to the bots when the `ai_recipes_bots` control is on (server/ai-recipes/bots.mjs). This
bridge claims one task at a time from the signed app routes, downloads its video if there is one, runs Hermes as the
qt-videomaker profile (video tasks: the `video` toolset, so video_analyze watches the file; dish requests: the `web`
toolset), and posts the recipe JSON or a failure back. The app checks, photographs and saves the answer. Nothing here
publishes, and nothing falls back to another model: a failure is reported as a failure.

Run as a long-lived process (`python ai_recipes_bridge.py`), or `--once` for a single claim. Several bridges can run at
once: the app hands each task to exactly one of them.
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
ORIGIN = os.environ.get('QT_APP_ORIGIN', 'https://quintaste.srv1902914.hstgr.cloud')
PROFILE = 'qt-videomaker'
ROUTES = ('/api/ai-recipes/bot/claim', '/api/ai-recipes/bot/tasks/')
MAX_VIDEO = 32 * 1024 * 1024
RUN_SECONDS, MAX_TURNS, IDLE_SECONDS = 900, 30, 10
MAX_ANSWER = 230_000  # the app accepts 240 KB of answer
DISCOVERY = ('tool_search', 'tool_describe')
ALLOWED = {'video': ('video_analyze',) + DISCOVERY, 'web': ('web_search', 'web_extract') + DISCOVERY}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the signature must never follow a redirect


def signed(method: str, route: str, data=None, save_to: Path | None = None):
    """One signed call to the app. Returns parsed JSON, or the number of bytes written when `save_to` is given."""
    if not route.startswith(ROUTES):
        raise ValueError('Unapproved app route')
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode() if data is not None else b''
    stamp = str(int(time.time()))
    key = (ROOT / 'private/publisher.key').read_text().strip()
    message = stamp + '\n' + method + '\n' + route + '\n' + hashlib.sha256(raw).hexdigest()
    signature = hmac.new(key.encode(), message.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(ORIGIN + route, data=raw if method == 'POST' else None, method=method,
        headers={'Content-Type': 'application/json', 'X-QT-Time': stamp, 'X-QT-Signature': signature})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=60) as response:
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
               'Call it again with a narrower question if something is unclear (at most three calls). Write the recipe from what it reports.')
    else:
        how = 'Research with web_search and read pages with web_extract (at most about 12 calls).'
    return (brief['system'] + '\n\n' + how + '\n\nTask: ' + brief['prompt'] + '\n\nReturn ONLY one JSON object, no Markdown: '
            'the recipe matching this JSON Schema, or {"error": "<short reason>"} when you cannot do it.\n'
            + json.dumps(brief['schema'], ensure_ascii=False))


def run_hermes(prompt: str, folder: Path, toolset: str):
    (folder / 'prompt.txt').write_text(prompt, encoding='utf-8')
    env = {k: v for k, v in os.environ.items() if not k.startswith(('HERMES_CRON_', 'HERMES_SESSION_', 'HERMES_TASK_'))}
    env.update(HERMES_HOME='/opt/data', HERMES_TIMEZONE='Asia/Singapore')
    args = ['hermes', '-p', PROFILE, 'chat', '--query-file', str(folder / 'prompt.txt'), '--oneshot', '--format', 'stream-json',
            '--max-turns', str(MAX_TURNS), '--run-budget', str(RUN_SECONDS), '-t', toolset, '--in', str(folder)]
    reserve()
    with (folder / 'stream.jsonl').open('w', encoding='utf-8') as out, (folder / 'stderr.log').open('w', encoding='utf-8') as err:
        # Its own process group, so a timeout stops Hermes and every tool process it started (as workflow.py does).
        proc = subprocess.Popen(args, stdout=out, stderr=err, env=env, start_new_session=True)
        try:
            proc.wait(timeout=RUN_SECONDS + 90)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
            raise RuntimeError('hermes timed out')
    events = []
    for line in (folder / 'stream.jsonl').read_text(encoding='utf-8').splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    final = next((e for e in reversed(events) if e.get('type') == 'result'), None)
    tools = [e for e in events if e.get('type') == 'tool_use']
    if proc.returncode != 0 or not final or final.get('exit_code') != 0:
        raise RuntimeError('hermes did not complete (exit %s)' % proc.returncode)
    unexpected = sorted({str(t.get('name')) for t in tools} - set(ALLOWED[toolset]))
    if unexpected:
        raise RuntimeError('unexpected tools: ' + ', '.join(unexpected)[:120])
    if toolset == 'video' and not any(t.get('name') == 'video_analyze' for t in tools) and '"error"' not in final.get('text', ''):
        raise RuntimeError('video_analyze was not called')
    return final, events


def parse(text: str) -> dict:
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1] if '\n' in text else ''
        text = text.rsplit('```', 1)[0]
    value = json.loads(text)
    if not isinstance(value, dict):
        raise ValueError('expected one JSON object')
    return value


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


def once() -> bool:
    task = signed('POST', '/api/ai-recipes/bot/claim', {}).get('task')
    if not task:
        return False
    answer = handle(task)
    (ROOT / 'ai-recipes' / 'last.json').write_text(json.dumps({'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'id': task['id'],
        'kind': task['kind'], 'ok': 'error' not in answer, 'error': answer.get('error')}, indent=2), encoding='utf-8')
    if len(json.dumps(answer, ensure_ascii=False).encode()) > MAX_ANSWER:
        answer = {'error': 'recipe answer too large'}
    route = '/api/ai-recipes/bot/tasks/' + task['id'] + '/result'
    for wait in (5, 15, 45, None):
        try:
            signed('POST', route, answer)
            break
        except urllib.error.HTTPError as exc:
            if exc.code < 500 or wait is None:  # 4xx: the app will never take it (already answered, too large)
                raise
        except (urllib.error.URLError, OSError):
            if wait is None:
                raise
        time.sleep(wait)
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if shutil.which('hermes') is None:
        sys.exit('hermes is not on PATH')
    if args.once:
        print('claimed' if once() else 'no task')
        return
    while True:
        try:
            if not once():
                time.sleep(IDLE_SECONDS)
        except (urllib.error.URLError, OSError, ValueError) as exc:
            print('bridge error:', type(exc).__name__, str(exc)[:200], file=sys.stderr, flush=True)
            time.sleep(30)


if __name__ == '__main__':
    main()
