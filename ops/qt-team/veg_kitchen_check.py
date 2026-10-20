"""Code checks for QT Explorer's Veg Kitchen findings (owner, 20 Oct 2026). No model calls.

A Veg Kitchen place is a venue whose OWN page says the whole kitchen is vegetarian or vegan. The coordinator checks that
statement (dietProof) against the stored copy of the cited page, and every menu item's exact name and explicit SGD price
against the stored copy of the menu page (menu_coverage.price_matches; the venue's own site may print bare prices). Unlike
Mixed Kitchen there are no per-dish labels: mock-meat names are fine once the whole-venue statement is proven. Items that
fail are dropped with a counted cause (never stored by name); fewer than three survivors holds the place.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import re
import unicodedata
import urllib.parse
from zoneinfo import ZoneInfo

import menu_coverage as mc
import veg_options_check as vc
from diet_review import CLOSED

SG = ZoneInfo('Asia/Singapore')
MIN_ITEMS = 3
MAX_ITEMS = 400
QUOTE_MAX = 200
CATEGORY_MAX = 40

# The app's contract patterns (server/editorial/validation.mjs). They also match negations and partial claims, which is why
# the guards below exist: the app cannot tell "not vegetarian" from "vegetarian".
# Every vegan phrase is also vegetarian proof ("our desserts contain no animal products"); kept in step with the app's vegetarianWords.
DIET_RE = re.compile(r'vegetarian|vegan|plant[- ]based|meat[- ]free|meatless|素|斋|齋|no animal products|animal[- ]free', re.I)
VEGAN_RE = re.compile(r'vegan|plant[- ]based|全素|纯素|純素|no animal products|animal[- ]free', re.I)

# A port of the app's denial test (server/editorial/validation.mjs deniesDiet): the app refuses a quote that denies the diet, so this
# mirror must refuse at least the same quotes. "No animal products" and "no onion, no garlic" are claims about ingredients and are
# set aside first, so "No animal products, 100% vegan" stays valid.
_DIET_WORD = r'(?:vegetarian|vegan|plant[- ]based|meat[- ]free|meatless)'
_NEGATION_WORD = r"(?:not|non|no|isn['’]?t|aren['’]?t|don['’]?t|doesn['’]?t|without|never)"
NEGATED = re.compile(r'\b' + _NEGATION_WORD + r'\b[^.!?;:]{0,25}?\b' + _DIET_WORD, re.I | re.A)
NON_VEGETARIAN = re.compile(r'\bnon[- ]?veg', re.I | re.A)
NEGATED_CJK = re.compile(r'(?:非|不是|并非|並非)[^。！？；\s]{0,6}(?:素|斋|齋)')
OFFERS_MEAT_CJK = re.compile(r'(?:提供|供应|供應|含有?)\s*[荤葷]')  # our own extra: "we serve meat dishes"
INGREDIENT_DENIAL = re.compile(r"\b(?:no|without|never|zero)\s+(?:use of\s+|uses?\s+)?(?:any\s+)?(?:animal|meat|fish|seafood|eggs?|dairy|poultry|onions?|"
                               r"garlic|alliums?|pungent|msg|additives?|preservatives?)(?:[- ](?:products?|ingredients?|derived|based|by-?products?|vegetables?))*\b",
                               re.I | re.A)
PARTIAL = re.compile(r"(?i)\b(?:vegetarian|vegan|plant[- ]based|veg)[- ](?:friendly|options?|choices?|selections?|offerings?)\b|"
                     r"\boptions?\s+(?:for|of|include)\s+(?:vegetarians?|vegans?)\b|\b(?:some|selected|certain|many|most)\b[^.]{0,30}(?:\b(?:vegetarian|vegan|plant)|no animal products|animal[- ]free)|"
                     r"\b(?:mostly|mainly|largely|partly|partially)\b|\b(?:vegetarian|vegan)s?\s+(?:and|or|&|/)\s+(?:non|meat)|"
                     r"\b(?:meat|seafood|fish|chicken|pork|beef)\b[^.]{0,30}\b(?:and|or|&)\b[^.]{0,30}\b(?:vegetarian|vegan)|"
                     r"素食(?:选择|選擇|可选|可選)")
# A strong whole-venue wording rescues a quote that also mentions options ("100% vegetarian, with vegan options").
STRONG = re.compile(r"(?i)(?:100\s*%|\b(?:fully|entirely|totally|completely|wholly|purely|pure|strictly|exclusively)\b)[^.]{0,40}"
                    r"\b(?:vegetarian|vegan|plant[- ]based|meat[- ]free|meatless)|"
                    r"\b(?:vegetarian|vegan|plant[- ]based)\s+(?:restaurant|cafe|café|kitchen|eatery|bistro|stall|shop|bakery|buffet|diner)\b|"
                    r"全素|纯素|純素|素食(?:餐|馆|館|店|自助)")
# Google, delivery apps and aggregators describe a venue; they are never the venue's own statement.
PROOF_BLOCKED = ('google.', 'googleusercontent.com', 'gstatic.com', 'foodpanda.', 'grab.com', 'grabfood', 'deliveroo.', 'gojek.',
                 'shopee.', 'oddle.', 'tripadvisor.', 'burpple.', 'yelp.', 'chope.', 'quandoo.', 'happycow.', 'linktr.ee', 'wa.me')
MIXED = re.compile(r'(?i)^\s*mixed[- ]kitchen')
CAUSES = {
    'diet-proof-not-on-page': 'The whole-venue quote is not on the stored copy of the cited page.',
    'diet-proof-unsuitable': 'The quote is negated, partial (options, friendly), too short, or from Google or a delivery app.',
    'diet-page-unrelated': 'The cited page does not name the venue and is not on its own website.',
    'too-few-verified-items': 'Fewer than 3 menu items had their exact name and SGD price on the stored menu page.',
    'closed': 'A stored page says the venue is closed.',
    'mixed-kitchen': 'Explorer found real meat or seafood, or a mixed kitchen.',
}


def today_sg():
    return dt.datetime.now(SG).date().isoformat()


def clamp_date(value):
    """A day-only Singapore date, never later than today in Singapore (the app refuses future dates)."""
    day = str(value or '')[:10]
    return min(day, today_sg()) if re.fullmatch(r'\d{4}-\d{2}-\d{2}', day) else today_sg()


def clean_quote(value):
    """The quote with every run of whitespace (tabs, newlines, carriage returns) turned into one space."""
    return ' '.join(value.split()) if isinstance(value, str) else None


def has_control(text):
    return any(unicodedata.category(c) == 'Cc' for c in text)


def plain(text):
    """Page text as a reader sees it: Markdown emphasis, code ticks and link targets removed, then normalised."""
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', str(text))
    return vc.norm(re.sub(r'[*_`#>|]+', ' ', text))


def negated(quote):
    """True when the quote denies the diet (the app's own rule, plus Chinese 'we serve meat dishes')."""
    return bool(NON_VEGETARIAN.search(quote) or NEGATED_CJK.search(quote) or OFFERS_MEAT_CJK.search(quote)
                or NEGATED.search(INGREDIENT_DENIAL.sub(' ', quote)))


def meaningful(quote):
    """A single word ("Vegan") is a label or a menu heading, not a statement about the venue."""
    return len(re.findall(r'[A-Za-z0-9]+', quote)) + len(vc.CJK.findall(quote)) // 2 >= 2


def suitable_quote(quote):
    """True when the quote can prove a whole venue is vegetarian or vegan (negation and partial claims are refused)."""
    if not (DIET_RE.search(quote) and meaningful(quote)) or negated(quote):
        return False
    return not PARTIAL.search(quote) or bool(STRONG.search(quote))


def app_url(value):
    """A source URL the app accepts: public https, at most 600 characters, a named host with a letters-only top-level domain."""
    from workflow import public_url
    host = urllib.parse.urlsplit(value).hostname if isinstance(value, str) else None
    return bool(public_url(value) and len(value) <= 600 and host and re.fullmatch(r'[a-z0-9.-]+\.[a-z]{2,}', host, re.I))


def blocked_host(host):
    host = (host or '').lower()
    for b in PROOF_BLOCKED:
        if b.endswith('.'):
            if host.startswith(b) or '.' + b in host:
                return True
        elif '.' in b:
            if host == b or host.endswith('.' + b):
                return True
        elif b in host:
            return True
    return False


def brand_core(name):
    """The venue name before a branch suffix: "Joy Vegetarian @ Bugis" -> "Joy Vegetarian"."""
    return re.split(r'\s+(?:@|-|–|—|at)\s+|\s*[(,]', str(name), maxsplit=1)[0].strip()


def check_proof(root, candidate, finding, cited, name):
    """(proof, venueDiet, notes, None) when the venue's own page proves it, else (None, None, [], cause)."""
    proof = finding.get('dietProof')
    if not isinstance(proof, dict):
        return None, None, [], 'invalid-finding'
    url, quote = proof.get('sourceUrl'), clean_quote(proof.get('quote'))
    if not (isinstance(url, str) and quote and len(quote) <= QUOTE_MAX and not has_control(quote)):
        return None, None, [], 'invalid-finding'
    if url not in cited:
        return None, None, [], 'source-not-cited'
    if blocked_host(urllib.parse.urlsplit(url).hostname):
        return None, None, [], 'diet-proof-unsuitable'
    page = vc.capture(root, url)
    if not page:
        return None, None, [], 'no-stored-capture'
    if plain(quote) not in plain(page['text']):
        return None, None, [], 'diet-proof-not-on-page'
    if not suitable_quote(quote):
        return None, None, [], 'diet-proof-unsuitable'
    own = vc.site(url) in vc.official_sites(root, candidate)
    if not (own or vc.on_page(page, name) or vc.on_page(page, brand_core(name))):
        return None, None, [], 'diet-page-unrelated'
    notes, diet = [], 'Vegetarian'
    if finding.get('venueDiet') == 'Vegan':
        if VEGAN_RE.search(quote):
            diet = 'Vegan'
        else:
            notes.append('Claimed Vegan; the quote says vegetarian only, so it is listed as Vegetarian.')
    return {'sourceUrl': url, 'quote': quote}, diet, notes, None


def closure(root, finding, cited):
    """True when Explorer's closure quote is on a cited, stored page and reads as a closure."""
    claim = finding.get('closure')
    if not isinstance(claim, dict):
        return False
    url, quote = claim.get('sourceUrl'), clean_quote(claim.get('quote'))
    page = vc.capture(root, url) if isinstance(url, str) and url in cited else None
    return bool(page and quote and len(quote) <= QUOTE_MAX and CLOSED.search(quote) and vc.norm(quote) in vc.norm(page['text']))


def item_id(name, used):
    """Slug of the name, at least 3 characters (the app's pattern), unique within the menu."""
    base = re.sub(r'-{2,}', '-', re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower())).strip('-')[:70]
    if not base:
        base = 'dish-' + hashlib.sha256(name.encode()).hexdigest()[:8]
    elif len(base) < 3:
        base += '-dish'
    value, n = base, 2
    while value in used:
        value, n = base[:66] + '-' + str(n), n + 1
    used.add(value)
    return value


PRICE_LINES = 8


def check_item(item, lines, has_sgd, own):
    """(verified item, None) or (None, cause): the exact name and an explicit SGD price on the stored page."""
    if not isinstance(item, dict) or not vc.text_ok(item.get('name'), 120):
        return None, 'invalid-item'
    category = item.get('category')
    if category is not None and not vc.text_ok(category, CATEGORY_MAX, True):
        return None, 'invalid-item'
    name = item['name']
    price = {k: item['price'][k] for k in ('amount', 'currency', 'type', 'maxAmount') if isinstance(item.get('price'), dict) and k in item['price']}
    if not vc.price_ok(price):
        return None, 'price-format'
    free = vc.unpriced(price)
    if not free and not own and not has_sgd:
        return None, 'no-sgd-in-capture'
    spots = vc.dish_lines(lines, name)
    if not spots:
        return None, 'name-not-in-capture'
    if free:
        # Listed without a price (owner, 20 Oct 2026): accepted only when no price shows on the item's line or the next one.
        for i in spots:
            j = next((k for k in range(i + 1, min(len(lines), i + 4)) if lines[k].strip()), None)
            if not vc.shows_price(lines[i] + ('\n' + lines[j] if j is not None else ''), name):
                dish = {'name': name.strip(), 'price': dict(vc.UNPRICED)}
                if category and category.strip():
                    dish['category'] = category.strip()
                return dish, None
        return None, 'price-on-page'
    for i in spots:
        # Shop-style menus (WooCommerce, Shopify) print the price a few lines under the item's title; price_matches
        # takes only the first amount after the name, so a later item's price is never borrowed.
        if mc.price_matches('\n'.join(lines[i:i + PRICE_LINES]), name, price, bare=own):
            dish = {'name': name.strip(), 'price': price}
            if category and category.strip():
                dish['category'] = category.strip()
            return dish, None
    return None, 'price-not-in-capture'


def check_items(root, candidate, menu, page, url):
    """(items with ids, dropped-cause counts) from Explorer's menu against the stored capture of its page."""
    own = vc.site(url) in vc.official_sites(root, candidate) and not mc.FOREIGN.search(page['text'])
    lines, has_sgd = page['text'].splitlines(), bool(re.search(r'S\$|\bSGD\b', page['text']))
    items, used, names, dropped = [], set(), set(), {}
    for raw in (menu.get('items') or [])[:MAX_ITEMS] if isinstance(menu.get('items'), list) else []:
        dish, why = check_item(raw, lines, has_sgd, own)
        if dish and (vc.norm(dish['name']) in names or dish['name'].lower() in names):
            dish, why = None, 'duplicate-name'
        if not dish:
            dropped[why] = dropped.get(why, 0) + 1
            continue
        names.update((vc.norm(dish['name']), dish['name'].lower()))
        dish['id'] = item_id(dish['name'], used)
        items.append(dish)
    return items, dropped
