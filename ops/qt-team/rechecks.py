"""Pandan's recheck pass (docs/ADMIN_CHEFS_PLAN.md step 5): places in members' reports that Coco triaged go first in Explorer's next
round, with Coco's notes saying what to recheck.

chef_work.py writes state/fixer/rechecks.json from admin: [{case, place, note, at}] for reports still triaged, never the reporter.
Admin keeps listing a case all that time, so state/fixer/rechecked.json records what this pass did with each case and stops
repeats: sent to Explorer (with what Explorer found), skipped because Explorer does not cover the place, or failed after TRIES
tries (a try fails when Explorer's run fails or the menu inventory is unavailable). Coco later reads the sent ones to suggest
closing the report (`settled`, `suggested`). Entries older than KEEP_DAYS are dropped. `write` is also chef_work's state writer.
"""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

from kitchen_feed import read as _read

LIST = Path('state/fixer/rechecks.json')
DONE = Path('state/fixer/rechecked.json')
TRIES = 2
KEEP_DAYS = 30
PER_PLACE = 3  # notes per place handed to Explorer; the newest are kept


def write(path: Path, value):
    """Writes JSON atomically (a reader never sees half a file)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, default=str), encoding='utf-8')
    os.replace(tmp, path)


def _now():
    return dt.datetime.now(dt.timezone.utc)


def _tidy(done: dict, now: dt.datetime) -> dict:
    cutoff = now - dt.timedelta(days=KEEP_DAYS)
    keep = {}
    for case, row in done.items():
        try:
            if dt.datetime.fromisoformat(row['at']) >= cutoff:
                keep[case] = row
        except (KeyError, TypeError, ValueError):
            continue
    return keep


def due(root: Path, venues: list, now: dt.datetime | None = None):
    """Places to recheck first, oldest report first: ([{venue, cases, notes}], [cases skipped because the place is unknown])."""
    now = now or _now()
    rows, done = _read(root / LIST, []), _tidy(_read(root / DONE, {}), now)
    by_id = {v['venueId']: v for v in venues}
    places, skipped = {}, []
    for row in sorted((r for r in rows if isinstance(r, dict)), key=lambda r: str(r.get('at', ''))):
        case, place, note = row.get('case'), row.get('place'), row.get('note')
        if not (isinstance(case, str) and isinstance(place, str) and case and place):
            continue
        if done.get(case, {}).get('outcome') in ('sent', 'unknown-place', 'failed'):
            continue
        if place not in by_id:
            done[case] = {'at': now.isoformat(), 'outcome': 'unknown-place'}
            skipped.append(case)
            continue
        entry = places.setdefault(place, {'venue': by_id[place], 'cases': [], 'notes': []})
        entry['cases'].append(case)
        if isinstance(note, str) and note.strip():
            entry['notes'] = (entry['notes'] + [note.strip()[:300]])[-PER_PLACE:]
    write(root / DONE, done)
    return list(places.values()), skipped


def found(record: dict | None) -> dict | None:
    """What Explorer's record says about the place: its status (unchanged, proposed, held, excluded) and the fields it proposed."""
    if not isinstance(record, dict):
        return None
    fields = sorted({p['field'] for p in record.get('proposals') or [] if isinstance(p, dict) and isinstance(p.get('field'), str)})
    return {'place': record.get('id'), 'status': record.get('status'), 'fields': fields}


def mark(root: Path, cases: list, ok: bool, now: dt.datetime | None = None, record: dict | None = None):
    """After Explorer's run for a place: its cases are sent (with what Explorer found), or one more try failed (after TRIES they
    stop coming first)."""
    now = now or _now()
    done = _tidy(_read(root / DONE, {}), now)
    for case in cases:
        if ok:
            done[case] = {'at': now.isoformat(), 'outcome': 'sent', 'record': found(record)}
            continue
        tries = done.get(case, {}).get('tries', 0) + 1
        done[case] = {'at': now.isoformat(), 'outcome': 'failed' if tries >= TRIES else 'retry', 'tries': tries}
    write(root / DONE, done)


def settled(root: Path) -> list[dict]:
    """Sent cases Coco has not yet suggested closing: [{case, at, record}], oldest first (chef_work.suggest_resolutions)."""
    done = _read(root / DONE, {})
    rows = [{'case': case, 'at': row['at'], 'record': row['record']} for case, row in done.items()
            if row.get('outcome') == 'sent' and isinstance(row.get('record'), dict) and not row.get('suggested')]
    return sorted(rows, key=lambda r: r['at'])


def suggested(root: Path, case: str, now: dt.datetime | None = None):
    """Coco has suggested closing this case (or found it closed elsewhere); it is not suggested again."""
    done = _read(root / DONE, {})
    if case in done:
        done[case]['suggested'] = (now or _now()).isoformat()
        write(root / DONE, done)
