"""Recipes on pages without schema.org Recipe data (owner, 28 Oct 2026): temple, society and hospital kitchens publish plain
"Ingredients: ... Steps: ..." pages, which QuinTaste most wants. This reads such a page's own text into the same shape as
schema.org Recipe (name, recipeIngredient, recipeInstructions, author, recipeYield), so the coordinator still checks the page's
own words, never the model's description. Returns None unless the page has a clear ingredient list and method."""
import html
import re

INGREDIENTS = re.compile(r'^(ingredients?|mainingredients?|seasonings?|sauce|condiments?|材料|食材|用料|配料|主料|輔料|辅料|調味料|调味料|醬汁|酱汁)$', re.I)
FIRST = re.compile(r'^(ingredients?|mainingredients?|材料|食材|用料|主料)$', re.I)
METHOD = re.compile(r'^(steps?|method|directions?|instructions?|preparation|howto(?:make|cook)|做法|作法|步驟|步骤|烹調方法|烹调方法|製作方法|制作方法)$', re.I)
STOP = re.compile(r'^(tips?|notes?|nutrition|servingsuggestions?|leaveareply.*|morerecipes|related.*|latestrecipes|小撇步|小叮嚀|小提示|營養.*|营养.*)$', re.I)
CLAUSE = re.compile(r'^(mix|add|stir|combine|set aside|then|and)\b', re.I)
YIELD = re.compile(r'(?:serves|servings?|yield|makes|份量|分量)\s*[:：]?\s*(\d{1,2})|(\d{1,2})\s*(?:servings|portions|人份|份)', re.I)
MAX_INGREDIENTS, MAX_STEPS = 40, 30


def _meta(page, name):
    match = re.search(r'<meta[^>]+(?:property|name)=["\']' + re.escape(name) + r'["\'][^>]*content=["\']([^"\']+)', page, re.I) or \
        re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + re.escape(name) + r'["\']', page, re.I)
    return html.unescape(match.group(1)).strip() if match else ''


def _lines(page):
    body = re.sub(r'(?is)<(script|style|nav|footer|header|form|aside)[^>]*>.*?</\1>', ' ', page)
    body = re.sub(r'(?i)<(br|/p|/li|/h[1-6]|/div|/tr|li|h[1-6]|p|tr)[^>]*>', '\n', body)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
    return [line for line in (re.sub(r'\s+', ' ', raw).strip() for raw in text.split('\n')) if line]


def _heading(line):
    """('ingredients', rest) for 'I ngredients : 150g...' or 'Steps:'; (None, line) for an ordinary line. Spaces inside the label
    are dropped, since some sites style the first letter apart ('I ngredients', 'Seasoning s')."""
    match = re.match(r'^([^:：]{1,24})[:：]\s*(.*)$', line)
    label, rest = (match.group(1), match.group(2)) if match else (line, '') if len(line) <= 24 else (None, line)
    if label is None:
        return None, line
    key = re.sub(r'\s+', '', label).casefold()
    return (key, rest) if INGREDIENTS.match(key) or METHOD.match(key) or STOP.match(key) else (None, line)


def _items(text):
    """'700g noodles, 150g red pepper' -> two lines; one long sentence stays whole."""
    parts = re.split(r'\s*[,，、;；]\s*', text) if re.search(r'[,，、;；]', text) else [text]
    return [p.strip(' .。') for p in parts if p.strip(' .。') and not CLAUSE.match(p.strip()) and len(p) <= 120]


def plain_recipe(page):
    """The page's own recipe as schema.org-shaped data, or None when it has no clear ingredient list and method."""
    lines = _lines(page)
    start = next((n for n, line in enumerate(lines) if FIRST.match(_heading(line)[0] or '')), None)
    if start is None:
        return None
    ingredients, steps, in_method = [], [], False
    for line in lines[start:start + 80]:
        key, rest = _heading(line)
        if key and (STOP.match(key) or (in_method and INGREDIENTS.match(key))):
            break  # the recipe ended (tips, comments, or the next recipe on the page)
        if key and METHOD.match(key):
            in_method = True
            steps += [rest] if rest else []
        elif key and INGREDIENTS.match(key):
            ingredients += _items(rest) if rest else []
        elif in_method:
            steps.append(re.sub(r'^\d+\s*[.、)]\s*', '', line))
        else:
            ingredients += _items(line)
    steps = [s for s in steps if len(s) >= 4][:MAX_STEPS]
    if len(ingredients) < 3 or len(steps) < 2:
        return None
    heading = re.search(r'(?is)<h1[^>]*>(.*?)</h1>', page) or re.search(r'(?is)<title>(.*?)</title>', page)
    title = _meta(page, 'og:title') or (re.sub(r'<[^>]+>', '', heading.group(1)) if heading else '')
    author = _meta(page, 'author') or _meta(page, 'og:site_name')
    servings = YIELD.search(' '.join(lines[:start + 80]))
    return {'@type': 'Recipe', 'name': html.unescape(title).strip()[:160], 'recipeIngredient': ingredients[:MAX_INGREDIENTS],
            'recipeInstructions': steps, 'author': {'name': author[:160]} if author else None,
            'recipeYield': (servings.group(1) or servings.group(2)) if servings else None, '_plain': True}
