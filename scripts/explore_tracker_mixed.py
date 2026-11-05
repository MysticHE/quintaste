"""Reconcile an immutable Mixed Kitchen bot snapshot into the authoritative workbook.

This is a local import, not a source verification or a production publisher.
"""
from __future__ import annotations

import datetime as dt
import json
import shutil
from collections import Counter
from pathlib import Path

import openpyxl

import explore_tracker as t


def iso_timestamp(value):
    if isinstance(value, (int, float)):
        return dt.datetime.fromtimestamp(value, dt.timezone.utc).isoformat()
    return value or None


def append_records(wb, sheet, columns, rows):
    ws = wb[sheet]
    for row in rows:
        ws.append([row.get(column) for column in columns])


def import_candidates(wb, workbook: Path, snapshot: Path):
    t.validate(wb)
    assert 'Mixed candidates' not in wb or not t.records(wb, 'Mixed candidates'), (
        'Mixed candidates already exist: reconcile new observations without overwriting research.'
    )
    snapshot = snapshot.resolve()
    receipt = t.read(snapshot / 'census.json')
    assert receipt['readOnly'] is True
    for name in ['queue.json', 'progress.json']:
        assert t.sha(snapshot / name) == receipt['hashes'][name], 'Snapshot hash mismatch: ' + name
    queue = t.read(snapshot / 'queue.json')['candidates']
    progress = t.read(snapshot / 'progress.json')['candidates']
    local = t.read(t.ROOT / '.local/veg-options/queue-final.json')['candidates']
    assert len(queue) == 3172 == len({r['candidateId'] for r in queue})
    assert {(r['candidateId'], r['googlePlaceId']) for r in queue} == {
        (r['candidateId'], r['googlePlaceId']) for r in local
    }, 'Live candidate membership differs from the filtered harvest; review before import.'
    assert set(progress) <= {r['candidateId'] for r in queue}
    census = Counter(progress.get(r['candidateId'], {}).get('status', 'pending') for r in queue)
    assert dict(census) == receipt['byStatus'], 'Snapshot counts mismatch'

    original_hash = t.sha(workbook)
    backup = snapshot / 'workbook-before-import.xlsx'
    assert not backup.exists(), 'Immutable import backup already exists'
    shutil.copy2(workbook, backup)
    original = {name: list(wb[name].values) for name in t.SHEETS if name in wb}
    identities = t.read(t.ROOT / '.local/veg-options/identities.json')['records']
    enrichment = t.read(t.ROOT / '.local/veg-options/enrichment.json')['records']
    locations = {r['Location ID']: r for r in t.records(wb, 'Locations')}
    reference = str(snapshot.relative_to(t.ROOT)).replace('\\', '/')
    imported_at = t.now()

    # Preserve harvest order independently; the review batches prioritise untouched candidates.
    untouched = [r for r in queue if not progress.get(r['candidateId'], {}).get('attempts')]
    pending_retries = [r for r in queue if progress.get(r['candidateId'], {}).get('attempts')
                       and progress[r['candidateId']]['status'] == 'pending']
    held = [r for r in queue if progress.get(r['candidateId'], {}).get('status') == 'held']
    selected = untouched + pending_retries + held
    assert len(selected) == sum(census.get(s, 0) for s in ['pending', 'held'])
    assignments = {r['candidateId']: f'MK-20261024-{i // 50 + 1:03d}'
                   for i, r in enumerate(selected)}

    rows, evidence, checks = [], [], []
    for index, candidate in enumerate(queue, 1):
        cid = candidate['candidateId']
        historical = progress.get(cid, {})
        identity = identities.get(candidate['googlePlaceId'], {})
        harvest = enrichment.get(candidate['googlePlaceId'], {})
        name = identity.get('name') or {}
        status = historical.get('status', 'pending').upper().replace('-', '_')
        match = locations.get(cid)
        eid = 'MK-IMPORT-' + cid
        missing = status == 'PUBLISHED' and match is None
        reason = historical.get('reason') or historical.get('priorReason')
        next_action = {
            'PENDING': 'Check exact outlet identity, operation and merchant-labelled dishes; record sources, prices, hours and cover rights separately.',
            'HELD': 'Resolve the retained hold reason using new exact-outlet evidence; preserve prior limitations.',
            'NOT_QUALIFIED': 'Retain the historical outcome; reopen only on new qualifying evidence or owner request.',
            'PUBLISHED': 'Preserve existing listing; verify exact current stored/public fields before marking publication verified.',
            'REMOVED': 'Preserve owner suppression; do not republish.',
        }.get(status, 'Reconcile the retained bot workflow before further action.')
        if missing:
            next_action = 'Reconcile bot-reported publication against canonical, hidden and packaged records; do not create a duplicate.'
        if historical.get('cause') == 'fully-vegetarian':
            next_action = 'Check for a canonical Veg Kitchen record; this is a scope referral, not proof the venue has no meat-free food.'
        row = dict.fromkeys(t.MIXED_COLUMNS)
        row.update({
            'Candidate ID': cid, 'Google place ID': candidate['googlePlaceId'],
            'Harvest order': index, 'Review batch ID': assignments.get(cid),
            'Triage': candidate['triage'].upper(), 'Name hint': candidate.get('nameHint'),
            'Name basis': 'HISTORICAL_WEBSITE_MATCH' if candidate.get('nameConfirmed') else 'GOOGLE_UNVERIFIED_HINT',
            'Name hint expires at': name.get('expiresAt'),
            'Address': candidate['address'], 'Unit': candidate.get('unit'),
            'Postcode': candidate['postalCode'], 'Latitude': candidate['point']['latitude'],
            'Longitude': candidate['point']['longitude'], 'Website pointer': candidate.get('website'),
            'Website expires at': harvest.get('expiresAt'),
            'Historical website name match': bool(candidate.get('nameConfirmed')),
            'Bot status': status, 'Bot attempts': historical.get('attempts', 0),
            'Bot cause': historical.get('cause') or historical.get('priorCause'),
            'Bot reason': reason, 'Bot updated at': historical.get('updatedAt'),
            'Bot last attempt at': historical.get('lastAttemptAt'),
            'Bot reviewed in': historical.get('reviewedIn'),
            'Bot packet reference': historical.get('packet') or historical.get('recheckPacket'),
            'Bot published at': historical.get('publishedAt'),
            'Bot recheck notes': json.dumps(historical.get('lastRecheck'), ensure_ascii=False) if historical.get('lastRecheck') else None,
            'Bot retry at': iso_timestamp(historical.get('retryAt')),
            'Owner suppression': status == 'REMOVED',
            'Historical research state': 'ATTEMPTED' if historical.get('attempts') else 'NOT_ATTEMPTED',
            'Research status': 'NOT_CHECKED', 'Research checked date': None,
            'Verification scope': 'Imported harvest and bot disposition only. Original dates retained; no fresh source or field certification.',
            'Identity validation': 'UNVERIFIED', 'Operation validation': 'UNVERIFIED',
            'Mixed eligibility': 'REFER_VEG_KITCHEN' if historical.get('cause') == 'fully-vegetarian' else 'UNVERIFIED',
            'Merchant-labelled dish count': None,
            'Menu status': match['Menu status'] if match else 'NOT_RESEARCHED',
            'Menu source': match['Menu source'] if match else None,
            'Menu qualification': 'Canonical field state retained; imported bot publication does not verify individual dishes.' if match else None,
            'Cover status': match['Cover status'] if match else 'NOT_RESEARCHED',
            'Cover type': 'UNDETERMINED',
            'Hours status': match['Hours status'] if match else 'NOT_RESEARCHED',
            'Hours summary': match['Hours summary'] if match else None,
            'Hours schedule': match['Hours schedule'] if match else None,
            'Hours source': match['Hours source'] if match else None,
            'Vegan validation': 'UNVERIFIED', 'Allium-free validation': 'UNVERIFIED',
            'Publication status': match['Publication status'] if match else 'MISSING_REVIEW' if missing else 'NOT_PUBLISHED',
            'Location ID': cid if match else None,
            'Identity match basis': 'Exact existing canonical candidate ID; not a fresh outlet verification.' if match else None,
            'Follow-up reason': 'PUBLICATION_RECONCILIATION' if missing else historical.get('cause') or historical.get('priorCause'),
            'Next action': next_action, 'Evidence IDs': eid, 'Routine recheck': 'NO',
            'Reopen trigger': 'Assigned owner-authorized initial/held review. Afterwards reopen on new exact-outlet evidence, a conflict or owner request; no automatic missing-field retry.',
            'Snapshot reference': reference, 'Imported at': imported_at,
            'Notes': 'Name is a lookup hint; address/pin is retained OneMap research. Venue covers and verified-food covers are both permitted with exact-outlet identity and reusable rights.',
        })
        rows.append(row)
        evidence.append({
            'Evidence ID': eid, 'Subject type': 'MIXED_CANDIDATE', 'Subject ID': cid,
            'Source class': 'SECONDARY', 'URL': reference + '/progress.json' if historical else reference + '/queue.json',
            'Access status': 'RETAINED_FACT', 'Source date': historical.get('lastAttemptAt') or identity.get('checkedAt'),
            'Access date': imported_at, 'Date basis': 'Immutable read-only bot/harvest observation, not a current merchant source.',
            'Fact supported': f'Imported workflow state {status}; attempts {historical.get("attempts", 0)}. ' + (reason or 'No research outcome recorded.'),
            'Field scope': 'WORKFLOW_IMPORT_ONLY', 'Accepted': False,
            'Publisher record ID': historical.get('reviewedIn'),
            'Evidence notes': 'Not accepted to establish identity, operation, diet, menu, cover rights, hours or verified publication.',
        })
        for category in t.ENUMS['Source category']:
            checks.append({
                'Check ID': 'MK-IMPORT-' + category + '-' + cid,
                'Subject type': 'MIXED_CANDIDATE', 'Subject ID': cid,
                'Source category': category,
                'Check result': 'EXCLUDED' if category == 'HAPPY_COW' else 'NOT_RECORDED',
                'Checked date': None, 'Evidence IDs': eid,
                'Notes': 'Excluded from automated access and database population; not accessed.' if category == 'HAPPY_COW' else 'Import does not establish that this source category was inspected. Update only after an actual check.',
            })

    batches = []
    for bid in dict.fromkeys(assignments.values()):
        scoped = [r for r in rows if r['Review batch ID'] == bid]
        counts = Counter(r['Bot status'] for r in scoped)
        batches.append({
            'Review batch ID': bid, 'Kitchen': 'MIXED_KITCHEN', 'Review batch status': 'PLANNED',
            'Candidate count': len(scoped), 'Research checked count': 0,
            'Pending count': counts['PENDING'], 'Held count': counts['HELD'],
            'Not qualified count': counts['NOT_QUALIFIED'], 'Published reported count': counts['PUBLISHED'],
            'Owner instruction': '24 October 2026: proceed with 3,172 filtered Mixed Kitchen candidates, 50 at a time, and update Excel. Covers may show food or the exact venue.',
            'Scope and limits': 'Research assignment only. Verify identity, operation, merchant-labelled dishes, prices/currency, hours and cover rights separately; no new publication authorization inferred.',
        })
    t.replace_sheet(wb, 'Mixed candidates', t.MIXED_COLUMNS, rows)
    t.replace_sheet(wb, 'Mixed batches', t.RESEARCH_BATCH_COLUMNS, batches)
    append_records(wb, 'Evidence', t.EVIDENCE_COLUMNS, evidence)
    append_records(wb, 'Source checks', t.CHECK_COLUMNS, checks)
    append_records(wb, 'Change log', t.CHANGE_COLUMNS, [{
        'Change ID': 'mixed-harvest-import-20261024', 'Changed at': imported_at, 'Actor': 'Codex',
        'Scope': '3,172 harvested Mixed Kitchen candidates; cover policy',
        'Change': 'Imported all candidate IDs and retained bot outcomes without refreshing source-verification dates. Assigned pending/held candidates to batches of at most 50; preserved canonical and Veg lead records. Food or exact-venue covers permitted with verified identity and rights.',
        'Evidence / receipt': reference + '/census.json',
    }])
    t.setmeta(wb, 'Schema version', t.SCHEMA)
    t.setmeta(wb, 'Workbook revision', 'MK-20261024-harvest-import')
    t.setmeta(wb, 'Scope', 'Canonical Veg/Mixed locations, 227 researched Veg leads, and 3,172 harvested Mixed Kitchen candidates. Imports, bot outcomes, field verification and live publication are separate states.')
    t.setmeta(wb, 'Mixed candidate workflow', 'Mixed candidates is the active harvested-candidate register; Mixed batches assigns pending/held reviews in groups of at most 50. Historical bot status never becomes fresh research verification automatically.')
    t.setmeta(wb, 'Mixed source snapshot', reference + '/census.json')
    t.setmeta(wb, 'Mixed candidate count', len(rows))
    t.setmeta(wb, 'Mixed bot statuses at import', json.dumps(dict(census), sort_keys=True))
    t.setmeta(wb, 'Mixed cover policy', 'Owner, 24 October 2026: covers may show verified food OR the exact location/venue. Record subject type, exact-outlet source, reusable rights/credit and inspection separately. A missing verified dish does not prevent a licensed exact-venue cover.')
    t.setmeta(wb, 'Source policy', 'Veg Kitchen requires exact-premises current/2025+ operation AND whole-kitchen meat-free evidence. Mixed Kitchen requires exact-outlet operation and merchant-labelled meat-free options (two dishes or a vegetarian section); diet badges are independent. Excluded sources never establish eligibility.')
    for sheet, values in original.items():
        if sheet not in ['Evidence', 'Source checks', 'Change log']:
            assert list(wb[sheet].values) == values, 'Prior sheet changed: ' + sheet
        else:
            assert list(wb[sheet].values)[:len(values)] == values, 'Prior evidence changed: ' + sheet
    assert t.sha(workbook) == original_hash, 'Workbook changed concurrently; nothing saved'
    t.validate(wb)
    t.save(wb, workbook)
    reopened = openpyxl.load_workbook(workbook)
    result = t.validate(reopened)
    saved = t.records(reopened, 'Mixed candidates')
    assert {r['Candidate ID'] for r in saved} == {r['candidateId'] for r in queue}
    assert Counter(r['Bot status'].lower().replace('_', '-') for r in saved) == census
    assert sum(bool(r['Review batch ID']) for r in saved) == len(selected)
    assert all(r['Research checked date'] is None for r in saved)
    assert all(not r['Accepted'] for r in t.records(reopened, 'Evidence') if r['Subject type'] == 'MIXED_CANDIDATE')
    result.update(imported=len(saved),assignedForReview=len(selected),canonicalLinks=sum(bool(r['Location ID']) for r in saved),publicationDiscrepancies=[r['Candidate ID'] for r in saved if r['Publication status']=='MISSING_REVIEW'],backup=str(backup))
    (snapshot / 'import-receipt.json').write_text(json.dumps({'verifiedAt': t.now(), 'workbookBeforeSha256': original_hash, 'workbookAfterSha256': t.sha(workbook), 'result': result}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return result
