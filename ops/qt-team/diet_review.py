"""Whole-venue diet proof (owner, 18 Oct 2026). Many listed vegetarian restaurants name dishes after meat or
seafood ("Assam Fish", "BLT") because they serve plant-based versions. Explorer must show, once every
180 days per venue, a quote from the venue's own page (or a reliable listing) saying the whole venue is
vegetarian or vegan. The coordinator checks that quote against the stored page. A venue that cannot be
confirmed goes to the owner on Telegram; a confirmed vegan venue may have its label corrected.
closure_check does the same for a venue a stored page reports closed (19 Oct 2026).
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import time
import unicodedata
from pathlib import Path

RECHECK_DAYS = 180
MEAT_NAMED = re.compile(r'(?i)\b(chicken|pork|beef|mutton|lamb|bacon|ham|duck|fish\w*|prawns?|shrimp|crab|squid|abalone|blt|'
                        r'shark|cod|steak|trotter|tripe|sausage|meat\w*)\b|[鸡鴨鸭猪豬牛羊鱼魚虾蝦蟹肉鲍]')
VEGAN_PHRASES = r'(?:no|without|free (?:of|from)|(?:do|does) not (?:use|contain)(?: any)?) animal(?:[- ]derived)? (?:products?|ingredients?)|animal[- ]free|100% plant'
DIET_WORDS = re.compile(r'(?i)\b(vegetarian|vegan|plant[- ]based|meat[- ]free|meatless)\b|素|斋|齋|' + VEGAN_PHRASES)


def _read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def _write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding='utf-8')
    temp.replace(path)


def _norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(text)).casefold()).strip()


def proof_file(root, venue_id):
    return root / 'state/diet-reviews' / (venue_id + '.json')


def due(root, venue_id):
    proof = _read(proof_file(root, venue_id))
    return not proof or time.time() - dt.datetime.fromisoformat(proof['at']).timestamp() > RECHECK_DAYS * 86400


def context(venue, dish_names):
    """What Explorer is asked to prove for one venue (added to its assignment)."""
    named = [n for n in dish_names if MEAT_NAMED.search(n) and not DIET_WORDS.search(n)][:10]
    return {'currentDiet': venue.get('diet', 'Vegetarian'), 'meatNamedDishes': named,
            'instruction': 'Confirm the WHOLE venue is vegetarian (or vegan): find the venue\'s own page (or a reliable listing) '
                           'that says so (the parent brand\'s own site counts when it names this outlet), web_extract it, and return '
                           'dietReview:{diet:"vegan"|"vegetarian"|"not-confirmed", sourceUrl, quote (<=25 words copied exactly from '
                           'that page\'s text or title), note}. Dishes named after meat or seafood at a vegetarian venue are usually '
                           'plant-based versions; say so in note only if the source does. A delivery-platform description that '
                           'mentions meat (often text copied between items) does not outweigh an explicit whole-venue statement: '
                           'return the statement and note the conflict. Return not-confirmed only when no such statement exists or the '
                           'venue\'s own menu, website or socials offer real meat, seafood or animal-derived extras such as collagen or gelatin. If the whole venue '
                           'is vegan and currentDiet is Vegetarian, also propose {field:"venueDiet", newValue:"Vegan", sourceUrl}.'}


def _capture(root, url):
    stored = _read(root / 'state/source-cache' / (hashlib.sha256(str(url).encode()).hexdigest() + '.json'))
    result = (stored or {}).get('result', {})
    if not stored or stored.get('blocked') or not result.get('content'):
        return None
    return _norm(str(result.get('title') or '') + '\n' + result['content'])  # a page title is part of the page


def check(root, record, venue):
    """Verify Explorer's dietReview against the stored page. Returns the outcome; unverified venue-diet changes are dropped."""
    review = record.get('dietReview') if isinstance(record.get('dietReview'), dict) else {}
    diet, url, quote = review.get('diet'), review.get('sourceUrl'), review.get('quote')
    page = _capture(root, url) if isinstance(url, str) else None
    verified = (diet in ('vegan', 'vegetarian') and isinstance(quote, str) and 0 < len(quote) <= 400 and page is not None
                and _norm(quote) in page and bool(DIET_WORDS.search(quote)))
    if verified and diet == 'vegan' and not re.search(r'(?i)\bvegan\b|plant[- ]based|全素|纯素|純素|' + VEGAN_PHRASES, quote):
        verified = False  # a "vegetarian" quote cannot prove a whole-venue vegan label
    if not verified:
        record['proposals'] = [p for p in record.get('proposals', []) if not (isinstance(p, dict) and p.get('field') == 'venueDiet')]
    outcome = {'venueId': record.get('id'), 'name': venue.get('name'), 'diet': diet if verified else 'not-confirmed',
               'sourceUrl': url if verified else None, 'quote': quote if verified else None,
               'note': str(review.get('note', ''))[:300], 'at': dt.datetime.now(dt.timezone.utc).isoformat()}
    pending = _read(root / 'state/diet-pending.json', {})
    misses = pending.pop(record['id'], 0)
    if verified:
        _write(proof_file(root, record['id']), outcome)
        flags = _read(root / 'state/diet-flags.json', {})
        if flags.pop(record['id'], None) is not None:
            _write(root / 'state/diet-flags.json', flags)
    elif diet in ('vegan', 'vegetarian') and misses < 1:
        # Explorer found a statement but the stored page did not show it (often a capture that landed after
        # the check). The venue stays due, so the next visit retries before the owner is asked.
        pending[record['id']] = misses + 1
        outcome['diet'] = 'retry'
    else:
        flags = _read(root / 'state/diet-flags.json', {})
        flags[record['id']] = outcome
        _write(root / 'state/diet-flags.json', flags)
    _write(root / 'state/diet-pending.json', pending)
    return outcome


CLOSED = re.compile(r'(?i)\b(?:permanently|temporarily) closed\b|\bclosed (?:down|permanently|for good)\b|结业|停业|暂停营业')


def closure_check(root, record, venue):
    """A venue Explorer reports closed (for example Google Maps' "Permanently closed"): the quote must be on the
    stored page. The owner is told once on Telegram; the venue stays listed until hidden in Admin > Content."""
    closure = record.get('closure') if isinstance(record.get('closure'), dict) else {}
    url, quote = closure.get('sourceUrl'), closure.get('quote')
    page = _capture(root, url) if isinstance(url, str) else None
    if not (isinstance(quote, str) and 0 < len(quote) <= 200 and page and _norm(quote) in page and CLOSED.search(quote)):
        return None
    outcome = {'venueId': record['id'], 'name': venue.get('name'),
               'status': 'temporarily-closed' if re.search(r'(?i)temporar|暂停', quote) else 'permanently-closed',
               'sourceUrl': url, 'quote': quote, 'at': dt.datetime.now(dt.timezone.utc).isoformat()}
    flags = _read(root / 'state/closure-flags.json', {})
    if flags.get(record['id'], {}).get('status') != outcome['status']:
        flags[record['id']] = outcome
        _write(root / 'state/closure-flags.json', flags)
    return outcome
