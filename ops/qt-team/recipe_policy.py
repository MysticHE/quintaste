"""Owner's QuinTaste recipe eligibility; narrower than general vegetarian usage."""
import re
import unicodedata

RULE = ('QuinTaste recipe rule (owner requirement): exclude all five pungent vegetables. '
        'Do not propose recipes containing garlic, onion, shallot, scallion/spring onion, '
        'leek, chive, asafoetida/hing or their powders, oils, sauces and seasonings. '
        'Check the actual ingredient list and every compound ingredient. Unknown composition stays held. '
        'A Vegetarian or Vegan label alone is insufficient. Do not silently remove ingredients '
        'from an existing recipe; source a suitable recipe and disclose any adaptation. '
        'This rule applies to recipe eligibility, not a claim about all vegetarian traditions.')

PUNGENT = re.compile(r'\b(?:garlic|onions?|shallots?|scallions?|leeks?|chives?|alliums?|'
                     r'asafoetida|asafetida|hing|heeng|ramps?|rakkyo|bawang|kucai)\b|[葱蔥蒜韭薤]|兴渠|興渠', re.I)


def problem(recipe):
    parts = [recipe.get('name', '')]
    parts += [str(i.get('name', '')) + ' ' + str(i.get('id', '')) for i in recipe.get('ingredients', [])]
    parts += [s.get('instruction', '') for s in recipe.get('steps', [])]
    parts += recipe.get('contains', []) + recipe.get('dietary', {}).get('contains', [])
    text = unicodedata.normalize('NFKC', ' '.join(str(p) for p in parts)).replace('_', ' ')
    match = PUNGENT.search(text)
    if match:
        return 'Excluded by QuinTaste five-pungent recipe rule: ' + match.group(0)
    if recipe.get('compoundIngredientsUnconfirmed'):
        return 'Five-pungent suitability remains unverified: compound ingredient composition unknown'
    return None


def require_recipe(recipe):
    reason = problem(recipe)
    if reason: raise ValueError(reason)
