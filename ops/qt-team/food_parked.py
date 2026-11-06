"""Publication items waiting on a food answer, set aside so nothing behind them waits (owner, 6 Nov 2026).

A batch used to be all or nothing: two unanswered owner questions held every event and recipe for three days, while each round still
reported "passed". Now the server's refusal names its records (server/food-review/editorial.mjs). A question for the owner, or a
review Mint has not finished in MINT_WAIT, moves its record here and the rest of the batch goes out. Each record is offered again, alone
and against the live revision; it publishes once its food review clears and leaves for good if it is held.

Rebasing is safe here only because of `expectedHash`: the record goes out unchanged, and only while its live version is still the one
QT Manager reviewed. A record that moved on goes back through the usual review instead. A batch id is derived from its content, and the
parent of an offer whose answer never arrived is kept, so a publish whose response was lost is replayed for its receipt, never repeated.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse

FOLDER = 'state/food-parked'
OFFERS = 'state/food-parked-offers.json'
MINT_WAIT = 2 * 3600        # a batch waits this long for Mint and Kaya before their unfinished records are set aside too
OFFERS_PER_PASS = 6         # no model calls: a refused offer costs one signed request. Least recently offered first, so none can starve
OFFER_EVERY = 600           # a round calls the publisher up to 12 times; each record needs one offer per round, not twelve
REFUSED_LIMIT = 3 * 86400   # a refusal that looks temporary but lasts this long is reported and the item given up
REFRESH_DAYS = 14           # a live event with no real change is republished this often, to keep its checked date honest
# What a member would act on. The model rewords titles, fee notes and diet evidence on every recheck; none of that is a new fact, and
# publishing it would cancel the owner's answer (reviews bind to exact text) and ask again every evening.
EVENT_FACTS = ('startsAt', 'endsAt', 'feeAmount', 'currency', 'status', 'registrationDeadline')
EVENT_PLACES = ('location', 'address', 'organiser')  # compared by _same_place
EVIDENCE_OVERLAP = 0.3      # measured on 104 real rechecks: rewording stays above this (median 0.88), one pair fell below
FOOD_PENDING = 'Food-content review is pending. The approved batch is retained for retry.'
BASELINE_CHANGED = 'Publication baseline changed'
RECORD_CHANGED = 'Record changed since review'
TEMPORARY = ('capacity', 'reserve')  # the server cannot take anything right now; not a verdict on this item
TRACKING = re.compile(r'^(utm_.*|fbclid|gclid|igshid|mc_[a-z]+|ref)$')


def folder(root: Path) -> Path:
    return root / FOLDER


def key_of(record: dict) -> str:
    return record['kind'] + ':' + record['id']


def entry_path(root: Path, kind: str, rid: str) -> Path:
    return folder(root) / (hashlib.sha256(f'{kind}:{rid}'.encode()).hexdigest()[:32] + '.json')


def entries(root: Path) -> list:
    """Parked items, longest waiting first. An unreadable file is left for the operator and never stops the rest."""
    target, found = folder(root), []
    for path in target.glob('*.json') if target.is_dir() else ():
        try:
            row = json.loads(path.read_text())
            if isinstance(row.get('record'), dict) and row['record'].get('kind') and row['record'].get('id'):
                found.append(row)
        except (OSError, ValueError):
            continue
    return sorted(found, key=lambda row: row.get('parkedAt') or '')


def count(root: Path) -> int:
    return len(entries(root))


def parked_keys(root: Path) -> dict:
    return {(row['record']['kind'], row['record']['id']): row['record'] for row in entries(root)}


def read_offers(root: Path) -> dict:
    try:
        data = json.loads((root / OFFERS).read_text())
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def write_offers(root: Path, offers: dict) -> None:
    path = root / OFFERS
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.new')
    temp.write_text(json.dumps(offers))
    os.replace(temp, path)


def forget(root: Path, kind: str, rid: str) -> None:
    entry_path(root, kind, rid).unlink(missing_ok=True)
    offers = read_offers(root)
    if offers.pop(f'{kind}:{rid}', None) is not None:
        write_offers(root, offers)


def supersede(root: Path, records) -> None:
    """A newer reviewed version of a parked record replaces it: the older one must never go live over it."""
    for record in records:
        forget(root, record['kind'], record['id'])


def error_body(error) -> dict:
    """The JSON of a refused request, or {}: a refusal is often a proxy's HTML page."""
    try:
        body = json.loads(error.read(65536))
    except (ValueError, TypeError, AttributeError, OSError):
        return {}
    return body if isinstance(body, dict) else {}


def named(rows) -> set:
    return {(r.get('kind'), r.get('id')) for r in rows or [] if isinstance(r, dict)}


def split(batch: dict, body: dict, age: float) -> dict | None:
    """Which records of a refused batch leave it: {'park': [...], 'hold': [...], 'keep': [...]}, or None when the batch should simply wait
    (Mint and Kaya are still on it) or the refusal named nothing (an app without this release, or another kind of refusal)."""
    waiting = body.get('waiting') or []
    held = named(body.get('held'))
    if age >= MINT_WAIT:
        parking = named(waiting)
    else:
        parking = named(r for r in waiting if isinstance(r, dict) and r.get('state') == 'asked')
    key = lambda r: (r['kind'], r['id'])
    known = {key(r) for r in batch['records']}
    if not (parking | held) & known:
        return None
    return {'hold': [r for r in batch['records'] if key(r) in held], 'park': [r for r in batch['records'] if key(r) in parking - held],
            'keep': [r for r in batch['records'] if key(r) not in parking | held]}


def assets_for(record_or_records, assets) -> list:
    from publisher import record_images
    records = [record_or_records] if isinstance(record_or_records, dict) else record_or_records
    used = {sha for record in records for sha in record_images(record.get('data') or {})}
    return [a for a in assets or [] if a.get('sha256') in used]


def park(root: Path, batch: dict, record: dict, when: str) -> None:
    target = folder(root)
    target.mkdir(parents=True, exist_ok=True)
    path = entry_path(root, record['kind'], record['id'])
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps({'parkedAt': when, 'fromBatch': batch.get('id'), 'record': record, 'assets': assets_for(record, batch.get('assets'))}))
    temp.chmod(0o600)
    temp.replace(path)


def remainder(batch: dict, keep: list, tag: str) -> dict:
    """The batch without the records that left it. Same parent and bytes per record; a new id, because the server binds an id to its content."""
    return dict(batch, id=(batch['id'] + '-' + tag)[:120], records=keep, assets=assets_for(keep, batch.get('assets')))


def _text(value) -> str:
    return ' '.join(str(value or '').split()).casefold()


def _same_place(one, other) -> bool:
    """The same text, or the same with detail added at the end. All ten real differences across 104 rechecks but one were this
    ("Geylang Serai CC" -> "Geylang Serai CC, Level 1 Culinary Studio"); "Other hall", "Hallway" and "Hall 2" are not "Hall"."""
    a, b = _text(one).replace(' & ', ' and '), _text(other).replace(' & ', ' and ')
    if a == b or not a or not b:
        return a == b
    short, full = sorted((a, b), key=len)
    return full.startswith(short) and not re.match(r'\s*\d|[^\W_]', full[len(short):])


def _same_link(one, other) -> bool:
    """A link gaining "?view=details" is the same page; two different query values are not."""
    def parts(url):
        parsed = urllib.parse.urlsplit(str(url or '').strip())
        query = sorted((k, v) for k, v in urllib.parse.parse_qsl(parsed.query) if not TRACKING.match(k))
        return parsed.netloc.casefold(), parsed.path.rstrip('/'), query
    a, b = parts(one), parts(other)
    return a[:2] == b[:2] and (a[2] == b[2] or not a[2] or not b[2])


def _same_food(one, other) -> bool:
    words = lambda text: set(re.findall(r'[^\W_]+', _text(text)))
    a, b = words(one), words(other)
    return not a or not b or len(a & b) / len(a | b) >= EVIDENCE_OVERLAP


def same_facts(data: dict, other: dict) -> bool:
    return (all(data.get(k) == other.get(k) for k in EVENT_FACTS) and all(_same_place(data.get(k), other.get(k)) for k in EVENT_PLACES)
            and _same_link(data.get('registrationUrl'), other.get('registrationUrl')) and _same_food(data.get('dietEvidence'), other.get('dietEvidence')))


def event_unchanged(data: dict, live: dict | None, parked: dict | None, now: dt.datetime | None = None, repair: bool = False) -> bool:
    """True when this event proposal states no new fact against the parked or live version, so it need not be reviewed or published.
    `repair`: this proposal fixes wording the live version must not keep (workflow.events_to_refresh), so it always goes out."""
    now = now or dt.datetime.now(dt.timezone.utc)
    if parked and same_facts(data, parked.get('data') or {}):
        return True
    if repair or not live or not same_facts(data, live):
        return False
    try:
        checked = dt.datetime.fromisoformat(str(live.get('checkedAt')).replace('Z', '+00:00'))
    except ValueError:
        return False
    return now - (checked if checked.tzinfo else checked.replace(tzinfo=dt.timezone.utc)) < dt.timedelta(days=REFRESH_DAYS)


def _live_hash(live: dict, kind: str, rid: str):
    rows = live.get('venues', []) if kind == 'venue' else live.get('records', [])
    return next((r['hash'] for r in rows if (kind == 'venue' or r.get('kind') == kind) and r['id'] == rid), None)


def _passed(record: dict, now: dt.datetime) -> bool:
    if record['kind'] != 'event':
        return False
    try:
        return dt.datetime.fromisoformat(str(record['data']['startsAt'])) <= now
    except (KeyError, ValueError, TypeError):
        return False


def _name(record: dict) -> str:
    data = record.get('data') or {}
    return str(data.get('title') or data.get('name') or record['id'])[:120]


def _tell_owner(root: Path, record: dict, why: str) -> None:
    """The owner hears when an item leaves without their decision. A notice that cannot be left never stops publication."""
    try:
        import bot_notices
        bot_notices.post(root, 'parked-left:' + hashlib.sha256(key_of(record).encode()).hexdigest()[:40],
                         'QT Manager · ' + _name(record) + " won't publish: " + why + '. Its food question is closed.')
    except (OSError, ValueError, ImportError):
        pass


class Ops:
    """What the publisher lends this module: its signed request, how a publication is recorded and how an outcome is kept."""

    def __init__(self, request, finished, settle, now_text):
        self.request, self.finished, self.settle, self.now_text = request, finished, settle, now_text

    def close_question(self, record: dict) -> None:
        """Closes the open food question of an item that left, so the daily reminder stops asking. An older app has no such route."""
        try:
            self.request('POST', '/control/food-withdraw', {'kind': record['kind'], 'id': record['id']})
        except Exception as exc:
            print(json.dumps({'foodWithdraw': type(exc).__name__}), flush=True)

    def leave(self, root: Path, record: dict, why: str, final: bool = True, tell: bool = True) -> None:
        """The record will not go out. `final`: keep a hold so it is never offered again; otherwise a fresh proposal gets a fresh review."""
        self.close_question(record)
        self.settle(record, {'at': self.now_text(), 'decision': 'hold', 'reason': why[:300]} if final else None)
        forget(root, record['kind'], record['id'])
        if tell:
            _tell_owner(root, record, why)


def batch_for(row: dict, parent: str) -> dict:
    record = row['record']
    digest = hashlib.sha256(f"{key_of(record)}:{record.get('proposalHash')}:{parent}".encode()).hexdigest()[:24]
    return {'version': 1, 'id': 'qt-parked-' + digest, 'parent': parent, 'records': [record], 'assets': row.get('assets') or []}


def _refused(root: Path, row: dict, ops: Ops, body: dict, offers: dict) -> bool:
    """A 422 for one record. True when the rest of this pass should stop, because the server is refusing everything for now."""
    from publisher import BATCH_LEVEL_REJECTIONS
    record, reason = row['record'], str(body.get('error') or 'Server rejected the record')
    if (record['kind'], record['id']) in named(body.get('held')):
        ops.leave(root, record, 'Food review held it', tell=False)  # the owner's or the reviewers' own decision
        return False
    if RECORD_CHANGED in reason:
        ops.leave(root, record, 'its live version changed while it waited', final=False, tell=False)
        return False
    lowered = reason.lower()
    if not any(word in lowered for word in TEMPORARY + BATCH_LEVEL_REJECTIONS):
        ops.leave(root, record, 'the app refused it (' + reason[:200] + ')')
        return False
    entry = offers.setdefault(key_of(record), {})
    entry.setdefault('refusedSince', time.time())
    write_offers(root, offers)
    if time.time() - entry['refusedSince'] >= REFUSED_LIMIT:
        ops.leave(root, record, 'the app kept refusing it (' + reason[:200] + ')')
        return False
    return True


def _replay(row: dict, ops: Ops, parent: str):
    """An earlier offer's answer never arrived, and the live revision has moved since. Asks again with the same batch: the server returns
    the receipt if it did publish. Returns the receipt, or None when it certainly did not. Other refusals raise."""
    try:
        return ops.request('POST', '/control/publish', batch_for(row, parent))
    except urllib.error.HTTPError as error:
        if error.code in (409, 422):
            return None
        raise


def _went_live(root: Path, row: dict, ops: Ops, batch: dict, receipt: dict, published: list) -> None:
    """The server took it. A network failure while recording raises and keeps the entry, so the next pass replays for the receipt. A receipt
    that can never be confirmed (a newer change has already replaced this one) must not hold the entry, and its turn, for ever."""
    try:
        published.append(ops.finished(batch, receipt))
    except ValueError as exc:
        print(json.dumps({'parkedReceipt': str(exc)[:120], 'batch': batch['id']}), flush=True)
    forget(root, row['record']['kind'], row['record']['id'])


def _expire(root: Path, row: dict, ops: Ops, live: dict) -> bool:
    """True when the record left because it can no longer go out as reviewed."""
    record, kind, rid = row['record'], row['record']['kind'], row['record']['id']
    if any((r.get('kind'), r.get('id')) == (kind, rid) for r in live.get('removals', [])):
        ops.leave(root, record, 'you removed it while its food answer was waiting', tell=False)
    elif _passed(record, dt.datetime.now(dt.timezone.utc)):
        ops.leave(root, record, 'the event passed while its food answer was waiting')
    elif _live_hash(live, kind, rid) != record.get('expectedHash'):
        ops.leave(root, record, 'its live version changed while it waited', final=False, tell=False)
    else:
        return False
    return True


def _offer(root: Path, row: dict, ops: Ops, live: dict, offers: dict, published: list) -> str:
    """One offer. Returns 'next', 'moved' (the live revision changed) or 'stop'."""
    key = key_of(row['record'])
    entry = offers.setdefault(key, {})
    unknown = entry.get('parent')
    entry['at'] = time.time()  # first of all: a record that keeps failing goes to the back of the line and cannot block the others
    write_offers(root, offers)
    if unknown and unknown != live['revision']:
        receipt = _replay(row, ops, unknown)
        if receipt:
            _went_live(root, row, ops, batch_for(row, unknown), receipt, published)
            return 'moved'
        entry.pop('parent', None)
        write_offers(root, offers)
    if _expire(root, row, ops, live):
        return 'next'
    entry['parent'] = live['revision']  # kept until an answer arrives, so a lost response can be replayed
    write_offers(root, offers)
    batch = batch_for(row, live['revision'])
    try:
        receipt = ops.request('POST', '/control/publish', batch)
    except urllib.error.HTTPError as error:
        body = error_body(error)
        entry.pop('parent', None)  # a definite answer: nothing was published
        if error.code == 409 and body.get('error') == FOOD_PENDING:
            entry.pop('refusedSince', None)
        write_offers(root, offers)
        if error.code == 409:
            return 'moved' if body.get('error') == BASELINE_CHANGED else 'next'
        if error.code == 422:
            return 'stop' if _refused(root, row, ops, body, offers) else 'next'
        return 'stop'  # the app is busy: the next round tries again
    _went_live(root, row, ops, batch, receipt, published)
    return 'moved'


def retry(root: Path, request, finished, settle, now_text, limit: int = OFFERS_PER_PASS) -> list:
    """Offers parked records again; returns the results of those that went live. `finished(batch, receipt)` records one publication,
    `settle(record, outcome)` records a hold (or None to let the record be offered for review again). Anything that goes wrong here stops
    these offers and leaves the records for the next round; it never stops the publication pass behind it."""
    ops, published = Ops(request, finished, settle, now_text), []
    offers = read_offers(root)
    now = time.time()
    due = [row for row in entries(root) if now - (offers.get(key_of(row['record'])) or {}).get('at', 0) >= OFFER_EVERY]
    due.sort(key=lambda row: (offers.get(key_of(row['record'])) or {}).get('at', 0))
    if not due:
        return published
    try:
        live = request('GET', '/control/state')
        for row in due[:limit]:
            outcome = _offer(root, row, ops, live, read_offers(root), published)
            if outcome == 'stop':
                break
            if outcome == 'moved':
                live = request('GET', '/control/state')
    except Exception as exc:
        print(json.dumps({'parkedRetry': type(exc).__name__}), flush=True)
    return published


def _outdated(row: dict, decision, record: dict):
    """Why the newest proposal rules this parked record out, or None. A recheck that is merely unsure ("held", often a source that did not
    load) says nothing against the approved version; one that is held with different dates or fee means the version waiting here is stale."""
    if record['kind'] != 'event':
        return None
    event = row.get('event') if isinstance(row.get('event'), dict) else {}
    if row.get('status') == 'excluded' or decision == 'exclude':
        return 'the latest check no longer lists it'
    if event.get('status') == 'cancelled':
        return 'the latest check found it cancelled'
    if row.get('status') == 'held' or decision == 'hold':
        data = record.get('data') or {}
        if any(event.get(k) not in (None, '') and event.get(k) != data.get(k) for k in ('startsAt', 'endsAt', 'feeAmount', 'status')):
            return 'its details changed and the newer version was held'
    return None


def retire_outdated(root: Path, packages, request, settle, now_text) -> None:
    """A parked record whose newer proposal was excluded or held never reached a batch, so `supersede` never saw it. It must not go live
    when the owner answers the old question."""
    import event_twins
    parked, newest = parked_keys(root), {}
    listed = [(rid, record.get('data') or {}) for (kind, rid), record in parked.items() if kind == 'event']
    since = {(row['record']['kind'], row['record']['id']): str(row.get('parkedAt') or '') for row in entries(root)}
    for package in packages:
        at = str(package.get('checkedAt') or '')
        decisions = {d.get('id'): d.get('decision') for d in (package.get('manager') or {}).get('decisions', []) if isinstance(d, dict)}
        for packet in package.get('packets', []):
            kind = {'qt-event': 'event', 'qt-cooker': 'recipe'}.get(packet.get('role'))
            for row in packet.get('records', []) if kind else ():
                key = (kind, row.get('id'))
                event = row.get('event') if isinstance(row.get('event'), dict) else {}
                if kind == 'event' and key not in parked and event.get('status') == 'cancelled':  # only a cancellation: a copy is often excluded for being a copy
                    key = (kind, event_twins.find(dict(event, id=row.get('id')), listed))
                if key in parked and at > since[key] and at >= newest.get(key, ('',))[0]:
                    newest[key] = (at, row, decisions.get(row.get('id')))
    ops = Ops(request, None, settle, now_text)
    for key, (_, row, decision) in newest.items():
        why = _outdated(row, decision, parked[key])
        if why:
            ops.leave(root, parked[key], why)
