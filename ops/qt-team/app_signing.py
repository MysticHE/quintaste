"""Signed calls from the QT bots to the app's bot routes (server/bot-signature.mjs) and admin's (admin/src/lib/bot.ts).

X-QT-Time and X-QT-Signature = HMAC-SHA256(key, time \\n METHOD \\n path \\n sha256(body)); both allow five minutes of clock drift.
The app uses the publisher key; admin names the caller in X-QT-Bot and has a key per caller. Each caller keeps its own route
allow-list and response handling. The signing headers never follow a redirect.
"""
from __future__ import annotations
import hashlib
import hmac
import os
from pathlib import Path
import time
import urllib.request

ORIGIN = os.environ.get('QT_APP_ORIGIN', 'https://quintaste.srv1902914.hstgr.cloud')
ADMIN_ORIGIN = os.environ.get('QT_ADMIN_ORIGIN', 'https://admin-quintaste.srv1902914.hstgr.cloud')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the signature must never follow a redirect


def open_signed(root: Path, method: str, route: str, raw: bytes = b'', timeout: int = 60, *, origin: str = ORIGIN,
                key_file: str = 'private/publisher.key', caller: str | None = None):
    """Opens one signed request to origin + route and returns the response; use it in a `with` block."""
    stamp = str(int(time.time()))
    key = (root / key_file).read_text().strip()
    message = stamp + '\n' + method + '\n' + route + '\n' + hashlib.sha256(raw).hexdigest()
    signature = hmac.new(key.encode(), message.encode(), hashlib.sha256).hexdigest()
    headers = {'Content-Type': 'application/json', 'X-QT-Time': stamp, 'X-QT-Signature': signature}
    if caller:
        headers['X-QT-Bot'] = caller
    request = urllib.request.Request(origin + route, data=raw if method == 'POST' else None, method=method, headers=headers)
    return urllib.request.build_opener(NoRedirect).open(request, timeout=timeout)
