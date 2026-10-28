"""QT Cooker's rulebook (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md §3): hard rules from recipe_charter.json, learned from
the recipes the owner deleted, checked on source pages (recipe_quality._assess) and on Cooker's own version (recipe_quality.gate).
The five-pungent rule stays in recipe_policy.py; meat and seafood words stay in recipe_quality.py; this adds what they miss."""
import json
import re
import unicodedata
from pathlib import Path

_cache = {}


def team_root(root, name):
    """The team folder holding `name`: `root`, or this module's folder when `root` has no copy (test folders). In production both
    are /opt/data/qt-team, so the content checks and the rulebook always read the same deployed files."""
    return Path(root) if (Path(root) / name).is_file() else Path(__file__).parent


def load(root):
    path = team_root(root, 'recipe_charter.json') / 'recipe_charter.json'
    stamp = path.stat().st_mtime_ns
    if _cache.get('stamp') != (str(path), stamp):
        data = json.loads(path.read_text(encoding='utf-8'))
        data['re'] = {k: re.compile(v, re.I) for k, v in data['patterns'].items()}
        _cache.update(stamp=(str(path), stamp), data=data)
    return _cache['data']


def _norm(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(text or '')).casefold()).strip()


def _animal(rules, lines):
    """Animal ingredients the meat check misses (rennet, dashi, fish sauce...), unless the line qualifies them ('vegetarian oyster sauce')."""
    found = []
    for line in lines:
        text = _norm(line)
        for match in rules['re']['animal'].finditer(text):
            if not rules['re']['animalQualifier'].search(text[:match.start()]):
                found.append(match.group(0))
    return sorted(set(found))


def category_problems(root, category):
    rules = load(root)
    return [f'category {category} is not sourced (owner deleted every {category} recipe)'] if category and category not in rules['allowedCategories'] else []


def _dish(rules, name, category):
    reasons = []
    title = _norm(name)
    if category and category not in rules['allowedCategories']:
        reasons.append(f'category {category} is not sourced (owner deleted every {category} recipe)')
    if rules['re']['drink'].search(title):
        reasons.append('a drink (owner deleted every drink as not appetising)')
    if rules['re']['dessert'].search(title) and not rules['re']['savouryCake'].search(title):
        reasons.append('a dessert, sweet kueh, pancake or custard (owner deleted these as not appetising)')
    return reasons


def source_problems(root, name, lines, method='', category=None):
    """Reasons a source recipe page breaks the rulebook; [] when it does not. lines: its ingredient lines; method: its steps as text."""
    rules = load(root)
    reasons = _dish(rules, name, category)
    text = ' '.join([_norm(name), *(_norm(x) for x in lines), _norm(method)])
    if rules['re']['deepFry'].search(text):
        reasons.append('deep-fried or battered (owner: no fry)')
    unfamiliar = sorted({m.group(0) for line in lines for m in [rules['re']['unfamiliar'].search(_norm(line))] if m})
    if unfamiliar:
        reasons.append('unfamiliar ingredient: ' + ', '.join(unfamiliar))
    animal = _animal(rules, lines)
    if animal:
        reasons.append('animal ingredient: ' + ', '.join(animal))
    return reasons


def recipe_problems(root, recipe, oil_ml=None, sweetener_grams=None):
    """Reasons Cooker's version breaks the rulebook; [] when it does not. oil_ml / sweetener_grams: total frying oil in ml and
    sweetener grams per serving, worked out by the caller from the nutrition table (None when unknown)."""
    rules = load(root)
    ingredients, steps = recipe.get('ingredients') or [], recipe.get('steps') or []
    names = [str(i.get('name', '')) for i in ingredients]
    method = ' '.join(str(s.get('instruction', '')) for s in steps)
    reasons = source_problems(root, recipe.get('name', ''), names, method, recipe.get('category'))
    unclear = [n for n in names if rules['re']['unclear'].search(_norm(n))]
    if unclear:
        reasons.append('unclear ingredient (one named food per line, no generic stock): ' + '; '.join(unclear[:4]))
    if len(steps) < rules['minSteps']:
        reasons.append(f'only {len(steps)} steps (owner: missing steps; write out at least {rules["minSteps"]})')
    used = {i for s in steps for i in s.get('ingredientIds', [])}
    unused = [str(i.get('name', '')) for i in ingredients if i.get('id') not in used]
    if unused:
        reasons.append('ingredients no step uses (missing steps): ' + '; '.join(unused[:4]))
    if oil_ml is not None and oil_ml > rules['maxFryingOilMl']:
        reasons.append(f'{oil_ml:.0f} ml of oil (frying; owner: no fry)')
    if sweetener_grams is not None and sweetener_grams > rules['maxSweetenerGramsPerServing']:
        reasons.append(f'{sweetener_grams:.0f} g of sweetener a serving (a sweet dish; owner deleted these)')
    return reasons


def prompt_rules(root):
    """The rulebook for the shortlist and writing prompts: allowed categories, the lessons and the owner's deleted and kept dishes."""
    rules = load(root)
    deleted = '; '.join(f"{d['name']} ({d['reason']})" for d in rules['ownerDeleted'])
    return ('OWNER RULEBOOK (' + rules['version'] + '). Categories you may source: ' + ', '.join(rules['allowedCategories']) + '. '
            + ' '.join(rules['lessons']) + ' The owner DELETED these recipes, never propose them or anything like them: ' + deleted
            + '. The owner KEPT these, aim for dishes like them: ' + ', '.join(rules['ownerKept']) + '.')
