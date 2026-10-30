"""Useful recipes only (owner, 18 Oct 2026): easy, well rated, naturally allium-free and made from ingredients
that are easy to buy in Singapore, always from a referenced source page.

Owner, 28 Oct 2026 (docs/RECIPE_SOURCING_PLAN.md §5a): the star rating is no longer required; every recipe must meet the
nutrient level and colour dish (recipe_standards.py, measured from the page's own ingredient lines and again on Cooker's version
with the v3 nutrition table), keep the time, ingredient, step, pantry and author rules, and pass the owner's rulebook
(recipe_charter.py), learned from the recipes the owner deleted. A page that also meets the star bar ranks higher and keeps its
rating in Recipe info (path 'rated'); one without is path 'content'.

The facts come from the recipe page's own schema.org Recipe data (rating, rating count, times, ingredient
lines, steps), fetched through the egress guard, never from the model's description of the page. A Cooker
proposal publishes only if its source passes these checks and the QuinTaste adaptation stays within them.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import html
import json
import math
import os
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

ROOT = Path(os.environ.get('QT_TEAM_ROOT', '/opt/data/qt-team'))


class NothingToCook(Exception):
    """No shortlisted page met the bar this round: a valid outcome, not a failure."""


def page_key(url):
    """One key per recipe page: host without www, path without a trailing slash; query and fragment dropped. The path is
    decoded, so a Chinese page written plainly or percent-encoded is the same page (30 Oct 2026)."""
    parts = urlsplit(str(url or '').strip())
    return (parts.hostname or '').lower().removeprefix('www.') + unquote(parts.path).rstrip('/')


def ascii_url(url):
    """The URL as an HTTP request needs it: a non-ASCII host in IDNA, a non-ASCII path or query percent-encoded (30 Oct
    2026: every taipei.tzuchi.com.tw page failed with UnicodeEncodeError). Already-encoded parts stay as they are."""
    parts = urlsplit(url)
    host = parts.netloc.encode('idna').decode('ascii') if not parts.netloc.isascii() else parts.netloc
    return urlunsplit((parts.scheme, host, quote(parts.path, safe="/%:@!$&'()*+,;=-._~"),
                       quote(parts.query, safe="/%:@!$&'()*+,;=-._~?"), ''))
BAR = {'rating': 4.5, 'ratings': 20, 'minutes': 30, 'ingredients': 12, 'steps': 8, 'outsidePantry': 1}
CACHE_SECONDS = 7 * 86400
CACHE_VERSION = 3  # 2: author @id references resolved; 3: plain-text recipe pages (recipe_page.py)
MAX_PAGE = 3 * 1024 * 1024
TRUSTED_BOOST = 3  # well-known creators rank first (trusted_creators.json); never a substitute for the bar
RATED_BOOST = 2  # a page that also meets the star bar ranks above one without; the rating itself is no longer required
CONCERN_PENALTY = 1  # each concern lowers a page's rank; concerns never reject it (owner, 28 Oct 2026)
SOURCE_INGREDIENTS = 16  # a page with up to 16 lines can be trimmed to 12 (garnish, optional toppings); more cannot
# Chinese ingredient lines: meat and seafood, but not 素鸡/素肉 (vegetarian), 鸡蛋 (egg), 牛奶 (milk), 肉桂 (cinnamon) and the like.
# Plant foods named after animals are not meat (28 Oct 2026: 牛番茄, beefsteak tomato, rejected a vegetarian pasta): 牛番茄,
# 牛蒡 (burdock), 牛肝菌 (porcini), 鸡腿菇/雞腿菇 (shaggy mane), 鸡枞 (termite mushroom), 羊肚菌 (morel), 猴头菇 needs no rule.
NOT_VEGETARIAN_ZH = re.compile(r'(?<!素)(?:鸡(?!蛋|腿菇|枞)|雞(?!蛋|腿菇|樅)|鸭(?!蛋)|鹅(?!蛋)|猪|牛(?!奶|油果|番茄|蒡|肝菌)|羊(?!奶|肚菌)|鱼(?!腥草)|虾|蟹|蚝油|鱼露|培根|火腿|明胶|鱿鱼|章鱼|海鲜|(?<!果)肉(?!桂|豆蔻|松))')
CJK = re.compile(r'[㐀-鿿]')
ANONYMOUS = {'admin', 'administrator', 'editor', 'editors', 'staff', 'team', 'author', 'guest', 'user', 'anonymous', 'unknown'}
SOURCE_STEPS = 2 * BAR['steps']  # sites split easy recipes into many tiny steps; the QuinTaste version keeps to 8
NOT_VEGETARIAN = re.compile(r'\b(chicken|pork|beef|mutton|lamb|bacon|ham|lard|anchov\w*|fish|bonito|katsuobushi|shrimp|prawns?|'
                            r'octopus|squid|crab|oysters?|scallops?|clams?|sashimi|shirasu|gelatine?)\b', re.I)
# Plant foods named after animals are not meat (28 Oct 2026: 'king oyster mushroom' blocked a Buddhist temple's soup).
PLANT_NAMES = re.compile(r'\b(?:king )?oyster mushrooms?\b|\bfish mint\b|\bchicken[- ]of[- ]the[- ]woods\b|\b(?:vegetarian|vegan|mushroom) (?:oyster|fish) sauce\b|\bhen[- ]of[- ]the[- ]woods\b', re.I)


def meat_words(text):
    """Meat and seafood words in an ingredient line, after plant foods named after animals are taken out."""
    text = PLANT_NAMES.sub(' ', _norm(text))
    if 'vegetarian' in text or 'vegan' in text:
        return []
    return [m.group(0).lower() for m in [NOT_VEGETARIAN.search(text) or NOT_VEGETARIAN_ZH.search(text)] if m]
LD_JSON = re.compile(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.I | re.S)
DURATION = re.compile(r'^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$', re.I)
QUANTITY = re.compile(r'^[\d\s/.,½¼¾⅓⅔⅛\-–~x×]+')
UNITS = re.compile(r'^(?:cups?|tbsps?|tablespoons?|tsps?|teaspoons?|g|grams?|kg|ml|l|litres?|liters?|oz|ounces?|lbs?|pounds?|'
                   r'pieces?|pcs|slices?|cloves?|sprigs?|stalks?|bunch(?:es)?|handfuls?|pinch(?:es)?|dash(?:es)?|cans?|tins?|packets?|'
                   r'packs?|blocks?|sheets?|thumbs?|inch(?:es)?|cm|whole|large|medium|small|heaped|level|of)\b\.?\s*', re.I)


def _read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.is_file() else default


def _write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding='utf-8')
    temp.replace(path)


def _norm(text):
    text = re.sub(r'<[^>]*>', ' ', html.unescape(str(text)))  # some sites put HTML inside their recipe data
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', text).casefold()).strip()


def trusted(root):
    return _read(root / 'trusted_creators.json', {'sites': {}})['sites']


def pantry(root):
    data = _read(root / 'pantry_sg.json', {'basics': [], 'items': {}})
    names = set(data['basics'])
    for name, aliases in data['items'].items():
        names.update([name, *aliases])
    # Longest first, so "sesame oil" is tried before "oil".
    return sorted((_norm(n) for n in names), key=len, reverse=True)


def core(line):
    """'2 tbsp light soy sauce (or tamari), to taste' -> 'light soy sauce'."""
    text = _norm(line)
    text = re.sub(r'\([^)]*\)', ' ', text).split(',')[0].split(';')[0]
    text = re.sub(r'\b(?:or|plus|for|to taste|optional)\b.*$', '', text)
    for _ in range(3):
        text = UNITS.sub('', QUANTITY.sub('', text).strip()).strip()
    return text.strip(' -:.')


def local(line, names):
    text = ' ' + core(line) + ' '
    return any(re.search(r'(?<![a-z])' + re.escape(n) + r'(?:e?s)?(?![a-z])', text) for n in names if n)  # 'cucumbers' is 'cucumber'


def minutes(value):
    match = DURATION.match(str(value or '').strip())
    if not match or not any(match.groups()):
        return None
    d, h, m, s = (float(x or 0) for x in match.groups())
    total = round(d * 1440 + h * 60 + m + s / 60)
    return total or None  # PT0M means the page did not publish a time


def _recipe(node):
    if isinstance(node, list):
        for item in node:
            found = _recipe(item)
            if found:
                return found
    elif isinstance(node, dict):
        kind = node.get('@type')
        if kind == 'Recipe' or (isinstance(kind, list) and 'Recipe' in kind):
            return node
        for key in ('@graph', 'mainEntity', 'itemListElement'):
            if key in node:
                found = _recipe(node[key])
                if found:
                    return found
    return None


def _steps(instructions):
    if isinstance(instructions, str):
        return max(1, len([s for s in re.split(r'\n+|<li', instructions) if s.strip()]))
    count = 0
    for item in instructions if isinstance(instructions, list) else [instructions]:
        if isinstance(item, dict) and item.get('@type') == 'HowToSection':
            count += _steps(item.get('itemListElement', []))
        elif item:
            count += 1
    return count


def _index(node, nodes):
    if isinstance(node, list):
        for item in node:
            _index(item, nodes)
    elif isinstance(node, dict):
        if isinstance(node.get('@id'), str) and len(node) > 1:
            nodes.setdefault(node['@id'], node)
        for value in node.values():
            _index(value, nodes)


def parse(page):
    """The page's schema.org Recipe, with an author given as an @id reference (Yoast, WP Recipe Maker) resolved."""
    blocks = []
    for block in LD_JSON.findall(page):
        try:
            blocks.append(json.loads(block.strip().removeprefix('<!--').removesuffix('-->')))
        except ValueError:
            continue
    nodes = {}
    _index(blocks, nodes)
    found = _recipe(blocks)
    if found:
        authors = found.get('author')
        resolve = lambda a: nodes.get(a['@id'], a) if isinstance(a, dict) and 'name' not in a and isinstance(a.get('@id'), str) else a
        found = dict(found, author=[resolve(a) for a in authors] if isinstance(authors, list) else resolve(authors))
    return found


def fetch(root, url):
    """The recipe page's structured data, cached for a week (one guarded fetch per page)."""
    from cover_photos import GUARD, USER_AGENT
    from workflow import public_url
    if not public_url(url):
        raise ValueError('not a public https URL')
    cache = root / 'state/recipe-data' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    stored = _read(cache)
    if stored and stored.get('v') == CACHE_VERSION and time.time() - stored['fetchedEpoch'] < CACHE_SECONDS:
        return stored
    import urllib.request
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': GUARD, 'http': GUARD}))
    request = urllib.request.Request(ascii_url(url), headers={'User-Agent': USER_AGENT, 'Accept': 'text/html'})
    with opener.open(request, timeout=30) as response:
        page = response.read(MAX_PAGE + 1).decode('utf-8', 'replace')
    import recipe_page
    recipe = parse(page[:MAX_PAGE]) or recipe_page.plain_recipe(page[:MAX_PAGE])
    stored = {'v': CACHE_VERSION, 'url': url, 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'fetchedEpoch': time.time(), 'recipe': recipe}
    _write(cache, stored)
    return stored


import nutrition  # noqa: E402  (the v3 table's units; nutrition.py imports nothing from here)


def _method(instructions):
    """The page's method as one text, for the rulebook's deep-fry check."""
    if isinstance(instructions, str):
        return html.unescape(re.sub(r'<[^>]*>', ' ', instructions))
    parts = []
    for item in instructions if isinstance(instructions, list) else [instructions]:
        if isinstance(item, dict):
            parts.append(_method(item.get('itemListElement')) if item.get('@type') == 'HowToSection' else str(item.get('text') or item.get('name') or ''))
        elif item:
            parts.append(str(item))
    return ' '.join(parts)


FRACTIONS = {'½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125}
AMOUNT = re.compile(r'^(\d+(?:[.,]\d+)?)?\s*(?:(\d+)/(\d+))?')
PACK = re.compile(r'^\((\d+(?:[.,]\d+)?)\s*(oz|g|ml)\)\s*(?:cans?|tins?|packs?|packets?|blocks?|cartons?|jars?)\b')
NOT_UNITS = {'whole', 'large', 'medium', 'small', 'of', 'heaped', 'level'}
WORD_AMOUNTS = {'a': 1, 'an': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'eight': 8, 'ten': 10, 'twelve': 12,
                'half': 0.5, 'half a': 0.5, 'a half': 0.5}


def structured(line):
    """'1½ tbsp light soy sauce' -> {'name': 'light soy sauce', 'amount': 1.5, 'unit': 'tbsp'}; amount None for 'to taste'."""
    raw = str(line or '')
    for char, value in FRACTIONS.items():  # before NFKC, which turns '1½' into '11⁄2'
        raw = raw.replace(char, ' ' + {0.5: '1/2', 0.25: '1/4', 0.75: '3/4', 0.125: '1/8'}.get(value, '1/3' if value < 0.5 else '2/3'))
    text = _norm(raw).replace('⁄', '/')
    spelled = re.match(r'^(half a|a half|an?|one|two|three|four|five|six|eight|ten|twelve|half)\b\s*', text)
    if spelled and not re.match(r'^an?\s+(?:pinch|dash|little|few|handful)\b', text):
        text = str(WORD_AMOUNTS[spelled.group(1)]) + ' ' + text[spelled.end():]
    match = AMOUNT.match(text)
    if match.group(1) and match.group(2) is None and re.match(r'^\d+/\d+', text):  # "1/2 cup": a fraction, not 1
        match = re.match(r'^()(\d+)/(\d+)()', text)
    whole = float(match.group(1).replace(',', '.')) if match.group(1) else 0.0
    part = int(match.group(2)) / int(match.group(3)) if match.group(2) and int(match.group(3)) else 0.0
    amount = whole + part or None
    rest = text[match.end():]
    if re.match(r'^\s*[-–]\s*\d', rest):  # "2-3 cups": the first number
        rest = re.sub(r'^\s*[-–]\s*\d+(?:[.,]\d+)?', '', rest)
    rest = rest.strip()
    pack = PACK.match(rest)
    if pack and amount:  # "1 (14 oz) can coconut milk": the pack size, in its own unit
        amount, rest = amount * float(pack.group(1).replace(',', '.')), pack.group(2) + ' ' + rest[pack.end():].strip()
    unit = ''
    word = re.match(r'^([a-z]+)\.?(?![a-z])', rest)
    if word and amount:
        candidate = word.group(1)
        if candidate in nutrition.WEIGHT_UNITS or (candidate not in NOT_UNITS and UNITS.match(candidate + ' ')):
            unit, rest = candidate, rest[word.end():]
    if 'to taste' in text or 'as needed' in text:
        amount = None
    return {'name': core(rest) or core(line), 'amount': amount, 'unit': unit if amount else ''}


def content_figures(root, lines, servings, name=''):
    """The page's nutrition, vitamins, minerals and colours per serving (nutrition.estimate detail), or None when not measurable."""
    import recipe_charter
    if not servings:
        return None
    try:
        return nutrition.estimate(recipe_charter.team_root(root, 'nutrition_sg.json'),
                                  {'name': name, 'servings': servings, 'ingredients': [structured(x) for x in lines]}, detail=True)
    except (OSError, ValueError, KeyError):
        return None


def _number(value):
    try:
        return float(str(value).replace(',', ''))
    except (TypeError, ValueError):
        return None


def assess(root, url):
    """Check a source recipe page against the owner's bar. Never raises; failures are reasons."""
    try:
        return _assess(root, url)
    except Exception as exc:  # malformed page data is a failed check, not a crashed round
        return {'url': url, 'passes': False, 'reasons': ['page recipe data unreadable: ' + type(exc).__name__]}


def _rating(recipe):
    rating = recipe.get('aggregateRating') or {}
    rating = rating[0] if isinstance(rating, list) and rating else rating
    value = _number(rating.get('ratingValue')) if isinstance(rating, dict) else None
    best = _number(rating.get('bestRating')) if isinstance(rating, dict) else None
    if value is not None and best and best != 5:
        value = value * 5 / best
    return value, _number((rating.get('ratingCount') or rating.get('reviewCount')) if isinstance(rating, dict) else None)


def _assess(root, url):
    """hard ('reasons'): what no judgement can fix, so the page is not offered to Cooker. concerns: the rest, which Cooker sees when
    it writes and QT Manager judges in review; each one lowers the page's rank (owner, 28 Oct 2026: be smart, not rigid)."""
    import recipe_charter
    import recipe_standards
    from recipe_policy import PUNGENT
    try:
        stored = fetch(root, url)
    except Exception as exc:
        return {'url': url, 'passes': False, 'reasons': ['page could not be read: ' + type(exc).__name__], 'concerns': []}
    recipe = stored.get('recipe')
    if not recipe:
        return {'url': url, 'passes': False, 'reasons': ['page has no recipe the coordinator can read (no ingredient list and method)'], 'concerns': []}
    plain = bool(recipe.get('_plain'))
    value, count = _rating(recipe)
    total = minutes(recipe.get('totalTime'))
    if total is None and (minutes(recipe.get('prepTime')) is not None or minutes(recipe.get('cookTime')) is not None):
        total = (minutes(recipe.get('prepTime')) or 0) + (minutes(recipe.get('cookTime')) or 0)
    raw = [html.unescape(str(i)) for i in (recipe.get('recipeIngredient') or recipe.get('ingredients') or [])]
    heading = re.compile(r'^\s*<(b|strong|h[1-6])>[^<]*</\1>\s*:?\s*$', re.I)  # e.g. "<b>Dressing</b>"
    lines = [_norm(i) for i in raw if not heading.match(i)]
    lines = [line for line in lines if line and not line.endswith(':')]  # drop empty lines and section headings
    steps = _steps(recipe.get('recipeInstructions') or [])
    names = pantry(root)
    # Chinese-language lines are checked on the English QuinTaste version instead (gate), where the pantry names apply.
    outside = [line for line in lines if not CJK.search(core(line)) and not local(line, names)]
    pungent = sorted({m.group(0).lower() for line in lines for m in [PUNGENT.search(_norm(line))] if m})
    meat = sorted({w for line in lines for w in meat_words(line)})
    rules = recipe_charter.source_findings(root, recipe.get('name', ''), lines, _method(recipe.get('recipeInstructions')))
    author = recipe.get('author')
    author = (author[0] if isinstance(author, list) and author else author) or {}
    author = re.sub(r'\s+', ' ', html.unescape(str((author.get('name') if isinstance(author, dict) else author) or ''))).strip()
    site = (urlsplit(url).hostname or '').removeprefix('www.')
    hard = [*rules['hard']]
    if not lines:
        hard.append('ingredients not published')
    if meat:
        hard.append('not vegetarian as written: ' + ', '.join(meat))
    if pungent:
        hard.append('not naturally allium-free: ' + ', '.join(pungent))
    if not author or _norm(author) in ANONYMOUS or _norm(author) == site:
        hard.append('no named author or organisation')  # owner rule: every recipe is credited to a named creator
    if len(lines) > SOURCE_INGREDIENTS:
        hard.append(f'{len(lines)} ingredients (too many to trim to {BAR["ingredients"]})')
    concerns = [*rules['concerns']]
    if total is None:
        concerns.append('the page states no time; write a realistic total and keep it within ' + str(BAR['minutes']) + ' min')
    elif total > BAR['minutes']:
        concerns.append(f'the page takes {total} min; the QuinTaste version must fit {BAR["minutes"]}')
    if BAR['ingredients'] < len(lines) <= SOURCE_INGREDIENTS:
        concerns.append(f'{len(lines)} ingredients; trim garnish or optional items to {BAR["ingredients"]}')
    if steps > SOURCE_STEPS:
        concerns.append(f'{steps} steps on the page; the QuinTaste version keeps to {BAR["steps"]}')
    if len(outside) > BAR['outsidePantry']:
        concerns.append('may be hard to buy in Singapore: ' + '; '.join(core(x) for x in outside[:4]))
    figures = content_figures(root, lines, nutrition.page_yield(recipe), recipe.get('name', ''))
    content = recipe_standards.problems(figures) if figures else []
    if content:
        concerns.append('as written it misses the nutrient level or colours (' + '; '.join(content[:2]) + '); the QuinTaste version must meet them')
    rated = value is not None and count is not None and value >= BAR['rating'] and count >= BAR['ratings']
    known = trusted(root).get(site)
    score = ((value or 0) * math.log10((count or 0) + 1) - (total or 45) / 30 + (TRUSTED_BOOST if known else 0) + (RATED_BOOST if rated else 0)
             - CONCERN_PENALTY * len(concerns))
    return {'url': url, 'site': site, 'siteName': known or site, 'trusted': bool(known), 'name': _norm(recipe.get('name', ''))[:160], 'author': author[:160],
            'rating': value, 'ratings': int(count or 0), 'minutes': total, 'ingredients': lines[:40], 'steps': steps, 'plainPage': plain,
            'timing': {k: v for k, v in (('prep', minutes(recipe.get('prepTime'))), ('cook', minutes(recipe.get('cookTime'))), ('total', total))
                       if v is not None},
            'outsidePantry': [core(x) for x in outside], 'passes': not hard, 'reasons': hard, 'concerns': concerns, 'score': round(score, 3),
            'path': 'rated' if rated else 'content',
            'content': recipe_standards.summary(figures) if figures and not content else 'measured on the QuinTaste version',
            'checkedAt': stored['fetchedAt'][:10]}


def gate(root, record):
    """Hold a Cooker proposal unless its source passes the bar and the adaptation stays easy and local.
    Passing proposals get the source's rating attached by the coordinator (shown in Recipe info)."""
    recipe = record.get('recipe') or {}
    recipe.pop('qualifiedBy', None)  # only this gate sets it, never the model
    if record.get('status') != 'proposed' or not recipe:
        return record
    urls = [s.get('url') for s in record.get('sources', []) if isinstance(s, dict)]
    primary = assess(root, urls[0]) if urls else {'passes': False, 'reasons': ['no source page']}
    source = primary if primary['passes'] else None
    reasons = [] if source else ['primary source below the bar: ' + '; '.join(primary['reasons'][:3])]
    if source:
        names = pantry(root)
        ingredients = recipe.get('ingredients') or []
        outside = [i.get('name', '') for i in ingredients if not local(i.get('name', ''), names)]
        if isinstance(recipe.get('minutes'), (int, float)) and recipe['minutes'] > BAR['minutes']:
            reasons.append(f'adapted recipe takes {recipe["minutes"]} min')
        if len(ingredients) > BAR['ingredients']:
            reasons.append(f'adapted recipe has {len(ingredients)} ingredients')
        if len(recipe.get('steps') or []) > BAR['steps']:
            reasons.append(f'adapted recipe has {len(recipe["steps"])} steps')
        found = version_findings(root, recipe)
        reasons += found['hard']
        concerns = found['concerns'] + (['may be hard to buy in Singapore: ' + ', '.join(outside[:4])] if len(outside) > BAR['outsidePantry'] else [])
        if concerns:
            record['notes'] = (str(record.get('notes', '')) + ' For QT Manager to judge against the owner\'s lessons: ' + '; '.join(concerns) + '.').strip()
    if reasons:
        recipe.pop('_content', None)
        record['status'] = 'held'
        record['notes'] = (str(record.get('notes', '')) + ' Quality bar: ' + '; '.join(reasons)).strip()
    else:
        recipe['qualifiedBy'] = source['path']
        record['notes'] = (str(record.get('notes', '')) + f" Qualified by {source['path']}: {recipe.pop('_content', source['content'])}.").strip()
        if source['path'] == 'rated':
            recipe['sourceRating'] = {'value': round(source['rating'], 1), 'count': source['ratings'], 'site': source['siteName'][:80],
                                      'url': source['url'], 'checkedAt': source['checkedAt']}
        # The credit comes from the page's own data, not the model; but a site login such as 'weiny' is the account that posted
        # it, not its creator (30 Oct 2026: QT Manager held a Tzu Chi volunteers' recipe credited to 'weiny'). Then Cooker's named
        # credit is used, or the site's name.
        own = recipe.get('author') if isinstance(recipe.get('author'), str) else ''
        login = re.fullmatch(r'[a-z0-9_.-]{2,24}', source['author'] or '')
        recipe['author'] = (own.strip() if own.strip() and not re.fullmatch(r'[a-z0-9_.-]{2,24}', own.strip()) else source['siteName']) if login else source['author']
        # The source's own timing, read from the page, so Cooker cannot misstate it (30 Oct 2026: a curry held for "prep 12, cook
        # 18" when the page says 10 and 15); without one, the total is marked as an editorial estimate.
        recipe['sourceTimingMinutes'] = ({**source['timing'], 'note': 'as the source page states (read by the coordinator)'} if source.get('timing')
                                         else {'estimated': True, 'note': 'the source page states no time; the total is an editorial estimate'})
        try:  # optional: a recipe without reliable nutrition is still published, just without the section
            import nutrition
            nutrition.attach(root, recipe, fetch(root, source['url']).get('recipe'), source['siteName'])
        except Exception:
            recipe.pop('nutrition', None)
    return record


def version_findings(root, recipe):
    """{'hard', 'concerns'} for Cooker's own version: the owner's rulebook and the content check (nutrient level, colour dish; hard,
    as the owner set it)."""
    import recipe_charter
    import recipe_standards
    root = recipe_charter.team_root(root, 'nutrition_sg.json')
    loaded = nutrition.table(root)
    servings = recipe.get('servings') if isinstance(recipe.get('servings'), (int, float)) and recipe.get('servings') > 0 else 1
    oil = sweet = 0.0
    sweetener = recipe_charter.load(root)['re']['sweetener']
    for item in recipe.get('ingredients') or []:
        hit = nutrition._match(item.get('name', ''), loaded)
        grams = nutrition._grams(item, hit[1] if hit else None, loaded) or 0.0
        if re.search(r'\boil\b', _norm(item.get('name', ''))) and 'sesame' not in _norm(item.get('name', '')):
            oil += grams / 0.92  # ml of oil
        if sweetener.search(_norm(item.get('name', ''))):
            sweet += grams
    found = recipe_charter.recipe_findings(root, recipe, oil_ml=oil, sweetener_grams=sweet / servings)
    reasons = found['hard']
    names = [_norm(i.get('name', '')) for i in recipe.get('ingredients') or []]
    meat = sorted({w for n in names for w in meat_words(n)})
    if meat:
        reasons.append('not vegetarian: ' + ', '.join(meat))
    figures = nutrition.estimate(root, recipe, detail=True)
    problems = recipe_standards.problems(figures)
    # A figure the table cannot work out (amounts in bowls or packets, a food not in the table) is a gap in our data, not a
    # recipe below the bar: QT Manager judges it (30 Oct 2026: the approved pumpkin rice bowl was held for "1 bowl" amounts).
    unmeasured = [p for p in problems if 'could not be measured' in p]
    reasons += ['QuinTaste version: ' + p for p in problems if p not in unmeasured]
    if not problems:
        recipe['_content'] = recipe_standards.summary(figures)
    return {'hard': reasons, 'concerns': found['concerns'] + ['QuinTaste version: ' + p for p in unmeasured]}


def shortlist_prompt(baseline, counts, rejected, creators=(), rules=''):
    return ('Current UTC: ' + dt.datetime.now(dt.timezone.utc).isoformat() + '. Task: SHORTLIST up to 8 recipe pages for QuinTaste. '
            'QuinTaste (吾譜) is a vegetarian app built on five grains, five nutrients and five colours: we want proper, hearty, '
            'colourful savoury dishes a Singapore home cook would happily eat as a meal, with a real protein (tofu, tempeh, beancurd '
            'skin, beans, lentils, eggs, mushrooms, gluten) and plenty of vegetables. Good fits: Chinese home and Buddhist vegetarian '
            '(斋菜/素食) mains, tofu and vegetable stir-fries, braises, noodle and rice meals, hearty soups and savoury porridge. '
            'Every page must be naturally free of garlic, onion, shallot, spring onion, leek, chive and asafoetida (as written by the '
            'author, not adapted), vegetarian or vegan, ready in 30 minutes or less, at most 12 ingredients and 8 steps, with everyday '
            'ingredients sold in Singapore supermarkets or wet markets, measured quantities and a named author. ' + rules + ' '
            'A star rating is welcome but no longer required. Every recipe must make a nutritious, colourful dish from its own '
            'ingredient list: a source of at least one vitamin and one mineral, of protein or fibre, moderate salt, and at least three '
            'of the five colours green, red, yellow, black and white. Language is NOT a limit: Chinese pages count '
            'too (Chinese home, Buddhist vegetarian, Cantonese, Teochew, Hokkien, Taiwanese), as long as the page names its author. '
            'Many Chinese apps (Xiachufang, Douguo) block automated reading; skip blocked pages. Start with these well-known creators '
            '(they rank first, but any named author or organisation is allowed): ' + ', '.join(f'{name} ({site})' for site, name in creators) + '. '
            'Favour the least represented categories: ' + json.dumps(counts) + '. '
            'Do not repeat existing recipes: ' + json.dumps([r['name'] for r in baseline.get('recipeNames', [])][-150:]) +
            '. Previously rejected pages (skip): ' + json.dumps(rejected[-40:]) + '. Use web_search and open pages to confirm they exist. '
            'Extracted page text usually hides the star rating, time and ingredient data; the coordinator reads that data from each page '
            'itself and rejects pages that miss the bar. So do NOT filter candidates on ratings you cannot see: return 6 to 8 promising '
            'pages that look allium-free, quick, hearty and colourful, from at least three different websites (creators own sites, '
            'temple and society kitchens, English and Chinese recipe sites), never all from one site. An empty list is only right '
            'when you found no plausible page at all. '
            'Return ONLY JSON {"role":"qt-cooker","candidates":[{"url":"https recipe page","name":"","category":"one of the categories you may source"}],'
            '"notes":""}. No Google Maps.')


def _usable(result, skip, blocked):
    """The model's candidate pages that are new and not on a blocked host, each page once."""
    out, seen = [], set()
    for c in result.get('candidates', []):
        if not (isinstance(c, dict) and isinstance(c.get('url'), str)):
            continue
        key = page_key(c['url'])
        if key in skip or key in seen or key.split('/')[0] in blocked:
            continue
        seen.add(key)
        out.append(c)
    return out


def shortlist(root, baseline, folder, policy, live=None, drafted=(), creators=None, blocked=()):
    """Stage 1: Cooker names candidate pages; the coordinator keeps those that pass, best first. drafted: page keys Cooker has
    already written up (published or held). They are skipped, so a held page is not drafted again every round; a held recipe
    comes back only through its retry (21 Oct 2026: the same two pages were redrafted in 7 of 8 rounds). creators: (site, name)
    pairs from the creator library, best first, replacing the trusted list; blocked: hosts staff blocked, never shortlisted."""
    import recipe_charter
    from workflow import run_model
    rules = recipe_charter.load(root)
    counts = {c: 0 for c in rules['allowedCategories']}
    skip = set(drafted)
    blocked = {h.removeprefix('www.') for h in blocked}
    try:
        import publisher
        for row in (live or publisher.request('GET', '/control/state'))['records']:
            if row['kind'] == 'recipe':
                for category in row['data'].get('categories', []):
                    if category in counts:
                        counts[category] += 1
                skip.update(page_key(u) for u in (row['data'].get('provenance') or {}).get('sources', []) if isinstance(u, str))
    except Exception:
        pass  # rotation is a preference; the shortlist still works without counts
    log = root / 'state/recipe-shortlist.json'
    history = _read(log, {'rejected': []})
    prompt = shortlist_prompt(baseline, counts, history['rejected'] + sorted(skip)[-40:], creators or trusted(root).items(),
                              recipe_charter.prompt_rules(root))
    seconds = min(600, policy.get('workerSeconds', 600))
    result, _ = run_model('qt-cooker', prompt, folder, policy, seconds=seconds)
    rejected = {page_key(u) for u in history['rejected']}  # pages that already failed the bar are not checked again
    library_sites = {site for site, _ in creators or ()}

    def check(candidates):
        checked = [dict(assess(root, c['url']), category=c.get('category')) for c in candidates]
        for c in checked:  # categories the owner no longer wants (recipe_charter.json); the gate checks Cooker's own category too
            wrong = recipe_charter.category_problems(root, c.get('category'))
            if wrong:
                c.update(passes=False, reasons=c.get('reasons', []) + wrong)
        for c in checked:  # library creators rank first like the trusted list does; never a substitute for the bar
            if not c.get('trusted') and c.get('site') in library_sites and 'score' in c:
                c.update(score=round(c['score'] + TRUSTED_BOOST, 3), trusted=True)
        return checked

    checked = check(_usable(result, skip | rejected, blocked)[:8])
    need = int(policy.get('maxRecipesPerCycle', 2))
    deadline = policy.get('_researchDeadline')
    if sum(c['passes'] for c in checked) < need and (deadline is None or time.time() + seconds < deadline):
        # 30 Oct 2026: one round's search returned 2 pages from one site, the next 5 pages that all failed. When too few pages
        # pass, look once more, elsewhere, in half the time so a round stays short; the pages already tried are listed so none
        # comes back.
        tried = [c['url'] for c in result.get('candidates', []) if isinstance(c, dict) and isinstance(c.get('url'), str)]
        more, _ = run_model('qt-cooker', prompt + ' Too few of the pages you found met the bar. Skip these (tried already): '
                            + (', '.join(tried) or 'none') + '. Search again on other websites and return new pages only.',
                            folder.with_name(folder.name + '-more'), policy, seconds=seconds // 2)
        checked += check(_usable(more, skip | rejected | {page_key(c['url']) for c in checked}, blocked)[:8])
    passed = sorted((c for c in checked if c['passes']), key=lambda c: -c['score'])
    history['rejected'] = (history['rejected'] + [c['url'] for c in checked if not c['passes']])[-200:]
    history['last'] = {'at': dt.datetime.now(dt.timezone.utc).isoformat(), 'checked': len(checked), 'passed': len(passed),
                       'reasons': [{'url': c['url'], 'reasons': c['reasons']} for c in checked if not c['passes']],
                       'concerns': [{'url': c['url'], 'concerns': c.get('concerns', [])} for c in checked if c['passes'] and c.get('concerns')]}
    _write(log, history)
    return {'passed': passed, 'checked': checked}


def audit_published(root, live=None, limit=4):
    """Check bot recipes already live against the bar once each; failures go to the owner (Telegram)."""
    import publisher
    log = root / 'state/recipe-audit.json'
    done = _read(log, {})
    todo = [r for r in (live or publisher.request('GET', '/control/state'))['records'] if r['kind'] == 'recipe' and r['id'] not in done][:limit]
    for row in todo:
        data = row['data']
        probe = {'status': 'proposed', 'recipe': {'ingredients': data.get('ingredients', []), 'steps': data.get('steps', []), 'minutes': data.get('minutes'),
                                                   'servings': data.get('servings'), 'name': data.get('name', ''),
                                                   'category': (data.get('categories') or [None])[0]},
                 'sources': [{'url': u} for u in data.get('provenance', {}).get('sources', [])]}
        gate(root, probe)
        if 'could not be read' in probe.get('notes', '') or 'unreadable' in probe.get('notes', ''):
            continue  # a network or page glitch is not a verdict; try again next round
        done[row['id']] = {'name': data.get('name', row['id']), 'passes': probe['status'] == 'proposed',
                           'reasons': probe.get('notes', '').replace('Quality bar: ', ''), 'at': dt.datetime.now(dt.timezone.utc).isoformat()}
    if todo:
        _write(log, done)
    return len(todo)
