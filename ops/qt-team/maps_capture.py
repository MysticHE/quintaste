"""Google Maps pages for the QT evidence cache (owner, 19 Oct 2026: Explorer may use Google Maps).

When Explorer calls web_extract on a Google Maps link (a /maps/search/?api=1&query=... search or a /maps/place/
page), this opens it in the guarded Chromium, expands the weekly hours, and stores the visible listing text, so
Explorer's findings are checked against a stored copy like any other source. Google serves automated, signed-out
browsers a "limited view": name, category, rating, address with postcode, open/closed status (including
"Permanently closed"), hours, website and phone, but no menu or reviews. A search with several results stores
the result list with each place link. The paid Places API (googleapis.com) stays blocked.

Gentle by design: one capture at a time ACROSS PROCESSES (a file lock held for the whole capture, so several Hermes
workers running at once still share one lane), at least 15 s apart, captures reused for 24 hours, and a 24-hour
pause after any "unusual traffic"/challenge page. Challenges are never bypassed.
"""
from __future__ import annotations

import contextlib
import json
import os
import pathlib
import re
import time
import urllib.parse

try:
    import fcntl
except ImportError:  # local Windows test runs; the VPS is Linux
    fcntl = None

ROOT = pathlib.Path('/opt/data/qt-team')
STATE = ROOT / 'state/maps-capture.json'
GAP = 15
PAUSE = 86400
MAX_TEXT = 20000
METHOD = 'browser-google-maps'
CHALLENGE = re.compile(r"unusual traffic|not a robot|/sorry/|captcha|before you continue to google", re.I)
HEADER = ('Google Maps listing (QT browser capture; signed-out limited view, which shows no menu or reviews). '
          'Rendered URL: {url}\n\n')
EXPAND_JS = """(()=>{const e=document.querySelector("[aria-label='Show open hours for the week'],[data-item-id=oh]");
if(!e)return 'none';(e.closest('[role=button],button,[jsaction]')||e).click();return 'clicked';})()"""
READ_JS = """(()=>{const main=document.querySelector('[role=main]')||document.body;
const hours=[...document.querySelectorAll('table tr')].map(r=>r.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean);
const results=[...document.querySelectorAll('[role=feed] a[href*="/maps/place/"]')].slice(0,10)
  .map(a=>({name:a.getAttribute('aria-label')||'',href:a.href.split('?')[0]}));
return JSON.stringify({url:location.href,title:document.title,h1:(document.querySelector('h1')||{}).innerText||'',
  text:main.innerText,hours,results,head:document.body.innerText.slice(0,1500)});})()"""


def is_maps(url):
    """A Google Maps web page (not the paid API)."""
    parts = urllib.parse.urlsplit(str(url))
    host = (parts.hostname or '').lower()
    if parts.scheme != 'https' or host.endswith('googleapis.com'):
        return False
    return bool(re.fullmatch(r'maps\.google\.com(\.sg)?', host)
                or (re.fullmatch(r'(www\.)?google\.com(\.sg)?', host) and parts.path.startswith('/maps')))


def _state():
    try:
        return json.loads(STATE.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


@contextlib.contextmanager
def lane():
    """The one Google Maps lane: held from the pause check to the end of the capture, by every process."""
    lock = STATE.with_name(STATE.name + '.lock')
    lock.parent.mkdir(parents=True, exist_ok=True)
    with lock.open('a+') as handle:
        if fcntl:
            fcntl.flock(handle, fcntl.LOCK_EX)
        yield


def _save(state):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE.with_suffix('.%d.tmp' % os.getpid())
    temp.write_text(json.dumps(state), encoding='utf-8')
    temp.replace(STATE)


def _text(page):
    lines = [line.strip() for line in str(page.get('text', '')).splitlines()]
    body = '\n'.join(line for line in lines if line)
    if page.get('hours'):
        body += '\n\nOpening hours:\n' + '\n'.join(page['hours'])
    if page.get('results') and not page.get('h1'):
        body += '\n\nSearch results (open one with web_extract):\n' + '\n'.join(
            '- ' + r['name'] + ': ' + r['href'] for r in page['results'] if r.get('href'))
    return (HEADER.format(url=page.get('url', '')) + body)[:MAX_TEXT]


def browse(url, session):
    from outlet_capture import _agent, _eval
    _agent(session, 'open', url, timeout=90)
    _agent(session, 'wait', '5000')
    if _eval(session, EXPAND_JS) == 'clicked':
        _agent(session, 'wait', '2000')
    return _eval(session, READ_JS)


def capture(url, browse_fn=browse, clock=time.time):
    """A Firecrawl-shaped extract row for a Google Maps page; an error row when paused, blocked or failed."""
    with lane():
        return _capture(url, browse_fn, clock)


def _capture(url, browse_fn, clock):
    from outlet_capture import BlockedError, _agent
    state = _state()
    if clock() < state.get('pausedUntil', 0):
        return {'url': url, 'error': 'Google Maps paused after a challenge page; use other sources until ' +
                time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime(state['pausedUntil']))}
    wait = GAP - (clock() - state.get('lastStart', 0))
    if wait > 0:
        time.sleep(wait)
    state['lastStart'] = clock()
    _save(state)
    session = 'qt-maps-%d-%d' % (os.getpid(), int(clock()))
    try:
        page = browse_fn(url, session)
    except BlockedError as exc:
        page = {'title': 'blocked', 'head': str(exc)}
    except Exception as exc:
        return {'url': url, 'error': 'Google Maps capture failed: ' + type(exc).__name__ + ': ' + str(exc)[:160]}
    finally:
        if browse_fn is browse:
            try:
                _agent(session, 'close', timeout=30)
            except Exception:
                pass
    if not isinstance(page, dict) or CHALLENGE.search(str(page.get('url', '')) + ' ' + str(page.get('title', '')) + ' ' + str(page.get('head', ''))):
        state['pausedUntil'] = clock() + PAUSE
        _save(state)
        return {'url': url, 'error': 'Google Maps showed a challenge page; paused for 24 hours (never bypassed)'}
    if not page.get('h1') and not page.get('results'):
        return {'url': url, 'error': 'Google Maps returned no listing for this link'}
    content = _text(page)
    return {'url': url, 'title': page.get('h1') or page.get('title', ''), 'content': content, 'raw_content': content,
            'qtCapture': {'method': METHOD, 'renderedUrl': str(page.get('url', ''))[:500]}}
