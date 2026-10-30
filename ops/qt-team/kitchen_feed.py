"""Mochi kitchen feed (docs/MOCHI_KITCHEN_PLAN.md §4): the public snapshot behind the /kitchen page.

Built from what really happened: verified publication receipts (state/publications/), QT Manager's review outcomes, QT Gamer's
owner-approved pictures, the AI recipe ledger and the model calls running now. Owner, 30 Oct 2026: live, with no delay. Each model
call pushes a snapshot when it starts and when it ends (workflow.kitchen_ping) and a timer pushes one every minute. Reads the live
editorial state first so anything the owner reverted or deleted, or staff hid, is left out (and drops off at the next push).

Public facts only: place, recipe and event names that are already live, counts, and each chef's state. Never members, sellers,
reporters, Market items, transcripts, prompts, costs or the reasons QT Manager wrote (only a fixed category per sent-back item).

`python kitchen_feed.py` prints the snapshot; `--push` sends it to the app's signed /api/kitchen/bot/feed route.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path

from app_signing import open_signed
from night_window import ROLE_WINDOWS as BOT_WINDOWS

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))
ROUTE = '/api/kitchen/bot/feed'
SG = dt.timezone(dt.timedelta(hours=8))
DELAY = dt.timedelta(0)  # owner, 30 Oct 2026: tickets show as soon as they are published
WINDOW = dt.timedelta(days=13)  # the app accepts items from the last 14 days
MAX_ITEMS, MAX_BYTES, MAX_TEXT = 40, 15_500, 90
LIVE = dt.timedelta(minutes=10)  # QT Gamer and the writer count as working this long after their last file
STUCK = dt.timedelta(minutes=45)  # a call's live.json older than this was left by a killed round, not a running call
RECENT = dt.timedelta(minutes=3)  # stays working this long after a call ends, so the short gaps between calls do not flicker
ROLE_WINDOWS = {'wok': BOT_WINDOWS['qt-cooker'], 'host': BOT_WINDOWS['qt-event']}  # the bots' own shift hours (SGT)
RUN_FOLDERS = {
    'scout': ('explorer-', 'veg-kitchen-', 'mixed-kitchen-', 'cover-search'),
    'wok': ('cooker', 'creator-scout'),
    'host': ('event',),
    'head': ('manager', 'publication'),
}
# QT Manager's free-text hold reasons, reduced to the page's fixed categories; the first match wins.
REASONS = [
    ('photo-rights-unclear', ('photo', 'image', 'picture', 'cover', 'licen', 'rights', 'illustration')),
    ('date-not-confirmed', ('event date', 'date', 'deadline', 'starts', 'schedule')),
    ('price-not-on-menu', ('price', 'sgd', 'currency', 'cost')),
    ('hours-unclear', ('hour', 'opening', 'open ', 'closing')),
    ('diet-not-proven', ('vegetarian', 'vegan', 'diet', 'egg', 'dairy', 'allium', 'garlic', 'onion', 'pungent', 'meat', 'seafood')),
    ('branch-unclear', ('branch', 'address', 'postcode', 'outlet', 'identity', 'location', 'same name', 'duplicate')),
]


def read(path: Path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return default


def when(value) -> dt.datetime | None:
    try:
        at = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        return None
    return at if at.tzinfo else at.replace(tzinfo=dt.timezone.utc)


def iso(at: dt.datetime) -> str:
    return at.astimezone(dt.timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def text(value) -> str:
    clean = ' '.join(str(value or '').split())
    return clean if len(clean) <= MAX_TEXT else clean[:MAX_TEXT - 1].rstrip() + '…'


def sg_day(at: dt.datetime) -> str:
    return at.astimezone(SG).date().isoformat()


IDENTITY = {'place': 'name', 'recipe': 'title', 'event': 'title'}


def is_new(change: dict) -> bool:
    """True when the change created the item. Newer receipts say so (`created`); for older ones the item's own name or title
    must have been empty before, so a revision that only fills an empty field (nutrition, a fee) never counts as new."""
    if 'created' in change:
        return bool(change['created'])
    key = IDENTITY.get(change.get('kind'))
    return bool(key) and key in (change.get('fields') or []) and (change.get('before') or {}).get(key) is None


def changed_prices(before, after) -> int:
    """How many dishes this change actually priced: the stored list is the venue's whole merged menu, not the patch."""
    def keyed(rows):
        if not isinstance(rows, list):
            return {}
        return {str(r.get('sectionId')) + ':' + str(r.get('itemId')): json.dumps(r, sort_keys=True) for r in rows if isinstance(r, dict)}
    old = keyed(before)
    return sum(1 for k, v in keyed(after).items() if old.get(k) != v)


def tickets(change: dict, at: dt.datetime) -> list[dict]:
    """The page's tickets for one published change; revisions nobody would notice (source links, nutrition) give none."""
    kind, rid, fields = change.get('kind'), str(change.get('id', '')), set(change.get('fields') or [])
    name, after, stamp = text(change.get('name') or rid), change.get('after') or {}, iso(at)
    if kind in ('venue', 'place'):
        if 'closed' in fields:
            return [{'chef': 'scout', 'type': 'closures', 'at': stamp, 'n': 1}]
        if kind == 'place' and is_new(change):
            return [{'chef': 'scout', 'type': 'new-place', 'at': stamp, 'place': name, 'route': '/place/catalogue-' + rid}]
        out = []
        priced = changed_prices((change.get('before') or {}).get('menuPrices'), after.get('menuPrices')) if 'menuPrices' in fields else 0
        if priced:
            out.append({'chef': 'scout', 'type': 'menu-prices', 'at': stamp, 'place': name, 'n': priced, 'route': '/menu/' + rid})
        if 'hours' in fields:
            out.append({'chef': 'scout', 'type': 'hours', 'at': stamp, 'place': name, 'route': '/place/catalogue-' + rid})
        if 'photo' in fields:
            out.append({'chef': 'scout', 'type': 'cover', 'at': stamp, 'place': name, 'route': '/place/catalogue-' + rid})
        return out
    if kind == 'recipe' and is_new(change):
        return [{'chef': 'wok', 'type': 'recipe', 'at': stamp, 'title': name, 'route': '/cook/recipe/' + rid}]
    if kind == 'event':
        if (after.get('status') or '') == 'cancelled':
            return [{'chef': 'host', 'type': 'event-removed', 'at': stamp, 'n': 1}]
        start = str(after.get('startsAt') or '')[:10]
        if is_new(change) and len(start) == 10:
            return [{'chef': 'host', 'type': 'event', 'at': stamp, 'title': name, 'date': start, 'route': '/cook?tab=events'}]
    return []


def taken_back(live: dict) -> tuple[set, set]:
    """Change ids the owner reverted, and items deleted by the owner or hidden by staff: places (staffHidden), and recipes,
    events and menus (staffHiddenItems; a hidden menu is ('menu', venue id))."""
    reverted = {r.get('changeId') for r in live.get('reverts', []) if r.get('changeId')}
    gone = {(r.get('kind'), r.get('id')) for r in live.get('removals', [])}
    gone |= {(kind, pid) for pid in live.get('staffHidden', []) for kind in ('venue', 'place')}
    gone |= {(item.get('kind'), item.get('id')) for item in live.get('staffHiddenItems', [])}
    return reverted, gone


def published(now: dt.datetime, live: dict) -> list[dict]:
    reverted, gone = taken_back(live)
    items = []
    for path in sorted((ROOT / 'state' / 'publications').glob('*.json')):
        receipt = read(path, {})
        at = when(receipt.get('publishedAt'))
        if not at or not now - WINDOW <= at <= now - DELAY:
            continue
        for change in receipt.get('changes') or []:
            if change.get('changeId') in reverted or (change.get('kind'), change.get('id')) in gone:
                continue
            menu_hidden = ('menu', change.get('id')) in gone
            items += [t for t in tickets(change, at) if not (menu_hidden and t['type'] == 'menu-prices')]
    return items


def approved_art(now: dt.datetime) -> list[dict]:
    """Pictures the owner approved for QT Gamer on Telegram (gamer/approved/<id>.json)."""
    times = [when((read(p, {}) or {}).get('approvedAt')) for p in (ROOT / 'gamer' / 'approved').glob('*.json')]
    return [{'chef': 'artist', 'type': 'art', 'at': iso(t), 'n': 1} for t in times if t and now - WINDOW <= t <= now - DELAY]


def member_recipes(now: dt.datetime) -> list[dict]:
    """Recipes QT Videomaker wrote for members, from ai_recipes_bridge's ledger (counts only: requests are private)."""
    out = []
    ledger = ROOT / 'ai-recipes' / 'done.jsonl'
    for line in (ledger.read_text(encoding='utf-8').splitlines() if ledger.exists() else []):
        try:
            row = json.loads(line)
        except ValueError:
            continue
        t = when(row.get('at'))
        if row.get('ok') and t and now - WINDOW <= t <= now - DELAY:
            out.append({'chef': 'writer', 'type': 'member-recipes', 'at': iso(t), 'n': 1})
    return out


def merge_counts(items: list[dict]) -> list[dict]:
    """One ticket per chef, type and Singapore day for counted work (closures, cancelled events, pictures, member recipes)."""
    kept, counted = [], {}
    for item in items:
        if 'place' in item or 'title' in item:
            kept.append(item)
            continue
        key = (item['chef'], item['type'], sg_day(when(item['at'])))
        if key in counted:
            counted[key]['n'] += item['n']
            counted[key]['at'] = max(counted[key]['at'], item['at'])
        else:
            counted[key] = dict(item)
    return kept + list(counted.values())


def reason_category(reason: str) -> str:
    low = (reason or '').lower()
    return next((key for key, words in REASONS if any(w in low for w in words)), 'other')


def sent_back(now: dt.datetime) -> list[dict]:
    today, tally = sg_day(now), {}
    for outcome in (read(ROOT / 'state' / 'publication-outcomes.json', {}) or {}).values():
        at = when(outcome.get('at'))
        if outcome.get('decision') != 'approved' and at and sg_day(at) == today and at <= now - DELAY:
            key = reason_category(outcome.get('reason', ''))
            tally[key] = tally.get(key, 0) + 1
    return [{'reason': key, 'count': n} for key, n in sorted(tally.items(), key=lambda kv: -kv[1])]


def next_shift(now: dt.datetime, start_hour: int) -> dt.datetime:
    local = now.astimezone(SG)
    start = local.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    return start if start > local else start + dt.timedelta(days=1)


def newest(times) -> dt.datetime | None:
    times = [t for t in times if t]
    return max(times) if times else None


def mtime(path: Path) -> dt.datetime | None:
    try:
        return dt.datetime.fromtimestamp(path.stat().st_mtime, dt.timezone.utc)
    except OSError:
        return None


def calls(prefixes: tuple[str, ...], runs: list[Path]):
    """Each model call folder of a chef in recent rounds (a call folder holds prompt.txt; publication nests one level down)."""
    for run in runs:
        for sub in (s for s in run.iterdir() if s.is_dir() and s.name.startswith(prefixes)):
            yield from (p.parent for p in [sub / 'prompt.txt', *sub.glob('*/prompt.txt')] if p.exists())


def chef_activity(prefixes: tuple[str, ...], runs: list[Path], now: dt.datetime) -> tuple[dt.datetime | None, dt.datetime | None]:
    """(since, last): since is when the chef's running call started (None when nothing runs now); last is its latest touch.
    A call is running while its live.json exists (workflow.execute_model writes it and removes it when the call ends, failed
    or not), however long the model stays quiet."""
    since = last = None
    for folder in calls(prefixes, runs):
        last = newest([last, newest(mtime(f) for f in folder.iterdir())])
        started = mtime(folder / 'live.json')
        if started and now - started < STUCK:
            since = newest([since, started])
    return since, last


def chef_states(now: dt.datetime) -> list[dict]:
    """Working while a model call runs (and a few minutes after), at any hour: the owner wants the page live (30 Oct 2026)."""
    runs = [r for r in sorted((ROOT / 'runs').glob('2*'))[-6:] + sorted((ROOT / 'runs').glob('publish-*'))[-3:] if r.is_dir()]
    activity = {chef: chef_activity(prefixes, runs, now) for chef, prefixes in RUN_FOLDERS.items()}
    busy = {chef: bool(since or last and now - last < RECENT) for chef, (since, last) in activity.items()}
    states = []
    for chef in ('scout', 'wok', 'host'):
        since, last = activity[chef]
        entry = {'id': chef, 'state': 'working' if busy[chef] else 'resting'}
        if busy[chef]:
            entry['since'] = iso(since or last)
        elif (window := ROLE_WINDOWS.get(chef)) and not window[0] <= now.astimezone(SG).hour < window[1]:
            entry['nextShift'] = iso(next_shift(now, window[0]))
        states.append(entry)
    since, last = activity['head']
    if busy['head']:
        states.append({'id': 'head', 'state': 'reviewing', 'since': iso(since or last)})
    else:
        states.append({'id': 'head', 'state': 'working' if any(busy.values()) else 'resting'})
    gamer = read(ROOT / 'gamer' / 'state.json', {}) or {}
    waiting = sum(1 for a in (gamer.get('assets') or {}).values() if a.get('status') == 'awaiting-owner')
    drawn = newest(mtime(p) for p in (ROOT / 'gamer' / 'runs').glob('*'))
    if waiting:
        states.append({'id': 'artist', 'state': 'waiting', 'waiting': waiting})
    else:
        states.append({'id': 'artist', 'state': 'working' if drawn and now - drawn < LIVE else 'resting'})
    wrote = mtime(ROOT / 'ai-recipes' / 'last.json')
    states.append({'id': 'writer', 'state': 'working' if wrote and now - wrote < LIVE else 'resting'})
    return states


def build(live: dict, now: dt.datetime | None = None) -> dict:
    now = now or dt.datetime.now(dt.timezone.utc)
    items = merge_counts(published(now, live) + approved_art(now) + member_recipes(now))
    items.sort(key=lambda i: i['at'], reverse=True)
    today = sg_day(now)
    back = sent_back(now)
    feed = {
        'version': 1, 'generatedAt': iso(now), 'delayMinutes': int(DELAY.total_seconds() // 60),
        'chefs': chef_states(now),
        'today': {'published': sum(i.get('n', 1) if i['type'] in ('closures', 'event-removed') else 1
                                   for i in items if sg_day(when(i['at'])) == today and i['chef'] in ('scout', 'wok', 'host')),
                  'sentBack': sum(s['count'] for s in back)},
        'sentBack': back,
        'items': items[:MAX_ITEMS],
    }
    while len(json.dumps(feed, ensure_ascii=False, separators=(',', ':')).encode()) > MAX_BYTES and feed['items']:
        feed['items'].pop()  # the oldest go first; the app refuses anything over 16 KB
    return feed


def push(feed: dict) -> dict:
    """One signed POST to the app with the publisher key, like the other bot routes (app_signing.py)."""
    raw = json.dumps(feed, ensure_ascii=False, separators=(',', ':')).encode()
    with open_signed(ROOT, 'POST', ROUTE, raw, timeout=30) as response:
        return json.loads(response.read(10_000))


def push_latest(editorial) -> dict | None:
    """Push the newest snapshot, one push at a time. A push asked for while another runs leaves `wanted` and returns at once;
    the running push sees it and sends once more. So a burst of pings from parallel calls costs one or two pushes, never a
    queue of waiting processes, and the alarm stops a hung push before the timer's 120 s limit so the lock is never held."""
    import fcntl
    import signal
    signal.alarm(110)
    wanted, result = ROOT / 'state' / 'kitchen-feed.wanted', None
    wanted.touch()
    while wanted.exists():  # checked again after the lock is released, so a request made just then is not lost
        with (ROOT / 'state' / 'kitchen-feed.lock').open('a+') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return result
            while wanted.exists():
                wanted.unlink(missing_ok=True)
                feed = build(editorial('GET', '/control/state'))
                result = push(feed)
                (ROOT / 'state' / 'kitchen-feed.json').write_text(json.dumps({'pushedAt': feed['generatedAt'], 'items': result.get('items')}),
                                                                  encoding='utf-8')
    return result


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--push', action='store_true', help='send the snapshot to the app')
    args = ap.parse_args()
    from publisher import request as editorial  # the signed, read-only state route the publisher already uses
    if args.push:
        print(json.dumps(push_latest(editorial)))
    else:
        print(json.dumps(build(editorial('GET', '/control/state')), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
