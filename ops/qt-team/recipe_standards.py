"""Nutrient level and colour dish (owner, 28 Oct 2026; docs/RECIPE_SOURCING_PLAN.md §5a): the content path that lets a recipe
qualify without a star rating. International standards, not HPB. Recipes have no reliable serving weight, so every condition
uses the per-100-kcal or per-energy form, which needs none.

- Vitamins and minerals: at least one vitamin and one mineral at Codex "source" level, 5% of its NRV per 100 kcal
  (Codex CXG 23-1997 Guidelines for Use of Nutrition and Health Claims; NRVs-R from Codex CXG 2-1985).
- Protein or fibre: source of protein, at least 12% of energy (EU Regulation 1924/2006, Annex), or source of fibre, at least
  1.5 g per 100 kcal (EU 1924/2006 Annex; Codex CXG 23-1997).
- Sodium: at most 600 mg per serving, 30% of the WHO limit of 2,000 mg a day.
- Colour dish: at least three of the five colours (green, red, yellow, black, white) from foods of 5 g or more per serving.
Facts only: no score is shown to members and no claim is published from these checks.
"""

# Codex NRVs-R (CXG 2-1985). Vitamin A, C and E confirmed against the CCNFSDU derivation document on 28 Oct 2026; the others are
# the adopted adult values (iron at 15% absorption, zinc at 30% absorption) and must be re-read from the current text before
# any of them is shown to members.
NRV = {'vitA': 800, 'vitC': 100, 'vitE': 9, 'folate': 400, 'b12': 2.4,
       'iron': 14, 'calcium': 1000, 'zinc': 11, 'magnesium': 310, 'potassium': 3500}
VITAMINS = ('vitA', 'vitC', 'vitE', 'folate', 'b12')
MINERALS = ('iron', 'calcium', 'zinc', 'magnesium', 'potassium')
SOURCE_SHARE_PER_100_KCAL = 0.05
PROTEIN_ENERGY_SHARE = 0.12
FIBRE_PER_100_KCAL = 1.5
MAX_SODIUM_MG = 600
MIN_COLOURS = 3
NAMES = {'vitA': 'vitamin A', 'vitC': 'vitamin C', 'vitE': 'vitamin E', 'folate': 'folate', 'b12': 'vitamin B12', 'iron': 'iron',
         'calcium': 'calcium', 'zinc': 'zinc', 'magnesium': 'magnesium', 'potassium': 'potassium'}


def sources(figures):
    """The vitamins and minerals this recipe is a Codex source of: (vitamins, minerals), per its per-serving figures."""
    kcal = figures['perServing'].get('kcal') or 0
    micro = figures.get('micro') or {}
    if kcal <= 0:
        return [], []
    hit = [k for k, v in micro.items() if k in NRV and v / (kcal / 100) >= SOURCE_SHARE_PER_100_KCAL * NRV[k]]
    return [k for k in hit if k in VITAMINS], [k for k in hit if k in MINERALS]


def problems(figures):
    """Why a recipe misses the nutrient level or the colour dish; [] when it meets both. figures: nutrition.estimate(detail=True)."""
    if not figures or 'micro' not in figures:
        return ['nutrition could not be measured (ingredients not all in the reviewed table)']
    per = figures['perServing']
    kcal = per.get('kcal') or 0
    reasons = []
    vitamins, minerals = sources(figures)
    known = figures['micro']
    for group, found, label in ((VITAMINS, vitamins, 'vitamin'), (MINERALS, minerals, 'mineral')):
        if not any(k in known for k in group):
            reasons.append(f'{label}s could not be measured (an ingredient over 10% of the weight has no {label} data)')
        elif not found:
            reasons.append(f'not a source of any {label} (Codex: 5% of NRV per 100 kcal)')
    protein, fibre = per.get('protein'), per.get('fibre')
    protein_ok = protein is not None and kcal > 0 and protein * 4 / kcal >= PROTEIN_ENERGY_SHARE
    fibre_ok = fibre is not None and kcal > 0 and fibre / (kcal / 100) >= FIBRE_PER_100_KCAL
    if not (protein_ok or fibre_ok):
        reasons.append('not a source of protein (12% of energy) or fibre (1.5 g per 100 kcal)')
    sodium = per.get('sodium')
    if sodium is None:
        reasons.append('sodium could not be measured')
    elif sodium > MAX_SODIUM_MG:
        reasons.append(f'{sodium:.0f} mg sodium a serving (max {MAX_SODIUM_MG})')
    colours = figures.get('colours') or []
    if len(colours) < MIN_COLOURS:
        reasons.append(f'{len(colours)} of the five colours ({", ".join(colours) or "none"}; needs {MIN_COLOURS})')
    return reasons


def summary(figures):
    """One line for the round notes and Manager review, e.g. 'source of vitamin C, iron; colours green, red, white'."""
    vitamins, minerals = sources(figures)
    return ('source of ' + ', '.join(NAMES[k] for k in vitamins + minerals) + '; colours ' + ', '.join(figures.get('colours') or [])
            + ('; grains ' + ', '.join(figures['staples']) if figures.get('staples') else ''))
