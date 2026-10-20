"""Workflow-driven browser capture for merchant storefronts that select the outlet in-session.

Greendot's ordering sites ignore ?StoreID= in server HTML and fall back to a default outlet;
the branch menu appears only after choosing the outlet in the site's own picker. The workflow
(never a model) drives the guarded system Chromium through agent-browser, only for the allowlisted
hosts in menu_coverage.OUTLET_HOSTS, so no web content can steer it elsewhere. Owner-approved
18 Oct 2026 despite the site's robots.txt /Home/ rule; kept gentle: one outlet per host per
5 minutes, captures reused for 24 hours, no cart/checkout actions, a 7-day host back-off on any
block or challenge and a 24-hour back-off after three consecutive failures.

A capture is written to the shared evidence cache only when the page proves the outlet: the URL
carries the expected StoreID, the outlet name is shown and nearly every product ID carries the
outlet's own suffix. menu_coverage then accepts dishes on these hosts only from such captures.
"""
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import time
import urllib.parse

from menu_coverage import OUTLET_HOSTS as HOSTS, outlet_store, read, write

try:
    import fcntl
except ImportError:  # Local Windows test runs; the VPS is Linux.
    fcntl = None

CHROME = '/usr/bin/chromium'  # Carries the egress-guard managed policy; no unguarded fallback.
NPX_SPEC = 'agent-browser@^0.26.0'
HOST_DELAY = 300
REUSE = 86400
BLOCK_BACKOFF = 7 * 86400
FAILURE_BACKOFF = 86400
MAX_FAILURES = 3
MAX_TEXT = 240000
# Phrases that only appear on bot-challenge/denial interstitials, never on a merchant menu.
CHALLENGE = re.compile(r'access denied|access to this page has been denied|are you a robot|bot detected|'
                       r'verify you are human|checking your browser|just a moment|attention required|ddos protection', re.I)
BLOCKED_NAV = re.compile(r'ERR_HTTP_RESPONSE_CODE_FAILURE|ERR_BLOCKED|\b40[13]\b|\b429\b')

PRODUCTS_JS = r"""[...document.documentElement.innerHTML.matchAll(/showProductDetailDiaLog\(['"]([0-9a-f-]{36})\.clone\.(\d+)/g)]"""
CHECK_JS = """(()=>{const ids=%(products)s.map(m=>m[2]);
const id=new URLSearchParams(location.search).get('StoreID');
return JSON.stringify({title:document.title,head:(document.body&&document.body.innerText||'').slice(0,2000),
storeMatches:id===%(store)s,products:ids.length,own:ids.filter(x=>x===%(index)s).length,
picker:typeof chooseOutletIndex==='function'&&typeof confirmOutletIndex==='function'&&!!document.querySelector('#outlet-pickup-%(num)d')});})()"""
SWITCH_JS = """(()=>{setTimeout(()=>{chooseOutletIndex(%(index)s,'#tabPickup ');confirmOutletIndex();},0);return 'switching';})()"""
CONFIRM_JS = """(()=>{const m=document.querySelector('#timeModal'),b=document.querySelector('#btnChooseTimeModal');
if(m&&b&&getComputedStyle(m).display!=='none'){setTimeout(()=>b.click(),0);return 'confirming';}return 'no-modal';})()"""
READ_JS = """(()=>{const seen={};for(const m of %(products)s)seen[m[1]+'.'+m[2]]=m[2];
const main=document.querySelector('main')||document.body;
const outlet=(document.body.innerText.match(/Greendot[^\\n]{0,8}@[^\\n\\t]{2,60}/)||[''])[0].trim();
return JSON.stringify({url:location.href,title:document.title,outlet,suffixes:Object.values(seen),text:main.innerText});})()"""


class BlockedError(RuntimeError):
    """The storefront answered with a challenge, denial or blocking HTTP status."""


def _lock(handle):
    if fcntl:
        fcntl.flock(handle, fcntl.LOCK_EX)


def _now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _hosts(path):
    try:
        return read(path, {})
    except ValueError:  # A torn/corrupt state file must not stop research; start the host fresh.
        return {}


def targets(assignments):
    """One target per allowlisted storefront URL, with its StoreID and outlet product suffix."""
    found = {}
    for assignment in assignments:
        for item in assignment.get('assignedItems', []):
            url = item.get('sourceUrl', '')
            parts = urllib.parse.urlsplit(url)
            if parts.scheme != 'https' or parts.netloc.lower() not in HOSTS:
                continue
            row = found.setdefault(url, {'url': url, 'host': parts.netloc.lower(), 'venueId': assignment['id'],
                                         'store': outlet_store(url) or '', 'suffixes': set()})
            match = re.search(r'-clone-(\d+)$', item.get('itemId', ''))
            row['suffixes'].add(match[1] if match else None)
    result = []
    for row in found.values():
        suffixes = row.pop('suffixes')
        index = next(iter(suffixes)) if len(suffixes) == 1 else None
        valid = bool(re.fullmatch(r'[0-9a-f-]{36}', row['store'])) and index is not None
        result.append(dict(row, index=int(index) if valid else None,
                           error=None if valid else 'outlet-identity-unknown'))
    return result


def proof(target, page):
    """Return (ok, details); ok only when the rendered page is unmistakably this outlet."""
    store = outlet_store(page.get('url', '')) or ''
    suffixes = page.get('suffixes') or []
    own = sum(s == str(target['index']) for s in suffixes)
    details = {'storeId': store, 'outlet': page.get('outlet', '')[:120], 'products': len(suffixes),
               'outletProducts': own, 'outletSuffix': target['index']}
    ok = (store == target['store'] and bool(details['outlet']) and len(suffixes) >= 5
          and own / len(suffixes) >= 0.95 and len(re.findall(r'(?:S\$|SGD)\s*\d', page.get('text', ''))) >= 5)
    return ok, details


def _agent(session, *args, timeout=60):
    if not os.path.exists(CHROME):
        raise RuntimeError('Guarded Chromium is not installed; capture skipped')
    env = dict(os.environ, AGENT_BROWSER_EXECUTABLE_PATH=CHROME, AGENT_BROWSER_ENGINE='chrome')
    result = subprocess.run(['npx', '-y', NPX_SPEC, '--session', session, *args], cwd='/tmp', env=env,
                            capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        message = (result.stderr or result.stdout).strip()[-300:]
        if args[0] == 'open' and BLOCKED_NAV.search(message):
            raise BlockedError(f'Navigation refused: {message}')
        raise RuntimeError(f"agent-browser {args[0]} failed: {message}")
    return result.stdout.strip()


def _eval(session, script):
    out = _agent(session, 'eval', script)
    # agent-browser prints the value, JSON-quoted for strings; accept either form.
    try:
        value = json.loads(out)
    except ValueError:
        value = out
    return json.loads(value) if isinstance(value, str) and value[:1] == '{' else value


def browse(target, session):
    """Open the storefront, choose the outlet with the site's own picker, return the rendered page."""
    values = {'store': json.dumps(target['store']), 'index': json.dumps(str(target['index'])),
              'num': target['index'], 'products': PRODUCTS_JS}
    _agent(session, 'open', target['url'], timeout=90)
    _agent(session, 'wait', '4000')
    state = _eval(session, CHECK_JS % values)
    if CHALLENGE.search(state.get('title', '')) or (not state.get('products') and CHALLENGE.search(state.get('head', ''))):
        raise BlockedError('Challenge or denial page')
    # The site redirects to its session/default outlet client-side, so trust the rendered products,
    # not the URL, to decide whether the requested outlet is already showing.
    selected = state.get('storeMatches') and state.get('products', 0) >= 5 and state.get('own') == state.get('products')
    if not selected:
        if not state.get('picker'):
            raise RuntimeError('Outlet picker unavailable')
        _eval(session, SWITCH_JS % {'index': int(target['index'])})
        _agent(session, 'wait', '9000')
        if _eval(session, CONFIRM_JS) == 'confirming':
            _agent(session, 'wait', '12000')
    return _eval(session, READ_JS % values)


def capture(root, target, browse_fn=browse, clock=time.time):
    """Capture one target; returns a receipt and never raises."""
    receipt = {'url': target['url'], 'venueId': target['venueId'], 'at': _now(), 'method': 'browser-outlet-selected'}
    if target.get('error'):
        return dict(receipt, status='skipped', reason=target['error'])
    cache = root / 'state/source-cache'
    entry = cache / (hashlib.sha256(target['url'].encode()).hexdigest() + '.json')
    hosts_path = root / 'state/outlet-capture/hosts.json'
    hosts_path.parent.mkdir(parents=True, exist_ok=True)

    def update_host(**changes):
        with (hosts_path.parent / '.lock').open('a+') as lock:
            _lock(lock)
            hosts = _hosts(hosts_path)
            hosts.setdefault(target['host'], {}).update(changes)
            write(hosts_path, hosts)
            return hosts[target['host']]

    with (hosts_path.parent / '.lock').open('a+') as lock:
        _lock(lock)
        try:
            stored = read(entry, {})
        except ValueError:
            stored = {}
        if stored.get('result', {}).get('qtCapture', {}).get('method') == receipt['method'] and clock() - stored.get('fetchedEpoch', 0) < REUSE:
            return dict(receipt, status='reused', fetchedAt=stored['fetchedAt'])
        hosts = _hosts(hosts_path)
        host = hosts.setdefault(target['host'], {})
        if clock() < host.get('blockedUntil', 0):
            return dict(receipt, status='skipped', reason=host.get('blockReason', 'host-backoff'))
        if clock() - host.get('lastStart', 0) < HOST_DELAY:
            return dict(receipt, status='skipped', reason='crawl-delay')
        host['lastStart'] = clock()
        write(hosts_path, hosts)
    session = 'qt-outlet-' + hashlib.sha256(target['url'].encode()).hexdigest()[:10]
    try:
        page = browse_fn(target, session)
    except BlockedError as exc:
        update_host(blockedUntil=clock() + BLOCK_BACKOFF, blockReason='host-backoff-after-block', failures=0)
        return dict(receipt, status='blocked', reason=str(exc)[:200])
    except Exception as exc:
        return failed(receipt, update_host, clock, type(exc).__name__ + ': ' + str(exc)[:200])
    finally:
        if browse_fn is browse:
            try:
                _agent(session, 'close', timeout=30)
            except Exception:
                pass
    ok, details = proof(target, page)
    if not ok:
        if CHALLENGE.search(page.get('title', '')) or (not details['products'] and CHALLENGE.search(page.get('text', '')[:2000])):
            update_host(blockedUntil=clock() + BLOCK_BACKOFF, blockReason='host-backoff-after-block', failures=0)
            return dict(receipt, status='blocked', reason='challenge-or-denial-page')
        return dict(failed(receipt, update_host, clock, 'outlet-not-confirmed'), proof=details)
    header = (f"Outlet selected in the merchant's own picker (QT browser capture): {details['outlet']}\n"
              f"StoreID {details['storeId']}; outlet product suffix {details['outletSuffix']}: "
              f"{details['outletProducts']}/{details['products']} products.\n\n")
    content = (header + page.get('text', ''))[:MAX_TEXT]
    fetched = _now()
    value = {'url': target['url'], 'fetchedAt': fetched, 'fetchedEpoch': clock(),
             'sha256': hashlib.sha256(content.encode()).hexdigest(), 'blocked': False,
             'result': {'url': target['url'], 'title': page.get('title', ''), 'content': content,
                        'qtCapture': dict(details, method=receipt['method'], renderedUrl=page.get('url', ''))}}
    cache.mkdir(parents=True, exist_ok=True)
    with (cache / '.lock').open('a+') as lock:
        _lock(lock)
        write(entry, value)
    update_host(failures=0)
    return dict(receipt, status='captured', fetchedAt=fetched, sha256=value['sha256'], proof=details)


def failed(receipt, update_host, clock, reason):
    """Count consecutive failures; after MAX_FAILURES the host rests for a day instead of retrying every tick."""
    host = update_host()
    failures = host.get('failures', 0) + 1
    if failures >= MAX_FAILURES:
        update_host(failures=0, blockedUntil=clock() + FAILURE_BACKOFF, blockReason='host-backoff-after-repeated-failures')
    else:
        update_host(failures=failures)
    return dict(receipt, status='failed', reason=reason)


def ensure(root, assignments, browse_fn=browse, clock=time.time):
    """Capture every allowlisted storefront behind this assignment; log receipts; never raises."""
    receipts = []
    for target in targets(assignments):
        try:
            receipts.append(capture(root, target, browse_fn, clock))
        except Exception as exc:
            receipts.append({'url': target['url'], 'status': 'failed', 'reason': type(exc).__name__, 'at': _now()})
    if receipts:
        log = root / 'state/outlet-capture/log.jsonl'
        log.parent.mkdir(parents=True, exist_ok=True)
        if log.exists() and log.stat().st_size > 4 * 1024 * 1024:
            log.replace(log.with_suffix('.previous.jsonl'))
        with log.open('a', encoding='utf-8') as handle:
            for row in receipts:
                handle.write(json.dumps(row, ensure_ascii=False) + '\n')
    return receipts
