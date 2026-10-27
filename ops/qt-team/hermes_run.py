"""One Hermes run for the QT bridges and chef lanes: a profile, a prompt file, a toolset, and a check of the tools it used.

Shared by game_level_bridge.py, ai_recipes_bridge.py and chef_work.py. The run gets its own process group, so a timeout stops
Hermes and every tool process it started (as workflow.py does). Hermes always offers tool discovery; any other tool the run
used that is not in `allowed` fails it. With `keep=False` the prompt and stream files are deleted after a successful run, for
prompts that carry members' own words; a failed run keeps them for diagnosis (chef_work prunes old run folders).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import subprocess

DISCOVERY = ('tool_search', 'tool_describe')


def run(profile: str, prompt: str, folder: Path, *, toolset: str = 'web', allowed=DISCOVERY, seconds: int = 300, turns: int = 3,
        grace: int = 60, reserve=None, keep: bool = True):
    """Returns (final result event, all events), or raises RuntimeError."""
    (folder / 'prompt.txt').write_text(prompt, encoding='utf-8')
    env = {k: v for k, v in os.environ.items() if not k.startswith(('HERMES_CRON_', 'HERMES_SESSION_', 'HERMES_TASK_'))}
    env.update(HERMES_HOME='/opt/data', HERMES_TIMEZONE='Asia/Singapore')
    args = ['hermes', '-p', profile, 'chat', '--query-file', str(folder / 'prompt.txt'), '--oneshot', '--format', 'stream-json',
            '--max-turns', str(turns), '--run-budget', str(seconds), '-t', toolset, '--in', str(folder)]
    if reserve:
        reserve()
    with (folder / 'stream.jsonl').open('w', encoding='utf-8') as out, (folder / 'stderr.log').open('w', encoding='utf-8') as err:
        proc = subprocess.Popen(args, stdout=out, stderr=err, env=env, start_new_session=True)
        try:
            proc.wait(timeout=seconds + grace)
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
    if proc.returncode != 0 or not final or final.get('exit_code') != 0:
        raise RuntimeError('hermes did not complete (exit %s)' % proc.returncode)
    used = sorted({str(e.get('name')) for e in events if e.get('type') == 'tool_use'} - set(allowed))
    if used:
        raise RuntimeError('used tools it was not given: ' + ', '.join(used)[:120])
    if not keep:
        for name in ('prompt.txt', 'stream.jsonl', 'stderr.log'):
            (folder / name).unlink(missing_ok=True)
    return final, events


def parse(text: str) -> dict:
    """The one JSON object a run answered with (a Markdown fence around it is tolerated)."""
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1] if '\n' in text else ''
        text = text.rsplit('```', 1)[0]
    value = json.loads(text)
    if not isinstance(value, dict):
        raise ValueError('expected one JSON object')
    return value
