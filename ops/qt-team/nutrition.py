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
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

FIELDS = ('kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium')
PAGE_FIELDS = {'calories': 'kcal', 'proteinContent': 'protein', 'fatContent': 'fat', 'carbohydrateContent': 'carbs',
               'fiberContent': 'fibre', 'sugarContent': 'sugar', 'sodiumContent': 'sodium'}
MIN_COVERAGE = 0.9
MAX_MISSING_SHARE = 0.1
MAX_GRAMS = 3000  # per ingredient line; larger values are treated as a bad conversion
COUNT_UNITS = {'each', 'egg', 'eggs', 'leaves', 'leaf', 'cloves', 'clove', 'slices', 'slice', 'cubes', 'cube', 'sprig', 'sprigs',
               'inch', 'handful', 'handfuls', 'pods', 'pod', 'sticks', 'stick'}
GRAM_UNITS = {'g', 'gram', 'grams'}


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
    if data.get('version') != 2:
        raise ValueError('nutrition_sg.json must be the v2 table')
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
    text = re.sub(r'\s+', ' ', str(unit or '').strip().lower())
    if text in ('inch piece', 'inch pieces', 'inches'):
        return 'inch'
    if text in ('', 'whole', 'piece', 'pieces'):
        return 'each'
    return text


def _grams(ingredient, food, loaded):
    """Grams for the line from the table's unit weights; the Cooker's own estimate only when the table cannot weigh it."""
    amount, unit = ingredient.get('amount'), _unit(ingredient.get('unit'))
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount <= 0:
        return None
    grams = None
    if unit in GRAM_UNITS:
        grams = float(amount)
    elif unit == 'kg':
        grams = amount * 1000.0
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


def estimate(root, recipe):
    """Estimate per-serving figures from the ingredient lines, or None when they cannot be weighed reliably."""
    servings = recipe.get('servings')
    if not isinstance(servings, (int, float)) or isinstance(servings, bool) or servings <= 0:
        return None
    loaded = table(root)
    totals = {k: 0.0 for k in FIELDS}
    missing = {k: 0.0 for k in FIELDS}
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
            continue  # unmatched but weighed by the Cooker: counts against coverage only
        matched += grams
        for k in FIELDS:
            value = food['per100g'].get(k)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                totals[k] += value * grams / 100
            else:
                missing[k] += grams
    if not nutritive or matched / nutritive < MIN_COVERAGE:
        return None
    omitted = {k for k in FIELDS if missing[k] / nutritive > MAX_MISSING_SHARE}
    if 'kcal' in omitted:
        return None
    per = {k: round(v / servings, 1) for k, v in totals.items() if k not in omitted}
    per['kcal'] = round(per['kcal'])
    if not _sane(per):
        return None
    return {'basis': 'estimate', 'perServing': per, 'coverage': round(matched / nutritive, 2), 'checkedAt': dt.date.today().isoformat()}


def attach(root, recipe, page_recipe, site):
    """Set recipe['nutrition'] when reliable figures exist; otherwise leave the recipe without one."""
    found = from_page(page_recipe, site, recipe.get('servings')) or estimate(root, recipe)
    if found:
        recipe['nutrition'] = found
    else:
        recipe.pop('nutrition', None)
    return found
