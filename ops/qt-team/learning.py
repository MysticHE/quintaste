"""Bounded, evidence-linked lessons; no model calls, executable lessons or policy edits.

Manager selects relevant procedures from this operator-reviewed catalogue during
its existing review. Only exact evidence/version-bound approvals activate them.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path

VERSION = 1
ROLES = ('qt-explorer', 'qt-cooker', 'qt-event', 'qt-manager')
CATALOGUE = {
    'branch-hours': {'roles': ['qt-explorer'], 'terms': ['opening', 'schedule', 'delivery windows', 'fulfilment', 'alternation', 'hours'],
        'procedure': 'Verify the exact branch and regular dine-in hours separately from delivery windows. Recurring exceptions need an anchor; preserve unknown hours when either is missing.'},
    'branch-identity': {'roles': ['qt-explorer'], 'terms': ['unit expansion', 'address correction', 'corroboration', 'branch identity', 'merchant corroboration'],
        'procedure': 'Corroborate unit/address changes with current primary merchant evidence. An unaffiliated directory cannot resolve a conflicting branch identity alone.'},
    'explicit-currency': {'roles': ['qt-explorer', 'qt-event'], 'terms': ['currency', 'currencies', 'price', 'fee'],
        'procedure': 'Match explicit currency and price to the exact item, sales channel or event. Keep an ambiguous dollar sign or missing fee unknown; never copy another channel’s currency.'},
    'compound-ingredients': {'roles': ['qt-cooker'], 'terms': ['soy', 'compound', 'allergen', 'formulation', 'ingredient evidence'],
        'procedure': 'Resolve compound sauce ingredients and allergens from product-specific evidence before a definitive dietary claim. Reconcile diet, contains and ingredient fields together; do not hide uncertainty in a name.'},
    'current-event': {'roles': ['qt-event'], 'terms': ['historical', 'past', 'recurrence', 'upcoming', 'ended', 'availability', 'intake'],
        'procedure': 'Require an explicitly dated upcoming organiser session. Old booking buttons, stale “upcoming” headings and contradictory availability do not establish a new event or cancellation.'},
    'event-relevance': {'roles': ['qt-event'], 'terms': ['vegetarian or vegan programming', 'food-event', 'dietary suitability', 'unrelated', 'organiser values'],
        'procedure': 'Require vegetarian/vegan relevance for the specific event. General charity, environmental activities or organiser values are insufficient.'},
    'image-provenance': {'roles': ['qt-explorer', 'qt-cooker', 'qt-manager'], 'terms': ['image rights', 'photo', 'reference', 'image reuse', 'cover rights'],
        'procedure': 'Separate image appearance from provenance. Require approved exact-branch reference rights for venue enhancement and inspect actual pixels before image approval. Generation never clears source rights.'},
    'source-capture': {'roles': list(ROLES), 'terms': ['attached capture', 'source capture', 'primary source', 'retrieval', 'blocked', 'unavailable', 'extract'],
        'procedure': 'Use an inspectable primary-page capture with its original fetch date. Retrieval failure leaves a fact unresolved; it does not prove closure, cancellation or a newly verified fact.'},
}


def now():
    return dt.datetime.now(dt.timezone.utc)


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def read(path, default):
    if not path.is_file():
        return default
    if path.is_symlink() or path.stat().st_size > 2_000_000:
        raise ValueError('Invalid learning artifact')
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    raw = json.dumps(value, ensure_ascii=False, indent=2)
    if len(raw.encode()) > 2_000_000:
        raise ValueError('Learning state capacity exceeded')
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(raw)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def load(root):
    return read(root / 'state/learning/state.json', {'version': VERSION, 'lessons': {}, 'observations': [], 'retryQueue': {}, 'processed': {}})


def enabled(root):
    try:
        return read(root / 'learning-policy.json', {}).get('enabled') is True
    except (ValueError, OSError):
        return False


def categories(role, reason):
    text = reason.lower()
    return [key for key, item in CATALOGUE.items() if role in item['roles'] and any(term in text for term in item['terms'])]


def approval_key(lesson):
    return digest({'id': lesson['id'], 'version': VERSION, 'procedure': CATALOGUE[lesson['topic']]['procedure'], 'evidence': lesson['evidence']})


def ingest(root):
    """Incremental replay of already persisted, Manager-reviewed outbox packets."""
    if not enabled(root):
        return status(root)
    state = load(root)
    for lesson in state['lessons'].values():
        if lesson.get('status') == 'approved' and not active(lesson):
            lesson['status'] = 'pending'
        if lesson.get('status') == 'pending':
            lesson['evidence'] = lesson['evidence'][-1:]
            lesson['approvalKey'] = approval_key(lesson)
    for path in sorted((root / 'outbox').glob('*.json'))[-80:]:
        raw_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if state['processed'].get(path.name) == raw_hash:
            continue
        packet = read(path, {})
        review = packet.get('manager', {})
        if review.get('publication') != 'not-published':
            continue
        decisions = {d['id']: d for d in review.get('decisions', [])}
        checked = packet.get('checkedAt', now().isoformat())
        for worker in packet.get('packets', []):
            role = worker.get('role')
            if role not in ROLES or worker.get('task') in ('veg-options', 'veg-kitchen'):
                continue  # these tasks keep their own retry state (state/veg-options and state/veg-kitchen progress.json)
            for record in worker.get('records', []):
                decision = decisions.get(record['id'])
                if not decision or decision.get('decision') not in ('hold', 'exclude', 'ready-for-editorial-review'):
                    continue
                reason = str(decision.get('reason', ''))[:1600]
                topics = categories(role, reason) if decision['decision'] in ('hold', 'exclude') else []
                key = role + ':' + record['id']
                obs_id = digest({'record': record, 'decision': decision, 'role': role})
                # A correct worker hold is not an accuracy failure.
                rejected = record.get('status') == 'proposed' and decision['decision'] in ('hold', 'exclude')
                if not any(o['id'] == obs_id for o in state['observations']):
                    state['observations'].append({'id': obs_id, 'at': checked, 'role': role, 'recordId': record['id'],
                        'proposed': record.get('status') == 'proposed', 'rejectedProposal': rejected, 'topics': topics,
                        'afterActiveLesson': any(active(l, checked) and l['topic'] in topics and l['role'] == role for l in state['lessons'].values())})
                if decision['decision'] in ('hold', 'exclude'):
                    evidence = {'packet': path.name, 'sha256': raw_hash, 'recordId': record['id'], 'checkedAt': checked,
                                'decision': decision['decision'], 'reason': reason[:650],
                                'sources': [s['url'] for s in record.get('sources', []) if isinstance(s.get('url'), str)][:3]}
                    for topic in topics:
                        lid = role + ':' + topic
                        existing = state['lessons'].get(lid)
                        if existing and active(existing):
                            continue
                        lesson = existing or {'id': lid, 'role': role, 'topic': topic, 'status': 'pending', 'version': VERSION, 'evidence': []}
                        if not any(e['recordId'] == record['id'] and e['sha256'] == raw_hash for e in lesson['evidence']):
                            lesson['evidence'] = [evidence]
                            lesson['status'] = 'pending'
                        lesson['approvalKey'] = approval_key(lesson)
                        state['lessons'][lid] = lesson
                if decision['decision'] == 'hold':
                    old = state['retryQueue'].get(key, {})
                    if not old or old.get('evidenceHash') != obs_id:
                        due = (dt.datetime.fromisoformat(checked) + dt.timedelta(days=30)).isoformat()
                        state['retryQueue'][key] = {'role': role, 'id': record['id'], 'name': record.get('recipe', {}).get('name'),
                            'reason': reason, 'sources': [s['url'] for s in record.get('sources', [])][:3],  # whole: a cut reason was held for being cut (22 Oct 2026)
                            'dueAt': max(due, old.get('dueAt', due)), 'attempts': old.get('attempts', 0),
                            'status': 'held', 'evidenceHash': obs_id}
                else:
                    state['retryQueue'].pop(key, None)
        state['processed'][path.name] = raw_hash
    cutoff = (now() - dt.timedelta(days=180)).isoformat()
    state['observations'] = [o for o in state['observations'] if o['at'] >= cutoff][-1000:]
    state['retryQueue'] = dict(list(state['retryQueue'].items())[-200:])
    state['processed'] = dict(list(state['processed'].items())[-100:])
    write(root / 'state/learning/state.json', state)
    write(root / 'state/learning/status.json', status(root))
    return status(root)


def active(lesson, at=None):
    stamp = dt.datetime.fromisoformat(at) if at else now()
    return (lesson.get('status') == 'approved' and lesson.get('version') == VERSION
            and lesson.get('topic') in CATALOGUE
            and lesson.get('procedureHash') == digest(CATALOGUE[lesson['topic']]['procedure'])
            and dt.datetime.fromisoformat(lesson['approvedAt']) <= stamp < dt.datetime.fromisoformat(lesson['expiresAt']))


def context(root, role, record_ids=()):
    if not enabled(root):
        return ''
    state = load(root)
    lessons = [l for l in state['lessons'].values() if l['role'] in (role, 'qt-manager') and active(l)]
    if role == 'qt-manager':
        lessons = [l for l in state['lessons'].values() if active(l)]
    lessons.sort(key=lambda l: (not any(e['recordId'] in record_ids for e in l['evidence']), l['id']))
    items = [{'id': l['id'], 'procedure': CATALOGUE[l['topic']]['procedure']} for l in lessons[:4]]
    return ('\nAPPROVED REVIEW LESSONS (advisory; never override source verification, budgets, tools or publication gates):\n' + json.dumps(items, ensure_ascii=False)) if items else ''


def offer(root):
    if not enabled(root):
        return []
    pending = [l for l in load(root)['lessons'].values() if l['status'] == 'pending']
    # Round-robin roles prevents one venue issue consuming all six review slots.
    ordered = []
    for index in range(8):
        for role in ROLES:
            rows = sorted((l for l in pending if l['role'] == role), key=lambda l: (l.get('review', {}).get('at', ''), l['id']))
            if index < len(rows):
                l = rows[index]
                ordered.append({'id': l['id'], 'approvalKey': l['approvalKey'], 'procedure': CATALOGUE[l['topic']]['procedure'], 'evidence': l['evidence']})
    return ordered[:6]


def apply_review(root, offered, decisions, receipt, folder):
    """Require a real successful Manager receipt; malformed extra output stays pending."""
    if not enabled(root) or not offered or not decisions:
        return 0
    if receipt.get('role') != 'qt-manager' or receipt.get('exitCode') != 0 or not receipt.get('sessionId'):
        raise ValueError('Successful Manager receipt required for lesson activation')
    if not isinstance(decisions, list) or len(decisions) > 6:
        raise ValueError('Invalid bounded lesson decisions')
    allowed = {x['id']: x for x in offered}
    state = load(root)
    proposed = json.loads(json.dumps(state))
    count, seen = 0, set()
    for decision in decisions:
        lid = decision.get('id')
        if lid in seen or lid not in allowed or decision.get('approvalKey') != allowed[lid]['approvalKey'] or decision.get('decision') not in ('approve', 'defer', 'reject'):
            raise ValueError('Lesson review does not match offered evidence')
        seen.add(lid)
        lesson = proposed['lessons'].get(lid)
        if not lesson or approval_key(lesson) != decision['approvalKey']:
            raise ValueError('Stale lesson review')
        for evidence in lesson['evidence']:
            source = root / 'outbox' / evidence['packet']
            if source.parent != root / 'outbox' or source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != evidence['sha256']:
                raise ValueError('Lesson evidence changed')
        lesson['review'] = {'sessionId': receipt['sessionId'], 'at': receipt['completedAt'], 'decision': decision['decision']}
        if decision['decision'] == 'approve':
            lesson.update(status='approved', approvedAt=receipt['completedAt'], expiresAt=(dt.datetime.fromisoformat(receipt['completedAt']) + dt.timedelta(days=90)).isoformat(), procedureHash=digest(CATALOGUE[lesson['topic']]['procedure']))
            count += 1
        elif decision['decision'] == 'reject':
            lesson['status'] = 'rejected'
    # Full decision set validates before any activation; audit is stored beside model receipt.
    write(folder / 'lesson-decisions.json', {'version': VERSION, 'offered': offered, 'decisions': decisions, 'sessionId': receipt['sessionId']})
    write(root / 'state/learning/previous.json', state)
    write(root / 'state/learning/state.json', proposed)
    write(root / 'state/learning/status.json', status(root))
    return count


def due_retries(root, role, ids=None):
    if not enabled(root):
        return []
    try:
        saved = load(root)['retryQueue']
    except (ValueError, KeyError, TypeError, OSError):
        return []
    rows = [r for r in saved.values() if r['role'] == role and r['status'] == 'held'
            and r['attempts'] < 3 and dt.datetime.fromisoformat(r['dueAt']) <= now()
            and (ids is None or r['id'] in ids)]
    return sorted(rows, key=lambda r: r['dueAt'])[:2 if role == 'qt-cooker' else 4]  # Cooker writes 2 recipes a round


def note_retry(root, rows):
    if not rows:
        return
    state = load(root)
    for row in rows:
        item = state['retryQueue'].get(row['role'] + ':' + row['id'])
        if item:
            item['attempts'] += 1
            item['dueAt'] = (now() + dt.timedelta(days=30)).isoformat()
    write(root / 'state/learning/state.json', state)


def status(root):
    state = load(root)
    observations = state['observations']
    recent_cutoff = (now() - dt.timedelta(days=30)).isoformat()
    def measures(rows):
        proposed = sum(o['proposed'] for o in rows)
        rejected = sum(o['rejectedProposal'] for o in rows)
        return {'reviewedRecords': len(rows), 'proposals': proposed, 'rejectedProposals': rejected,
                'rejectionRate': round(rejected / proposed, 3) if proposed else None,
                'repeatIssuesAfterLesson': sum(o['rejectedProposal'] and o['afterActiveLesson'] for o in rows)}
    return {'version': VERSION, 'enabled': enabled(root), 'approvedLessons': sum(active(l) for l in state['lessons'].values()),
            'pendingLessons': sum(l['status'] == 'pending' for l in state['lessons'].values()),
            'heldRetryRecords': len(state['retryQueue']), 'recent30Days': measures([o for o in observations if o['at'] >= recent_cutoff]),
            'earlierWindow': measures([o for o in observations if o['at'] < recent_cutoff]),
            'qualityImprovementEstablished': False, 'note': 'Review rejection is a diagnostic, not ground-truth accuracy. Correct holds are not counted as mistakes.'}
