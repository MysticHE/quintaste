"""One event, two listings: Lychee reads a listed class again and proposes it in other words under a new id (6 Nov 2026: 8 pairs live, and 118
saved entries for 77 events, 10 of them for one class).

The publisher uses this rule so a copy updates the listed event instead of going live beside it, and the saved list uses it so a copy is not
rechecked every evening. A missed copy costs one duplicate the owner can remove; calling two classes one hides a real class. So every test
here leans towards "different": same start, same organiser, same venue, and the same words for what the class is.
"""
from __future__ import annotations

import datetime as dt
import re
import unicodedata

# Words that say what kind of listing this is, not which class: "North Indian Vegetarian Cuisine: Bhatura" and "...: Poori" differ only
# in the last word. Food words such as cake or sauce stay: they do tell classes apart.
EVENT_FILLER = frozenset("""a an and the of for with by to in at on from new class classes workshop workshops course courses session sessions
    masterclass intake cook cooking cuisine food foods homemade home made hands vegan vegetarian plant based festive chef snacks meal meals
    north south east west indian chinese thai italian korean japanese asian vietnamese malaysian sri lankan elementary""".split())
NAME_FILLER = frozenset({'and', 'the', 'of', 'pte', 'ltd', 'singapore'})
ORDINAL = re.compile(r'\d+(st|nd|rd|th)?')
POSTAL = re.compile(r'(?<!\d)\d{6}(?!\d)')
OVERLAP = 0.6  # of the shorter list of words, with three or more shared: "Three-Colour Wholemeal Mee Hoon Kueh" and "Wholewheat Tricolour Mee Hoon Kueh"


def _words(text) -> list:
    return re.findall(r'[^\W_]+', unicodedata.normalize('NFKC', str(text or '')).lower())


def event_words(event: dict) -> set:
    """The words that say which class this is. A chef's name and an intake number do not. A title with no Latin words at all (Chinese only) takes
    them from its id instead, without the organiser's own words, so it can match the same class proposed in English."""
    title = re.sub(r'\bwith\s+chef\s+\w+', ' ', ' '.join(_words(event.get('title'))))
    words = {w for w in title.split() if w not in EVENT_FILLER and not ORDINAL.fullmatch(w)}
    if re.search('[a-z]', title):
        return words
    organiser = ''.join(_words(event.get('organiser')))
    from_id = {w for w in _words(event.get('id')) if w not in EVENT_FILLER and not w.isdigit() and w != 'sgt' and w not in organiser}
    return from_id or words


def _name_words(text) -> set:
    return set(_words(str(text or '').replace('&', ' and '))) - NAME_FILLER


def same_name(one, other) -> bool:
    """"&" or "and", and a shorter name inside the longer one. Sharing a word is not enough: Kampong Chai Chee CC is not Kampong Kembangan CC."""
    a, b = _name_words(one), _name_words(other)
    return bool(a and b) and (a <= b or b <= a)


def same_venue(one: dict, other: dict) -> bool:
    """The postal codes when both have one, otherwise the name of the place. A place not stated at all says nothing either way."""
    codes = [set(POSTAL.findall(f"{event.get('address') or ''} {event.get('location') or ''}")) for event in (one, other)]
    if all(codes):
        return bool(codes[0] & codes[1])
    return not _name_words(one.get('location')) or not _name_words(other.get('location')) or same_name(one.get('location'), other.get('location'))


def same_start(one: dict, other: dict) -> bool:
    try:
        return dt.datetime.fromisoformat(str(one.get('startsAt'))) == dt.datetime.fromisoformat(str(other.get('startsAt')))
    except (ValueError, TypeError):
        return False


def _same_class(one: dict, other: dict) -> bool:
    title = ''.join(_words(one.get('title')))
    if title and title == ''.join(_words(other.get('title'))):
        return True
    a, b = event_words(one), event_words(other)
    shared = a & b
    if not a or not b:
        return False
    if a == b or (len(shared) >= 2 and (a <= b or b <= a)):
        return True
    return len(shared) >= 3 and len(shared) / min(len(a), len(b)) >= OVERLAP  # Chocolate and Orange Log Cake share only two


def reworded(one: dict, other: dict) -> bool:
    """The same class described in other words. Two different classes at one time and place do exist (Bhatura and Orange Log Cake, 19 Dec)."""
    return same_start(one, other) and same_name(one.get('organiser'), other.get('organiser')) and same_venue(one, other) and _same_class(one, other)


def new_facts(copy: dict, listed: dict) -> dict:
    """What a reworded copy may change on the listed event: only what a member acts on, and only what it actually states. Everything else about a
    copy is rewording, and a copy that leaves the fee out must not erase it (6 Nov 2026: a proposal without one would have blanked the S$69 on a live
    tour). A copy can cancel an event but never revive one."""
    facts = {}
    if copy.get('status') == 'cancelled' and listed.get('status') != 'cancelled':
        facts['status'] = 'cancelled'
    fee = copy.get('feeAmount')
    if isinstance(fee, (int, float)) and not isinstance(fee, bool) and copy.get('currency') == 'SGD' and (fee != listed.get('feeAmount') or listed.get('currency') != 'SGD'):
        facts.update(feeAmount=fee, currency='SGD', **({'feeNote': copy['feeNote']} if copy.get('feeNote') else {}))
    for key in ('endsAt', 'registrationDeadline'):
        if copy.get(key) and copy[key] != listed.get(key):
            facts[key] = copy[key]
    return facts


def find(event: dict, others) -> str | None:
    """The id of the first of `others` (id, event) that `event` is a reworded copy of, else None."""
    return next((rid for rid, other in others if rid != event.get('id') and reworded(event, dict(other, id=rid))), None)


def without_copies(saved: list, live_ids=()) -> list:
    """Lychee's saved list without its copies, in the same order. A live entry always stays: a live pair must stay updatable while the owner
    decides which to keep. Otherwise the proposed entry beats a held one, then the earlier beats the later."""
    def rank(record):
        return (not _usable(record) or record['id'] not in live_ids, not _usable(record) or record.get('status') != 'proposed')
    kept, dropped = [], set()
    for record in sorted(saved, key=rank):
        if not _usable(record):
            continue
        event = dict(record['event'], id=record['id'])
        if record['id'] not in live_ids and any(reworded(event, other) for other in kept):
            dropped.add(record['id'])
        else:
            kept.append(event)
    return [record for record in saved if not _usable(record) or record['id'] not in dropped]


def _usable(record) -> bool:
    return isinstance(record, dict) and isinstance(record.get('event'), dict) and 'id' in record
