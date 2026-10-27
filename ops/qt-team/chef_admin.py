"""Chefs in admin (docs/ADMIN_CHEFS_PLAN.md): signed calls from the QT bots to the admin service's chef routes.

Each chef signs with its own key, private/admin-<chef>.key, and names itself in X-QT-Bot (admin/src/lib/bot.ts); a chef can
reach only its own lanes. Kaya's reporter ('head') reads the asks waiting for the owner and brings back the owner's answer.
Admin applies every rule (lane mode, confidence floor, ask-first actions), so nothing here decides on its own.
"""
from __future__ import annotations

import json
from pathlib import Path
import urllib.parse

from app_signing import ADMIN_ORIGIN, open_signed

LIMIT = 1_000_000


def has_key(root: Path, caller: str) -> bool:
    return (root / f'private/admin-{caller}.key').is_file()


def call(root: Path, caller: str, method: str, route: str, payload=None, timeout: int = 30):
    raw = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else b''
    with open_signed(root, method, route, raw, timeout, origin=ADMIN_ORIGIN, key_file=f'private/admin-{caller}.key', caller=caller) as response:
        body = response.read(LIMIT + 1)
    if len(body) > LIMIT:
        raise ValueError('Oversized admin response')
    return json.loads(body)


def lane(root: Path, chef: str, name: str, after: str | None = None):
    """{lane, mode: off|watch|on, floor, actions, items}: what waits for this chef in one of its lanes. A paged lane also says
    `more`; pass the last item's id as `after` for the next page."""
    query = 'lane=' + urllib.parse.quote(name, safe='') + ('&after=' + urllib.parse.quote(after, safe='') if after else '')
    return call(root, chef, 'GET', '/api/bot/lane?' + query)


def decide(root: Path, chef: str, decision: dict):
    """Records one decision: {lane, target, action, input, reason, evidence, confidence, review: agree|disagree, idem}."""
    return call(root, chef, 'POST', '/api/bot/decide', decision)


def asks(root: Path, after: str | None = None):
    """Asks made after `after` (the `at` of the last ask already carded), oldest first, at most 20."""
    return call(root, 'head', 'GET', '/api/bot/asks' + ('?after=' + urllib.parse.quote(after, safe='') if after else ''))['asks']


def answer(root: Path, decision_id: str, yes: bool):
    return call(root, 'head', 'POST', '/api/bot/answer', {'id': decision_id, 'answer': 'approve' if yes else 'reject'})
