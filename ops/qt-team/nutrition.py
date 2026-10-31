"""Optional recipe nutrition (owner, 18 Oct 2026; table v2, 19 Oct 2026). Never part of the recipe bar: a good
recipe without reliable figures is still published, just without a nutrition section.

1. The source page's own schema.org NutritionInformation (read from the page data, never from the model).
2. Otherwise an estimate from nutrition_sg.json (v2): reviewed ingredient keys with USDA SR Legacy figures per
   100 g and gram weights per household unit, generated from the app repo (scripts/recipe-nutrition.ts --bot).
   Each ingredient line is matched to the key whose alias matches the longest span of its name, then weighed from
   its amount and unit; the Cooker's own gram estimate is only a fallback for units the table cannot weigh.
   "To taste" lines are skipped (the app says so); water, pandan, tea leaves and curry leaves count as matched with
   no nutrients. An estimate is kept only when every measured line is matched and weighed (coverage 1.0, or at
   least 0.9 when an unmatched line carries the Cooker's weight); a nutrient is left out when more than 10% of
   the nutritive weight comes from USDA rows that lack it. Figures are the raw inputs per serving, as recipe
   sites report them; cooking losses are not modelled.
3. Table v3 (28 Oct 2026, scripts/nutrition/build_bot_v3.py) adds vitamins and minerals per food (USDA SR Legacy, Taiwan FDA)
   and each food's colour and staple grain. estimate(detail=True) returns them for the content check (recipe_standards.py);
   only the seven published fields ever reach the app.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

FIELDS = ('kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium')  # the app's published figures
MICRO = ('vitA', 'vitC', 'vitE', 'folate', 'b12', 'iron', 'calcium', 'zinc', 'magnesium', 'potassium')  # checks only, never published
MIN_COLOUR_GRAMS = 5  # per serving: a sprinkle is a garnish, not a colour on the plate
NAMED_COLOUR = re.compile(r'\b(red|green|yellow|black|white|purple)\b', re.I)
PAGE_FIELDS = {'calories': 'kcal', 'proteinContent': 'protein', 'fatContent': 'fat', 'carbohydrateContent': 'carbs',
               'fiberContent': 'fibre', 'sugarContent': 'sugar', 'sodiumContent': 'sodium'}
MIN_COVERAGE = 0.9
MAX_MISSING_SHARE = 0.1
MAX_GRAMS = 3000  # per ingredient line; larger values are treated as a bad conversion
# An ingredient the table does not know is left out of the totals. A pinch of spice does not matter, but 160 g of pasta or 35 g
# of cashews made two published recipes far too low in calories (31 Oct 2026), so one this heavy means no estimate at all.
MAX_UNMATCHED_GRAMS = 15
COUNT_UNITS = {'each', 'egg', 'eggs', 'leaves', 'leaf', 'cloves', 'clove', 'slices', 'slice', 'cubes', 'cube', 'sprig', 'sprigs',
               'inch', 'handful', 'handfuls', 'pods', 'pod', 'sticks', 'stick'}
GRAM_UNITS = {'g', 'gram', 'grams'}
WEIGHT_UNITS = {'kg': 1000.0, 'lb': 453.6, 'lbs': 453.6, 'pound': 453.6, 'pounds': 453.6, 'oz': 28.35, 'ounce': 28.35, 'ounces': 28.35}
SMALL_UNITS = {'pinch': 0.31, 'pinches': 0.31, 'dash': 0.62, 'dashes': 0.62}  # ml
SIZE_WORDS = {'large', 'medium', 'small', 'whole', 'ear', 'ears', 'head', 'heads', 'bulb', 'fruit'}


def _number(text):
    match = re.search(r'\d+(?:[.,]\d+)?', str(text or ''))
    return float(match.group(0).replace(',', '.')) if match else None


def _sane(per):
    return (per.get('kcal') is not None and 0 < per['kcal'] <= 3000 and sum(per.get(k) is not None for k in ('protein', 'fat', 'carbs')) >= 2
            and all(v is None or 0 <= v <= (20000 if k == 'sodium' else 3000) for k, v in per.items()))


def page_yield(page_recipe):
    """The page's serving count, e.g. ['4', '4 people'] -> 4; None when it does not say."""
    value = page_recipe.get('recipeYield') if isinstance(page_recipe, dict) else None
    for item in value if isinstance(value, list) else [value]:
        number = _number(item)
        if number:
            return number
    return None


def from_page(page_recipe, site, servings=None):
    """Per-serving figures the recipe page itself publishes, or None. They only describe our version when it
    serves the same number of people as the original; otherwise the caller falls back to an estimate."""
    if servings is not None and page_yield(page_recipe) not in (None, servings):
        return None
    info = page_recipe.get('nutrition') if isinstance(page_recipe, dict) else None
    if isinstance(info, list):
        info = info[0] if info else None
    if not isinstance(info, dict):
        return None
    per = {}
    for key, field in PAGE_FIELDS.items():
        value = _number(info.get(key))
        if value is not None and field == 'sodium' and re.search(r'(?<![m])\bg\b', str(info.get(key))):
            value *= 1000  # grams to mg
        per[field] = value
    if not _sane(per):
        return None
    return {'basis': 'source', 'site': site[:80], 'perServing': {k: round(v, 1) for k, v in per.items() if v is not None},
            'checkedAt': dt.date.today().isoformat()}


def table(root):
    """The v2 table: units in ml and foods with compiled aliases. Cached per process; the file changes only on deploy."""
    path = Path(root) / 'nutrition_sg.json'
    cached = table.__dict__.get('cache')
    stamp = path.stat().st_mtime_ns
    if cached and cached[0] == (str(path), stamp):
        return cached[1]
    data = json.loads(path.read_text(encoding='utf-8'))
    if data.get('version') not in (2, 3):
        raise ValueError('nutrition_sg.json must be the v2 or v3 table')
    foods = []
    for key, food in data['foods'].items():
        patterns = [re.compile(pattern, re.IGNORECASE) for pattern in food.get('match', [])]
        foods.append((key, dict(food), patterns))
    loaded = {'units': data['units'], 'foods': foods}
    table.cache = ((str(path), stamp), loaded)
    return loaded


def _match(name, loaded):
    """The food whose alias matches the longest span of the ingredient name, or None."""
    text = str(name or '')
    best = None
    for key, food, patterns in loaded['foods']:
        for pattern in patterns:
            hit = pattern.search(text)
            if hit and (best is None or len(hit.group(0)) > best[2]):
                best = (key, food, len(hit.group(0)))
    return (best[0], best[1]) if best else None


def _unit(unit):
    """'US cup' -> 'cup', '1 tablespoon, minced' -> 'tablespoon', 'large' -> 'each': the unit word recipe pages and Cooker write."""
    text = re.sub(r'\s+', ' ', str(unit or '').strip().lower()).split(',')[0].strip()
    text = re.sub(r'^(?:us|u\.s\.|metric)\s+', '', re.sub(r'^[\d./\s]+', '', text))
    if text in ('inch piece', 'inch pieces', 'inches'):
        return 'inch'
    words = text.split(' ') if text else []
    if words and words[0] in SIZE_WORDS and len(words) > 1 and words[1] not in ('piece', 'pieces'):
        words = words[1:]  # 'large handful' -> 'handful', 'small bunch' -> 'bunch' (not weighable, so the Cooker's grams)
    if not words or words[0] in ('piece', 'pieces') or words[0] in SIZE_WORDS:
        return 'each'
    return words[0]


def _grams(ingredient, food, loaded):
    """Grams for the line from the table's unit weights; the Cooker's own estimate only when the table cannot weigh it."""
    amount, unit = ingredient.get('amount'), _unit(ingredient.get('unit'))
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount <= 0:
        return None
    grams = None
    if unit in GRAM_UNITS:
        grams = float(amount)
    elif unit in WEIGHT_UNITS:
        grams = amount * WEIGHT_UNITS[unit]
    elif food is not None and unit in SMALL_UNITS:
        grams = amount * SMALL_UNITS[unit] * float(food.get('gPerMl') or 1)
    elif food is not None and unit in loaded['units']:
        grams = amount * loaded['units'][unit] * float(food.get('gPerMl') or 1)
    elif food is not None and unit in COUNT_UNITS:
        per = (food.get('per') or {}).get(unit)
        if per is None and unit in ('each', 'egg', 'eggs'):
            per = food.get('each')
        if per is None and not food.get('per'):
            per = food.get('each')
        grams = None if per is None else amount * float(per)
    if grams is None:
        model = ingredient.get('grams')
        if not isinstance(model, bool) and isinstance(model, (int, float)) and 0 < model <= MAX_GRAMS:
            grams = float(model)
    return grams if grams is not None and 0 <= grams <= MAX_GRAMS else None


def _colour(food, name):
    """The plate colour a visible food adds: the ingredient's own colour word wins ('red capsicum'); purple counts as black."""
    if not food.get('colour'):
        return None
    word = NAMED_COLOUR.search(str(name or ''))
    return {'purple': 'black'}.get(word.group(1).lower(), word.group(1).lower()) if word else food['colour']


def estimate(root, recipe, detail=False, strict=False):
    """Estimate per-serving figures from the ingredient lines, or None when they cannot be weighed reliably. detail=True also
    returns vitamins and minerals per serving ('micro', only those known for at least 90% of the weight), 'colours' and 'staples'.
    strict=True (figures that are published): an unknown ingredient of MAX_UNMATCHED_GRAMS or more means no estimate. The quality
    bar's own measurement (recipe_quality) keeps the 90% coverage rule alone, so it qualifies the same pages as before."""
    servings = recipe.get('servings')
    if not isinstance(servings, (int, float)) or isinstance(servings, bool) or servings <= 0:
        return None
    loaded = table(root)
    fields = FIELDS + MICRO
    totals = {k: 0.0 for k in fields}
    missing = {k: 0.0 for k in fields}
    colours, staples = set(), set()
    nutritive = matched = 0.0
    for ingredient in recipe.get('ingredients') or []:
        if ingredient.get('amount') is None:
            continue  # "to taste": no weight to count; the app notes it
        hit = _match(ingredient.get('name', ''), loaded)
        food = hit[1] if hit else None
        if food is not None and food.get('negligible'):
            continue  # water, pandan, tea leaves, curry leaves: matched, nothing to add
        grams = _grams(ingredient, food, loaded)
        if grams is None:
            return None  # an unweighed measured ingredient makes any total unreliable
        nutritive += grams
        if food is None or not food.get('per100g'):
            if strict and grams >= MAX_UNMATCHED_GRAMS:
                return None  # a real food the table does not know: the totals would be wrong, not just incomplete
            continue  # a pinch the table does not know: counts against coverage only
        matched += grams
        if grams / servings >= MIN_COLOUR_GRAMS:
            colour = _colour(food, ingredient.get('name'))
            colours.update([colour] if colour else [])
            staples.update([food['staple']] if food.get('staple') else [])
        for k in fields:
            value = food['per100g'].get(k)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                totals[k] += value * grams / 100
            else:
                missing[k] += grams
    if not nutritive or matched / nutritive < MIN_COVERAGE:
        return None
    omitted = {k for k in fields if missing[k] / nutritive > MAX_MISSING_SHARE}
    if 'kcal' in omitted:
        return None
    per = {k: round(totals[k] / servings, 1) for k in FIELDS if k not in omitted}
    per['kcal'] = round(per['kcal'])
    if not _sane(per):
        return None
    found = {'basis': 'estimate', 'perServing': per, 'coverage': round(matched / nutritive, 2), 'checkedAt': dt.date.today().isoformat()}
    if detail:
        found['micro'] = {k: round(totals[k] / servings, 2) for k in MICRO if k not in omitted}
        found['colours'], found['staples'] = sorted(colours), sorted(staples)
    return found


def attach(root, recipe, page_recipe, site):
    """Set recipe['nutrition'] when reliable figures exist; otherwise leave the recipe without one."""
    found = from_page(page_recipe, site, recipe.get('servings')) or estimate(root, recipe, strict=True)
    if found:
        recipe['nutrition'] = found
    else:
        recipe.pop('nutrition', None)
    return found
