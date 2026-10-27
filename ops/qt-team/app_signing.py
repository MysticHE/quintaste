"""Signed calls from the QT bots to the app's bot routes (server/bot-signature.mjs).

X-QT-Time and X-QT-Signature = HMAC-SHA256(publisher key, time \\n METHOD \\n path \\n sha256(body)); the app allows five minutes
of clock drift. Each caller keeps its own route allow-list and response handling. The signing headers never follow a redirect.
"""
from __future__ import annotations
import hashlib
import hmac
import os
from pathlib import Path
import time
import urllib.request

ORIGIN = os.environ.get('QT_APP_ORIGIN', 'https://quintaste.srv1902914.hstgr.cloud')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # the signature must never follow a redirect


def open_signed(root: Path, method: str, route: str, raw: bytes = b'', timeout: int = 60):
    """Opens one signed request to ORIGIN + route and returns the response; use it in a `with` block."""
    stamp = str(int(time.time()))
    key = (root / 'private/publisher.key').read_text().strip()
    message = stamp + '\n' + method + '\n' + route + '\n' + hashlib.sha256(raw).hexdigest()
    signature = hmac.new(key.encode(), message.encode(), hashlib.sha256).hexdigest()
    request = urllib.request.Request(ORIGIN + route, data=raw if method == 'POST' else None, method=method,
        headers={'Content-Type': 'application/json', 'X-QT-Time': stamp, 'X-QT-Signature': signature})
    return urllib.request.build_opener(NoRedirect).open(request, timeout=timeout)
