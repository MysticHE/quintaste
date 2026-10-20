"""Build QT Explorer's Veg Kitchen candidate queue from the private harvest files (owner, 20 Oct 2026).

Local, offline and model-free. Input: `.local/veg-options/enrichment.json` and `identities.json` from the app repository's
scripts/veg-options (enrich.ts, identify.ts) and `fullveg-leads.json` (places Mixed Kitchen research found to be fully
vegetarian). Output: the queue the VPS holds at state/veg-kitchen/queue.json. Order: the leads first, then the places Google
types as a vegetarian or vegan restaurant (triage "fully-veg-check"). Places without a OneMap address and point, closed
places, and (with --live-places) places Explore already lists, by Google place ID or by normalised name and postcode, are
dropped. Google's display name is an unverified hint; QT Explorer confirms names on stored pages.

    python -X utf8 veg_kitchen_queue.py build <enrichment.json> <identities.json> <leads.json> <out.json> [--live-places live.json]

live.json is either a list of {googlePlaceId, name, postalCode} or the editorial `/control/state` document (venues and place
records are read from it).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path

import veg_options as vo
import veg_options_queue as vq

TYPED = 'fully-veg-check'
ID_PATTERN = re.compile(r'^vk-[a-z0-9][a-z0-9-]{2,110}$')
LEAD_NOTE = ('Earlier Mixed Kitchen research found no meat or seafood and treated this venue as fully vegetarian; '
             "verify the venue's own statement.")


def candidate_id(name, place_id):
    """vk-<name slug>-<6 hex of the Google place ID>: stable per place, readable in logs."""
    value = 'vk-' + (vq.slug(name)[:vq.MAX_SLUG].strip('-') or 'place') + '-' + hashlib.sha256(place_id.encode()).hexdigest()[:6]
    if not ID_PATTERN.fullmatch(value):
        raise ValueError('Candidate ID out of pattern: ' + value)
    return value


def entry(place_id, identity, enrichment, source, lead=None):
    """(queue row, None) or (None, why it was dropped)."""
    if not vq.PLACE_ID.fullmatch(str(place_id)):
        return None, 'bad-place-id'
    address = identity.get('address') if isinstance(identity, dict) else None
    if not isinstance(address, dict):
        return None, 'no-address'
    if str(enrichment.get('status') or '').startswith('CLOSED') or enrichment.get('triage') == 'skip-closed':
        return None, 'closed'
    postal, lat, lon = str(address.get('postalCode') or ''), address.get('latitude'), address.get('longitude')
    street = str(address.get('address') or '').strip()
    number = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
    if not (vq.POSTAL.fullmatch(postal) and number(lat) and number(lon) and street and 1.15 <= lat <= 1.48 and 103.6 <= lon <= 104.1):
        return None, 'no-address'
    name = identity.get('name') if isinstance(identity.get('name'), dict) else {}
    hint = (str(name.get('value') or '').strip() or str((lead or {}).get('name') or '').strip())[:160] or None
    row = {'candidateId': candidate_id(hint or address.get('building') or street, place_id), 'googlePlaceId': place_id,
           'triage': 'lead' if lead is not None else TYPED, 'source': source, 'nameHint': hint, 'nameConfirmed': name.get('source') == 'website',
           'address': street, 'building': address.get('building') or None, 'unit': identity.get('unit') or None,
           'postalCode': postal, 'point': {'latitude': float(lat), 'longitude': float(lon)},
           'website': vq.https(identity.get('website')) or vq.https(enrichment.get('website')) or vq.https((lead or {}).get('website')),
           'mapsUrl': vq.maps_url(hint, street, place_id)}
    if lead is not None:
        row['leadNote'] = LEAD_NOTE
    return row, None


def listed(live):
    """(Google place IDs, name+postcode identity keys) of everything Explore lists, from a list or a /control/state document."""
    rows = []
    if isinstance(live, dict):
        rows = [r.get('data') or {} for r in live.get('venues', [])] + [r.get('data') or {} for r in live.get('records', []) if r.get('kind') == 'place']
    elif isinstance(live, list):
        rows = [r for r in live if isinstance(r, dict)]
    ids = {r.get('googlePlaceId') for r in rows} - {None}
    keys = {vo.identity_key(r['name'], r['postalCode']) for r in rows if r.get('name') and r.get('postalCode')}
    return ids, keys


def build(enrichment, identities, leads, live=None):
    """(queue document, {dropped cause: count}). Leads first, then the typed places in harvest order."""
    enriched = (enrichment or {}).get('records') or {}
    known = (identities or {}).get('records') or {}
    ids, keys = listed(live) if live is not None else (set(), set())
    work = [(lead.get('placeId'), lead, 'lead') for lead in leads or [] if isinstance(lead, dict)]
    work += [(pid, None, 'google-typed') for pid, e in enriched.items() if isinstance(e, dict) and e.get('triage') == TYPED]
    rows, seen_ids, seen_places, seen_keys, dropped = [], set(), set(), set(), {}

    def drop(cause):
        dropped[cause] = dropped.get(cause, 0) + 1

    for place_id, lead, source in work:
        if place_id in seen_places:
            drop('duplicate')
            continue
        identity = known.get(place_id)
        row, why = entry(place_id, identity if isinstance(identity, dict) else {}, enriched.get(place_id) or {}, source, lead)
        if row is None:
            drop(why)
            continue
        if row['googlePlaceId'] in ids or (row['nameHint'] and vo.identity_key(row['nameHint'], row['postalCode']) in keys):
            drop('already-listed')
            continue
        if row['candidateId'] in seen_ids:
            raise ValueError('Duplicate candidate ID ' + row['candidateId'] + '; widen the place-ID hash')
        key = vo.identity_key(row['nameHint'], row['postalCode']) if row['nameHint'] else None
        if key and key in seen_keys:  # the app lists one place per name and postcode
            drop('same-name-postcode')
            continue
        seen_places.add(place_id)
        seen_ids.add(row['candidateId'])
        seen_keys.add(key)
        rows.append(row)
    return {'version': 1, 'note': "Private QT Explorer queue for Veg Kitchen places. nameHint is Google's unverified name.",
            'candidates': rows}, dropped


def main(argv):
    live_path = None
    if '--live-places' in argv:
        i = argv.index('--live-places')
        live_path, argv = argv[i + 1], argv[:i] + argv[i + 2:]
    if len(argv) != 6 or argv[1] != 'build':
        raise SystemExit(__doc__)
    enrichment, identities, leads = (json.loads(Path(p).read_text(encoding='utf-8')) for p in argv[2:5])
    live = json.loads(Path(live_path).read_text(encoding='utf-8')) if live_path else None
    queue, dropped = build(enrichment, identities, leads, live)
    import veg_kitchen
    veg_kitchen.check_queue(queue)  # the shape the VPS will load
    out = Path(argv[5])
    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(out.name + '.tmp')
    temp.write_text(json.dumps(queue, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    os.replace(temp, out)
    rows = queue['candidates']
    print(json.dumps({'queued': len(rows), 'leads': sum(r['source'] == 'lead' for r in rows), 'googleTyped': sum(r['source'] == 'google-typed' for r in rows),
                      'dropped': dropped, 'nameConfirmed': sum(r['nameConfirmed'] for r in rows), 'withWebsite': sum(bool(r['website']) for r in rows),
                      'liveListChecked': live is not None}))


if __name__ == '__main__':
    main(sys.argv)
