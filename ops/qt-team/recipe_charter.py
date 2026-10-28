"""QT Cooker's rulebook (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md §3), from recipe_charter.json, learned from the recipes
the owner deleted. Two kinds of finding (owner, 28 Oct 2026: "be smart, not rigid"):
- hard: the code blocks it, because no judgement can make it right (an animal ingredient, a category the owner stopped, deep-frying
  or an ingredient no step uses in Cooker's own version);
- concerns: taste and clarity questions the owner's lessons describe (a drink- or dessert-sounding name, an unfamiliar or unclear
  ingredient, few steps, a sweet dish). They never reject a page; Cooker sees them when it writes, and QT Manager judges them
  against the lessons and the owner's deleted and kept dishes before anything is published.
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
    """Animal ingredients the meat check misses (rennet, dashi...), unless the line qualifies them ('vegetarian oyster sauce')."""
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


def _name_concerns(rules, name):
    """A drink- or dessert-sounding name is a question, not a verdict: 'Kongguksu, cold soy milk noodles' is a noodle dish."""
    title = _norm(name)
    concerns = []
    dish = rules['re']['dishWord'].search(title)
    if rules['re']['drink'].search(title) and not dish:
        concerns.append('name sounds like a drink (owner deleted every drink)')
    if rules['re']['dessert'].search(title) and not rules['re']['savouryCake'].search(title) and not dish:
        concerns.append('name sounds like a dessert, sweet kueh, pancake or custard (owner deleted these)')
    return concerns


def source_findings(root, name, lines, method=''):
    """{'hard': [...], 'concerns': [...]} for a source recipe page. lines: its ingredient lines; method: its steps as text."""
    rules = load(root)
    hard, concerns = [], _name_concerns(rules, name)
    animal = _animal(rules, lines)
    if animal:
        hard.append('animal ingredient: ' + ', '.join(animal))
    if rules['re']['deepFry'].search(' '.join([_norm(name), *(_norm(x) for x in lines), _norm(method)])):
        concerns.append('the page deep-fries or batters; the QuinTaste version must not (owner: no fry)')
    unfamiliar = sorted({m.group(0) for line in lines for m in [rules['re']['unfamiliar'].search(_norm(line))] if m})
    if unfamiliar:
        concerns.append('unfamiliar ingredient: ' + ', '.join(unfamiliar))
    return {'hard': hard, 'concerns': concerns}


def recipe_findings(root, recipe, oil_ml=None, sweetener_grams=None):
    """{'hard': [...], 'concerns': [...]} for Cooker's own version. oil_ml / sweetener_grams: total oil in ml and sweetener grams per
    serving, worked out by the caller from the nutrition table (None when unknown)."""
    rules = load(root)
    ingredients, steps = recipe.get('ingredients') or [], recipe.get('steps') or []
    names = [str(i.get('name', '')) for i in ingredients]
    method = ' '.join(str(s.get('instruction', '')) for s in steps)
    found = source_findings(root, recipe.get('name', ''), names, method)
    hard, concerns = found['hard'] + category_problems(root, recipe.get('category')), found['concerns']
    concerns = [c for c in concerns if not c.startswith('the page deep-fries')]
    if rules['re']['deepFry'].search(_norm(method)) or (oil_ml is not None and oil_ml > rules['maxFryingOilMl']):
        hard.append('deep-fried or battered' + (f' ({oil_ml:.0f} ml of oil)' if oil_ml and oil_ml > rules['maxFryingOilMl'] else '') + ' (owner: no fry)')
    generic = [n for n in names if rules['re']['genericStock'].search(_norm(n))]
    if generic:
        hard.append('generic stock or seasoning (the app refuses it; name what goes in): ' + '; '.join(generic[:3]))
    unclear = [n for n in names if n not in generic and rules['re']['unclear'].search(_norm(n))]
    if unclear:
        concerns.append('ingredient lines that may confuse a cook (one named food per line): ' + '; '.join(unclear[:4]))
    used = {i for s in steps for i in s.get('ingredientIds', [])}
    unused = [str(i.get('name', '')) for i in ingredients if i.get('id') not in used]
    if unused:
        hard.append('ingredients no step uses (missing steps): ' + '; '.join(unused[:4]))
    if len(steps) < rules['minSteps']:
        concerns.append(f'only {len(steps)} steps; check nothing is missing (owner deleted a recipe for missing steps)')
    if sweetener_grams is not None and sweetener_grams > rules['maxSweetenerGramsPerServing']:
        concerns.append(f'{sweetener_grams:.0f} g of sweetener a serving: is it a sweet dish? (owner deleted sweet dishes)')
    return {'hard': hard, 'concerns': concerns}


def prompt_rules(root):
    """The rulebook for the shortlist and writing prompts: allowed categories, the lessons and the owner's deleted and kept dishes."""
    rules = load(root)
    deleted = '; '.join(f"{d['name']} ({d['reason']})" for d in rules['ownerDeleted'])
    return ('OWNER RULEBOOK (' + rules['version'] + '). Categories you may source: ' + ', '.join(rules['allowedCategories']) + '. '
            + ' '.join(rules['lessons']) + ' Use your judgement as a cook: these lessons describe what the owner found unappetising, '
            'not word lists. The owner DELETED these recipes, never propose them or anything like them: ' + deleted
            + '. The owner KEPT these, aim for dishes like them: ' + ', '.join(rules['ownerKept']) + '.')
