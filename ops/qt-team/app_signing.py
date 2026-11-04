"""Signed calls from the QT bots to the app's bot routes (server/bot-signature.mjs) and admin's (admin/src/lib/bot.ts).

X-QT-Time and X-QT-Signature = HMAC-SHA256(key, time \\n METHOD \\n path \\n sha256(body)); both allow five minutes of clock drift.
The app uses the publisher key; admin names the caller in X-QT-Bot and has a key per caller. Each caller keeps its own route
allow-list and response handling. The signing headers never follow a redirect.
"""
from __future__ import annotations
from contextlib import contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import threading
import time
import urllib.error
import urllib.request

ORIGIN = os.environ.get('QT_APP_ORIGIN', 'https://quintaste.srv1902914.hstgr.cloud')
ADMIN_ORIGIN = os.environ.get('QT_ADMIN_ORIGIN', 'https://admin-quintaste.srv1902914.hstgr.cloud')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the signature must never follow a redirect


def sign(key_file: Path, method: str, signed_path: str, raw: bytes) -> dict:
    """The signing headers for one attempt; a retry signs again, so its time is fresh."""
    stamp = str(int(time.time()))
    message = stamp + '\n' + method + '\n' + signed_path + '\n' + hashlib.sha256(raw).hexdigest()
    signature = hmac.new(key_file.read_text().strip().encode(), message.encode(), hashlib.sha256).hexdigest()
    return {'Content-Type': 'application/json', 'X-QT-Time': stamp, 'X-QT-Signature': signature}


# The bots all share one address; on 4 Nov 2026 their refused requests failed whole rounds and threw finished answers away. A request
# is sent again only when the app did not take it: "too many requests" (429), or "unavailable" (503) when the app asks the caller to
# come back (Retry-After, e.g. the rate-limit store being down). A 503 without it may follow a partly applied write, so it is the
# caller's (the editorial removal says "check current state before retrying").
RETRY_WAITS = (2, 5, 15, 30)
RETRY_BUDGET = 120  # seconds of waiting per call at most for the background workers
_local = threading.local()


@contextmanager
def budget(seconds: float):
    """Waits at most `seconds` per call in this thread: the Telegram listener and reporter and the one-minute kitchen feed must not
    sit through two minutes of waits (owner buttons and the next tick wait behind them)."""
    before = getattr(_local, 'budget', None)
    _local.budget = seconds
    try:
        yield
    finally:
        _local.budget = before


def retryable(exc: urllib.error.HTTPError) -> bool:
    return exc.code == 429 or (exc.code == 503 and bool(exc.headers.get('Retry-After')))


def retry_after(exc: urllib.error.HTTPError, fallback: float) -> float:
    try:
        return min(max(float(exc.headers.get('Retry-After') or fallback), 1), 60)
    except (TypeError, ValueError):
        return fallback


def note_refusal(root: Path, route: str, outcome: str) -> None:
    """One line per refusal in state/app-throttle/<UTC day>.jsonl, for the daily summary's early warning. Never raises."""
    try:
        folder = root / 'state' / 'app-throttle'
        folder.mkdir(parents=True, exist_ok=True)
        line = json.dumps({'at': time.time(), 'route': route.split('?')[0][:80], 'outcome': outcome}) + '\n'
        with (folder / (time.strftime('%Y-%m-%d', time.gmtime()) + '.jsonl')).open('a', encoding='utf-8') as file:
            file.write(line)
    except OSError:
        pass


def retrying(root: Path, route: str, attempt):
    """attempt() with waits while the app says it did not take the request (retryable); any other answer is the caller's."""
    started, limit = time.monotonic(), getattr(_local, 'budget', None) or RETRY_BUDGET
    for wait in RETRY_WAITS + (None,):
        try:
            return attempt()
        except urllib.error.HTTPError as exc:
            if not retryable(exc):
                raise
            delay = retry_after(exc, wait or 0)
            if wait is None or time.monotonic() - started + delay > limit:
                note_refusal(root, route, 'gave-up')
                raise
            exc.close()
            note_refusal(root, route, 'retried')
            time.sleep(delay)


def open_signed(root: Path, method: str, route: str, raw: bytes = b'', timeout: int = 60, *, origin: str = ORIGIN,
                key_file: str = 'private/publisher.key', caller: str | None = None, lease: str | None = None,
                signed_path: str | None = None):
    """Opens one signed request to origin + route and returns the response; use it in a `with` block. signed_path: the path the
    server hashes when it differs from route (the editorial router hashes its own sub-path)."""
    def attempt():
        headers = sign(root / key_file, method, signed_path or route, raw)
        if caller:
            headers['X-QT-Bot'] = caller
        if lease:
            headers['X-QT-Lease'] = lease
        request = urllib.request.Request(origin + route, data=raw if method == 'POST' else None, method=method, headers=headers)
        return urllib.request.build_opener(NoRedirect).open(request, timeout=timeout)
    return retrying(root, route, attempt)


class IdleBackoff:
    """How long an idle bridge waits before asking for work again: `base` after work, doubling while idle up to `cap`. Idle polling
    used up the shared request allowance on 4 Nov 2026; asking less often when there is nothing to do keeps it small (5 Nov 2026)."""
    def __init__(self, base: float, cap: float):
        self.base, self.cap, self.delay = base, max(cap, base), base

    def worked(self) -> None:
        self.delay = self.base

    def idle(self) -> float:
        delay, self.delay = self.delay, min(self.delay * 2, self.cap)
        return delay
