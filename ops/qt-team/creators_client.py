"""QT Cooker's client for the creator library (docs/COOKER_CREATOR_LIBRARY_PLAN.md, 21 Oct 2026): read the creators to search first
and the pages already written up, and record the recipe pages Cooker looked at. Signed like the AI recipes bridge (same key, same
message: time, method, path, sha256 of the body). Best effort: when the app is unreachable or the library is not installed yet,
library() returns None and record() returns 0, and Cooker carries on with its checkpoint's page list."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
ORIGIN = os.environ.get('QT_APP_ORIGIN', 'https://quintaste.srv1902914.hstgr.cloud')
ROUTES = ('/api/creators/bot/library', '/api/creators/bot/sources', '/api/creators/bot/creators')
BATCH = 50  # the app accepts at most 50 sources per call
# The proxy in front of the app (deploy/compose.yml, quintaste-body) refuses API bodies over 16 KB with 413 (first scout, 22 Oct
# 2026), so every call is packed to stay under this many bytes.
MAX_BODY = 12_000


def size(value):
    return len(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


def packs(items, most):
    """Consecutive slices of items, each at most `most` long and under MAX_BODY bytes once sent (an oversized single item goes alone)."""
    pack = []
    for item in items:
        if pack and (len(pack) >= most or size(pack + [item]) > MAX_BODY):
            yield pack
            pack = []
        pack.append(item)
    if pack:
        yield pack


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the signature must never follow a redirect


def call(route: str, data: dict):
    if route not in ROUTES:
        raise ValueError('Unapproved app route')
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    stamp = str(int(time.time()))
    key = (ROOT / 'private/publisher.key').read_text().strip()
    message = stamp + '\nPOST\n' + route + '\n' + hashlib.sha256(raw).hexdigest()
    signature = hmac.new(key.encode(), message.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(ORIGIN + route, data=raw, method='POST',
                                     headers={'Content-Type': 'application/json', 'X-QT-Time': stamp, 'X-QT-Signature': signature})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
        return json.loads(response.read(4_000_001))


def library():
    """{creators, written, blocked} or None when the library cannot be read."""
    try:
        result = call('/api/creators/bot/library', {})
        return result if isinstance(result, dict) and isinstance(result.get('creators'), list) else None
    except (OSError, ValueError, urllib.error.URLError):
        return None


def scout(creators, channels):
    """Send what the weekly creator scout found: new creators (with their channels) and refreshed counts for known channels
    ({creatorId, platform, handle, url, followers?, posts?}). Returns the app's counts; raises when the app refuses the call."""
    out = {'added': 0, 'updated': 0, 'refreshed': 0, 'paused': 0}
    # the app accepts 40 creators and 200 channels per call; creators go first, then channel refreshes, each packed under MAX_BODY
    parts = [{'creators': p, 'channels': []} for p in packs(creators, 40)] + [{'creators': [], 'channels': p} for p in packs(channels, 200)]
    for part in parts or [{'creators': [], 'channels': []}]:  # an empty call still runs the 90-day pause
        for key, value in call('/api/creators/bot/creators', part).items():
            if key in out:
                out[key] += int(value)
    return out


def record(sources):
    """Send recipe pages ({url, status, name?, recipeId?, reasons?, coverage?, platform?}); returns how many were recorded."""
    sent = 0
    rows = [s for s in sources if isinstance(s, dict) and str(s.get('url', '')).startswith('https://')]
    for pack in packs(rows, BATCH):
        try:
            sent += int(call('/api/creators/bot/sources', {'sources': pack}).get('recorded', 0))
        except (OSError, ValueError, urllib.error.URLError):
            break  # the next round sends them again; statuses never move backwards on the app side
    return sent
