"""Build QT Explorer's veg options candidate queue from the private harvest files (owner, 19 Oct 2026).

Local, offline and model-free. Input: `.local/veg-options/enrichment.json` and `identities.json` from the app
repository's scripts/veg-options (enrich.ts, identify.ts). Output: the queue the VPS holds at
state/veg-options/queue.json. Only places triaged priority, normal or low with a OneMap address are queued,
in that order. Google's display name is an unverified hint; QT Explorer confirms names on stored pages.

    python -X utf8 veg_options_queue.py build <enrichment.json> <identities.json> <out.json>
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import unicodedata
import urllib.parse
from pathlib import Path

ORDER = ('priority', 'normal', 'low')
ID_PATTERN = re.compile(r'^vo-[a-z0-9][a-z0-9-]{2,110}$')
PLACE_ID = re.compile(r'^[A-Za-z0-9_-]{10,200}$')
POSTAL = re.compile(r'^\d{6}$')
MAX_SLUG = 80


def slug(text):
    """Lowercase ASCII slug; accents folded, other scripts dropped."""
    folded = unicodedata.normalize('NFKD', str(text or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'-{2,}', '-', re.sub(r'[^a-z0-9]+', '-', folded.lower())).strip('-')


def candidate_id(name, place_id):
    """vo-<name slug>-<6 hex of the Google place ID>: stable per place, readable in logs."""
    base = slug(name)[:MAX_SLUG].strip('-') or 'place'
    value = 'vo-' + base + '-' + hashlib.sha256(place_id.encode()).hexdigest()[:6]
    if not ID_PATTERN.fullmatch(value):
        raise ValueError('Candidate ID out of pattern: ' + value)
    return value


def maps_url(name, address, place_id):
    query = ' '.join(x for x in (name, address) if x)
    return ('https://www.google.com/maps/search/?api=1&query=' + urllib.parse.quote(query, safe='') +
            '&query_place_id=' + urllib.parse.quote(place_id, safe=''))


def https(value):
    if not isinstance(value, str) or len(value) > 2048:
        return None
    parts = urllib.parse.urlsplit(value)
    return value if parts.scheme == 'https' and parts.hostname and '.' in parts.hostname else None


def entry(place_id, enrichment, identity):
    """One queue entry, or None when the place is out of scope or lacks a usable address."""
    triage = enrichment.get('triage') or identity.get('triage')
    address = identity.get('address')
    if triage not in ORDER or not PLACE_ID.fullmatch(place_id) or not isinstance(address, dict):
        return None
    postal = str(address.get('postalCode') or '')
    lat, lon = address.get('latitude'), address.get('longitude')
    if not POSTAL.fullmatch(postal) or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (lat, lon)):
        return None
    if not (1.15 <= lat <= 1.48 and 103.6 <= lon <= 104.1):
        return None  # the app accepts Singapore points only
    name = identity.get('name') if isinstance(identity.get('name'), dict) else {}
    hint = str(name.get('value') or '').strip()[:160] or None
    street = str(address.get('address') or '').strip()
    if not street:
        return None
    return {'candidateId': candidate_id(hint or address.get('building') or street, place_id), 'googlePlaceId': place_id,
            'triage': triage, 'nameHint': hint, 'nameConfirmed': name.get('source') == 'website',
            'address': street, 'building': address.get('building') or None, 'unit': identity.get('unit') or None,
            'postalCode': postal, 'point': {'latitude': float(lat), 'longitude': float(lon)},
            'website': https(identity.get('website')) or https(enrichment.get('website')),
            'mapsUrl': maps_url(hint, street, place_id)}


def build(enrichment, identities):
    enriched = (enrichment or {}).get('records') or {}
    known = (identities or {}).get('records') or {}
    rows, seen = [], set()
    for place_id, identity in known.items():
        row = entry(place_id, enriched.get(place_id) or {}, identity if isinstance(identity, dict) else {})
        if row is None:
            continue
        if row['candidateId'] in seen:
            raise ValueError('Duplicate candidate ID ' + row['candidateId'] + '; widen the place-ID hash')
        seen.add(row['candidateId'])
        rows.append(row)
    rows.sort(key=lambda r: ORDER.index(r['triage']))  # stable: harvest order kept within a triage band
    return {'version': 1, 'note': 'Private QT Explorer queue for veg options places. nameHint is Google\'s unverified name.',
            'candidates': rows}


def main(argv):
    if len(argv) != 5 or argv[1] != 'build':
        raise SystemExit(__doc__)
    enrichment, identities = (json.loads(Path(p).read_text(encoding='utf-8')) for p in argv[2:4])
    queue = build(enrichment, identities)
    out = Path(argv[4])
    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(out.name + '.tmp')
    temp.write_text(json.dumps(queue, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    os.replace(temp, out)
    counts = {t: sum(r['triage'] == t for r in queue['candidates']) for t in ORDER}
    print(json.dumps({'queued': len(queue['candidates']), 'byTriage': counts,
                      'nameConfirmed': sum(r['nameConfirmed'] for r in queue['candidates']),
                      'withWebsite': sum(bool(r['website']) for r in queue['candidates'])}))


if __name__ == '__main__':
    main(sys.argv)
