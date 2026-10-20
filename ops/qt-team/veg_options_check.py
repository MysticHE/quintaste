"""Code checks for QT Explorer's veg options findings (owner, 19 Oct 2026). No model calls.

A dish counts only when the venue itself labels it: a V/VG mark, "(V)", or vegetarian/vegan/plant-based on the
dish's own line, or a vegetarian/vegan/素/斋 section heading above it. Never inferred from a dish name or its
ingredients. Each dish needs its exact name and an explicit SGD price next to it in a stored capture (the
venue's own menu may print bare prices that end the line, as in menu_coverage). The place's name must be on a
stored page and its OneMap postcode on a stored page or Maps listing. Failing dishes are dropped with a cause;
fewer than two surviving dishes holds the place. Meat and seafood dishes are never stored.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import time
import unicodedata
import urllib.parse
from zoneinfo import ZoneInfo

import menu_coverage as mc
from diet_review import MEAT_NAMED

SG = ZoneInfo('Asia/Singapore')
MIN_DISHES = 2
MAX_DISHES = 200
MAX_AGE = 35 * 86400
CONTROL = re.compile(r'[\u0000-\u0008\u000b\u000c\u000e-\u001f]')
CJK = re.compile(r'[㐀-鿿豈-﫿]')
MARK = re.compile(r'(?<![A-Za-z0-9&])(VG|VE|V)(?![A-Za-z0-9&])')  # printed marks are upper case
WORD_LABEL = re.compile(r'(?i)\((?:v|vg|ve)\)|\[(?:v|vg|ve)\]|\b(?:vegetarian|vegan|plant[- ]based)\b|全素|纯素|純素')
VEGAN_LABEL = re.compile(r'(?i)(?<![A-Za-z0-9&])(?:VG|VE)(?![A-Za-z0-9&])|\bvegan\b|plant[- ]based|全素|纯素|純素')
SECTION = re.compile(r'(?i)\b(?:vegetarian|vegan|plant[- ]based|meatless|meat[- ]free)\b|素|斋|齋')
NOT_VEG = re.compile(r'(?i)\bnon[- ]?veg\w*|\bnot\s+(?:suitable\s+for\s+)?veg\w*|荤|葷')
CONDITIONAL = re.compile(
    r'(?i)\bcan be (?:made |prepared |served |done )?(?:veg\w*|plant[- ]based)|\b(?:vegetarian|vegan|veg|plant[- ]based) '
    r'(?:option|version|alternative|substitute)s? (?:is |are )?(?:available|on request)|\bavailable (?:as|in) (?:a )?(?:veg\w*)|'
    r'\b(?:up)?on request\b|\bask (?:for|our|your)\b|\badd(?:-on)?:? (?:chicken|beef|pork|prawns?|shrimp|fish|meat|bacon|ham|salmon|tuna)|'
    r'\bwith (?:chicken|beef|pork|prawns?|shrimp|fish|bacon|ham|salmon|tuna)\b|' + NOT_VEG.pattern.removeprefix('(?i)'))
PLANT_NAME = re.compile(r'(?i)\b(?:vegan|vegetarian|veggie|plant|impossible|beyond|mock|faux|meatless|meat[- ]free|tofu|tempeh|seitan)\b|素|斋|齋')
BULLET = re.compile(r'^[\s\-*•#|>\[\]()]*(?:[a-z]?\d{1,3}[.)]?\s*)?')
PLATFORMS = ('foodpanda.', 'grab.com', 'deliveroo.', 'facebook.', 'instagram.', 'google.', 'linktr.', 'wa.me', 'tiktok.',
             'tripadvisor.', 'burpple.', 'chope.', 'quandoo.', 'oddle.', 'shopee.', 'gojek.')
TOOLING = {'no-stored-capture', 'source-not-cited', 'name-not-on-page', 'postcode-not-on-page', 'no-successful-extract',
           'explorer-held', 'worker-failed', 'invalid-finding', 'review-quarantined'}
CAUSES = {
    'source-not-cited': 'The cited page is not in sources.',
    'no-stored-capture': 'No usable stored capture of the cited page (missing, failed or older than 35 days).',
    'name-not-in-capture': 'The exact dish name is not on the stored page.',
    'price-format': 'The price is not an explicit SGD amount or valid range.',
    'no-sgd-in-capture': 'The stored page shows no S$/SGD prices and is not the venue\'s own menu.',
    'price-not-in-capture': 'The claimed price is not next to this dish on the stored page.',
    'no-venue-label': 'No V/VG/vegetarian/vegan label on the dish line or a vegetarian section heading above it.',
    'label-quote-missing': 'The label quote is not on the stored page at this dish or its section heading.',
    'label-conditional': 'The label is conditional (on request, option available, add meat) or says non-vegetarian.',
    'meat-named': 'The dish is named after meat or seafood without a plant-based word; never stored.',
    'duplicate-name': 'The same dish name appears twice.',
    'invalid-item': 'The dish entry is malformed.',
}


def norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(text)).casefold()).strip()


def text_ok(value, limit, empty=False):
    return isinstance(value, str) and (empty or bool(value.strip())) and len(value) <= limit and not CONTROL.search(value)


def capture(root, url):
    """The stored capture's text (title + content) when usable, else None."""
    stored = mc.read(root / 'state/source-cache' / (hashlib.sha256(str(url).encode()).hexdigest() + '.json'), {}) or {}
    result = stored.get('result', {})
    if (not stored or stored.get('blocked') or result.get('error') or not result.get('content')
            or time.time() - stored.get('fetchedEpoch', 0) > MAX_AGE):
        return None
    return {'text': unicodedata.normalize('NFKC', str(result.get('title') or '') + '\n' + str(result['content'])),
            'sha256': stored.get('sha256'), 'fetchedAt': stored.get('fetchedAt')}


def site(url_or_host):
    host = urllib.parse.urlsplit(url_or_host).hostname if '/' in str(url_or_host) else str(url_or_host)
    parts = (host or '').lower().removeprefix('www.').split('.')
    if len(parts) >= 3 and parts[-2] in ('com', 'net', 'org', 'edu', 'gov') and len(parts[-1]) == 2:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])


def official_sites(root, candidate):
    """The venue's own website domain(s): the harvest pointer plus the website a stored Maps listing shows."""
    found = set()
    if candidate.get('website') and not any(p in candidate['website'] for p in PLATFORMS):
        found.add(site(candidate['website']))
    page = capture(root, candidate.get('mapsUrl'))
    if page and candidate.get('postalCode') in page['text']:
        for line in page['text'].splitlines():
            hit = re.fullmatch(r'\s*(?:https?://)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:/\S*)?\s*', line.lower())
            if hit and not any(p in hit[1] for p in PLATFORMS):
                found.add(site(hit[1]))
    return {s for s in found if '.' in s}


def name_pattern(name):
    if CJK.search(name):
        return re.compile(re.escape(norm(name).replace(' ', '')))
    tokens = re.findall(r'\w+', norm(name))
    return re.compile(r'(?<!\w)' + r'\W*'.join(map(re.escape, tokens)) + r'(?!\w)') if tokens else None


def dish_lines(lines, name):
    """Indices of lines that carry this exact dish name (word boundaries; short names must start the line)."""
    pattern, short = name_pattern(name), len(mc.normalize(name)) < 8
    found = []
    for i, line in enumerate(lines):
        low = norm(line)
        hay = low.replace(' ', '') if CJK.search(name) else low
        hit = pattern.search(hay) if pattern else None
        if not hit:
            continue
        if short:
            first = norm(name).split()[0]
            before = MARK.sub('', WORD_LABEL.sub('', line[:max(0, line.casefold().find(first))]))
            if BULLET.sub('', norm(before)).strip():
                continue
        found.append(i)
    return found


def heading_level(lines, i):
    line = lines[i].strip()
    if not line or len(line) > 80:
        return None
    if (hashes := re.match(r'^(#{1,6})\s+\S', line)):
        return len(hashes[1])
    if i + 1 < len(lines) and re.fullmatch(r'\s*(=+|-{3,})\s*', lines[i + 1]):
        return 1 if '=' in lines[i + 1] else 2
    if re.fullmatch(r'\*\*[^*]+\*\*:?', line) or re.fullmatch(r'__[^_]+__:?', line):
        return 6
    letters = re.sub(r'[^A-Za-z]', '', line)
    if (len(letters) >= 3 and letters.isupper() and not re.search(r'\d', line)) or (CJK.search(line) and len(line) <= 12 and not re.search(r'\d', line)):
        return 7  # PDF and transcribed menus print section names in capitals
    return None


def heading_chain(lines, i):
    """The section headings above line i, nearest first, each a parent of the one before."""
    chain, level = [], 99
    for k in range(i - 1, -1, -1):
        lvl = heading_level(lines, k)
        if lvl is not None and lvl < level:
            chain.append(lines[k])
            level = lvl
            if lvl == 1:
                break
    return chain


# Owner, 20 Oct 2026: a dish the venue's own menu lists without any price publishes as "Price unavailable", in exactly the app's
# shape (server/editorial/validation.mjs). It is accepted only when no price shows on the dish's own line or the next one.
UNPRICED = {'amount': None, 'currency': 'unknown', 'type': 'displayed'}
# A decimal counts as a price unless it is a size or measure ("7x3.5\" cake", "1.5kg", "2.5%"): Sayang's, 20 Oct 2026.
MONEY = re.compile(r'(?i)(?:S\$|\bSGD\b|\$)\s*\d|(?<![\dx.])\d{1,4}\.\d{1,2}(?![\d.]|\s*(?:x\b|"|%|cm\b|mm\b|in\b|inch|kg\b|g\b|ml\b|l\b|oz\b|lb\b|pcs?\b|pax\b))')


def unpriced(price):
    return isinstance(price, dict) and price == UNPRICED


def shows_price(text, name=''):
    # True when a price-like amount appears (S$, SGD, $ or a decimal such as 12.90) outside the dish's own name: an unpriced
    # claim is then refused. The name is left out so sizes printed in it ("Rectangle 7x3.5\" Cake") never read as a price.
    if name:
        text = re.sub(re.escape(name.strip()), ' ', text, flags=re.I)
    return bool(MONEY.search(text))


def price_ok(price):
    if unpriced(price):
        return True
    amount = price.get('amount') if isinstance(price, dict) else None
    return (isinstance(price, dict) and price.get('currency') == 'SGD' and price.get('type') in ('displayed', 'from')
            and isinstance(amount, (int, float)) and not isinstance(amount, bool) and 0 <= amount <= 10000
            and set(price) <= {'amount', 'currency', 'type', 'maxAmount'}
            and ('maxAmount' not in price or (isinstance(price['maxAmount'], (int, float)) and not isinstance(price['maxAmount'], bool)
                                             and amount <= price['maxAmount'] <= 10000)))


PRICE_LINES = 8


def check_dish(item, page, own_menu):
    """(verified dish, None) or (None, cause). A V claim with only a vegan label stays V; VG needs a vegan label."""
    name, quote = item.get('name'), item.get('labelQuote')
    if not (text_ok(name, 120) and item.get('diet') in ('V', 'VG') and text_ok(quote, 300) and len(quote.split()) <= 25
            and (item.get('category') is None or text_ok(item['category'], 40, True))):
        return None, 'invalid-item'
    if MEAT_NAMED.search(name) and not PLANT_NAME.search(name):
        return None, 'meat-named'
    price = {k: item['price'][k] for k in ('amount', 'currency', 'type', 'maxAmount') if isinstance(item.get('price'), dict) and k in item['price']}
    if not price_ok(price):
        return None, 'price-format'
    free = unpriced(price)
    if not free and not own_menu and not re.search(r'S\$|\bSGD\b', page['text']):
        return None, 'no-sgd-in-capture'
    lines = page['text'].splitlines()
    spots = dish_lines(lines, name)
    if not spots:
        return None, 'name-not-in-capture'
    cause = 'price-not-in-capture'
    for i in spots:
        j = next((k for k in range(i + 1, min(len(lines), i + 4)) if lines[k].strip()), None)
        window = lines[i] + ('\n' + lines[j] if j is not None else '')
        if free:
            if shows_price(window, name):
                cause = 'price-on-page'  # the venue prints a price here: Explorer must return it, not leave it out
                continue
        # Shop-style menus print the price a few lines under the title; price_matches takes only the first amount after
        # the name, so a later dish's price is never borrowed. The label rules below still use the dish line itself.
        elif not mc.price_matches('\n'.join(lines[i:i + PRICE_LINES]), name, price, bare=own_menu):
            continue
        # The label must be on the dish's own line; the next line counts only when the dish line is a bare name
        # (no price, no label), i.e. that next line is this dish's description, not the next dish.
        priced_line = not free and mc.price_matches(lines[i], name, price, bare=own_menu)
        own_label = MARK.search(lines[i]) or WORD_LABEL.search(lines[i])
        label_lines = [lines[i]] + ([lines[j]] if j is not None and not priced_line and not own_label else [])
        label = next((l for l in label_lines if MARK.search(l) or WORD_LABEL.search(l)), None)
        section = None if label else next((h for h in heading_chain(lines, i) if SECTION.search(h) and not NOT_VEG.search(h)), None)
        if not label and not section:
            cause = 'no-venue-label'
            continue
        shown = label or section
        if CONDITIONAL.search(shown) or CONDITIONAL.search(quote):
            cause = 'label-conditional'
            continue
        at = norm(window) if label else norm(section)
        if norm(quote) not in at or not (MARK.search(quote) or WORD_LABEL.search(quote) or SECTION.search(quote)):
            cause = 'label-quote-missing'
            continue
        vegan = bool(VEGAN_LABEL.search(shown))
        dish = {'name': name.strip(), 'price': price, 'diet': 'VG' if item['diet'] == 'VG' and vegan else 'V',
                'labelQuote': quote, 'labelAt': 'dish-line' if label else 'section-heading'}
        if item.get('category'):
            dish['category'] = item['category'].strip()
        if item['diet'] == 'VG' and not vegan:
            dish['dietNote'] = 'Claimed VG; the label shown is vegetarian only, so it is listed as V.'
        return dish, None
    return None, cause


def item_id(name, used):
    base = (re.sub(r'-{2,}', '-', re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower())).strip('-')[:70]
            or 'dish-' + hashlib.sha256(name.encode()).hexdigest()[:8])
    value, n = base, 2
    while value in used:
        value, n = base[:66] + '-' + str(n), n + 1
    used.add(value)
    return value


def on_page(page, value):
    pattern = name_pattern(value)
    hay = norm(page['text'])
    return bool(pattern and pattern.search(hay.replace(' ', '') if CJK.search(value) else hay))


def sg_date(value):
    try:
        parsed = dt.datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except ValueError:
        return None
    return parsed.astimezone(SG).date().isoformat() if parsed.tzinfo else None


# Clock times as written on menus, sites and Google Maps: "3:00pm", "3pm", "10.30am", "15:00", "12 noon" (20 Oct 2026). A bare
# "10.30" without am/pm is left out: it is more often a price than a time.
CLOCK = re.compile(r'(?i)(?<![\d.:$])(\d{1,2})(?:([:.])(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|noon|midnight)?(?![\d])')


def clock_minutes(text):
    """Every time of day in the text, as minutes after midnight (24:00 and midnight count as 0)."""
    found = set()
    for hour, sep, minute, suffix in CLOCK.findall(str(text)):
        h, m, s = int(hour), int(minute or 0), suffix.lower().replace('.', '').replace(' ', '')
        if m > 59 or (not s and sep != ':'):
            continue  # 9 or 10.30 alone is not a time
        if s in ('am', 'pm'):
            if not 1 <= h <= 12:
                continue
            h = h % 12 + (12 if s == 'pm' else 0)
        elif s == 'noon':
            h, m = 12, 0
        elif s == 'midnight':
            h, m = 0, 0
        elif h > 24:
            continue
        found.add((h % 24) * 60 + m)
    if re.search(r'(?i)(?<![\d\s])\s*midnight|^midnight', str(text)) or re.search(r'(?i)(?:to|till|until|-|–)\s*midnight', str(text)):
        found.add(0)
    if re.search(r'(?i)(?:^|[^\d\s])\s*noon', str(text)) or re.search(r'(?i)(?:from|to|till|until|-|–)\s*noon', str(text)):
        found.add(720)
    return found


def check_hours(root, hours, cited):
    """Hours only from a cited, stored page whose text shows every time in the schedule; otherwise dropped. Times are compared
    as times of day, so a schedule written 15:00 matches a page printing 3:00pm or 3 pm (20 Oct 2026: every proposal failed)."""
    if not isinstance(hours, dict) or hours.get('sourceUrl') not in cited:
        return None
    page = capture(root, hours['sourceUrl'])
    schedule = hours.get('schedule')
    if not (page and text_ok(hours.get('summary'), 120) and isinstance(schedule, list) and 1 <= len(schedule) <= 8
            and all(text_ok(s, 220) for s in schedule) and text_ok(hours.get('notes', ''), 500, True)):
        return None
    wanted, shown = clock_minutes(' '.join(schedule)), clock_minutes(page['text'])
    all_day = re.search(r'(?i)24\s*hours', ' '.join(schedule)) and re.search(r'(?i)24\s*hours', page['text'])
    if not (wanted or all_day) or not wanted <= shown:
        return None
    return {'summary': hours['summary'], 'schedule': schedule, 'notes': hours.get('notes', ''), 'sourceUrl': hours['sourceUrl'],
            'checkedAt': sg_date(hours.get('checkedAt')) or dt.datetime.now(SG).date().isoformat(), 'timezone': 'Asia/Singapore'}


def smart_title(text):
    """OneMap prints addresses in capitals; keep tokens with digits as printed."""
    return ' '.join(w if re.search(r'\d', w) else w.capitalize() for w in str(text).split())


def identity(root, candidate, finding, cited):
    """(name, branch, notes) once the name and postcode are on stored pages, else a hold cause."""
    name, branch = finding.get('name'), finding.get('branch') or ''
    if not text_ok(name, 120) or not text_ok(branch, 120, True):
        return None, 'invalid-finding'
    for key in ('nameSourceUrl', 'postalSourceUrl'):
        if finding.get(key) not in cited:
            return None, 'source-not-cited'
    name_page, postal_page = capture(root, finding['nameSourceUrl']), capture(root, finding['postalSourceUrl'])
    if not name_page or not postal_page:
        return None, 'no-stored-capture'
    if not on_page(name_page, name):
        return None, 'name-not-on-page'
    if candidate['postalCode'] not in re.findall(r'(?<!\d)\d{6}(?!\d)', postal_page['text']):
        return None, 'postcode-not-on-page'
    notes = []
    if branch and not (on_page(name_page, branch) or on_page(postal_page, branch)):
        notes.append('Branch name not on a stored page; left blank.')
        branch = ''
    return (name.strip(), branch.strip(), notes), None
