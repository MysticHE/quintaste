"""The food library's nutrient list, units and value parsing (docs/AI_FOOD_LIBRARY_PLAN.md §3).

Every dataset reader converts to these keys and units. The first seven keys are the app's existing figures
(src/utils/nutrition.ts); the vitamin and mineral keys match the bots' nutrition_sg.json v3.
"""
import re

# key, unit, group, name
NUTRIENTS = (
    ('kcal', 'kcal', 'energy', 'Energy'),
    ('protein', 'g', 'macro', 'Protein'),
    ('fat', 'g', 'macro', 'Fat'),
    ('satFat', 'g', 'macro', 'Saturated fat'),
    ('carbs', 'g', 'macro', 'Carbohydrate, total by difference'),
    ('carbsAvailable', 'g', 'macro', 'Carbohydrate, available'),
    ('sugar', 'g', 'macro', 'Sugars, total'),
    ('fibre', 'g', 'macro', 'Fibre, dietary'),
    ('sodium', 'mg', 'mineral', 'Sodium'),
    ('water', 'g', 'macro', 'Water'),
    ('ash', 'g', 'macro', 'Ash'),
    ('vitA', 'µg', 'vitamin', 'Vitamin A, RAE'),
    ('vitC', 'mg', 'vitamin', 'Vitamin C'),
    ('vitD', 'µg', 'vitamin', 'Vitamin D (D2 + D3)'),
    ('vitE', 'mg', 'vitamin', 'Vitamin E, alpha-tocopherol'),
    ('b12', 'µg', 'vitamin', 'Vitamin B12'),
    ('folate', 'µg', 'vitamin', 'Folate'),
    ('iron', 'mg', 'mineral', 'Iron'),
    ('calcium', 'mg', 'mineral', 'Calcium'),
    ('zinc', 'mg', 'mineral', 'Zinc'),
    ('magnesium', 'mg', 'mineral', 'Magnesium'),
    ('potassium', 'mg', 'mineral', 'Potassium'),
    ('iodine', 'µg', 'mineral', 'Iodine'),
    ('ala', 'g', 'fatty-acid', 'Alpha-linolenic acid (18:3 n-3)'),
    ('lysine', 'mg', 'amino-acid', 'Lysine'),
    ('methionine', 'mg', 'amino-acid', 'Methionine'),
)
UNIT = {key: unit for key, unit, _, _ in NUTRIENTS}
QUALITIES = ('measured', 'estimated', 'trace', 'calculated')

_SCALE = {'g': 1.0, 'mg': 1e-3, 'µg': 1e-6}
_UNIT_NAMES = {'g': 'g', 'mg': 'mg', 'µg': 'µg', 'μg': 'µg', 'ug': 'µg', 'mcg': 'µg', 'kcal': 'kcal', 'kj': 'kJ'}


def slug(name, limit):
    """A library or kitchen key from a name: lower-case words joined by dashes, at most `limit` characters."""
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:limit].strip('-')


def unit_name(text):
    """A dataset's unit text in our spelling, or None for units we cannot convert (IU, %)."""
    return _UNIT_NAMES.get(str(text).strip().lower())


def convert(value, source_unit, key):
    """Value in our unit for `key`, or None when the units cannot be converted."""
    target, source = UNIT[key], unit_name(source_unit)
    if source is None:
        return None
    if target == 'kcal':
        return value if source == 'kcal' else value / 4.184 if source == 'kJ' else None
    if source not in _SCALE or target not in _SCALE:
        return None
    return value * _SCALE[source] / _SCALE[target]


_NUMBER = re.compile(r'^-?\d+(?:\.\d+)?$')


def parse(text):
    """(value, quality) from a published cell, or None when the dataset gives no value.

    Handles the markers the tables use: Tr / (Tr) = trace, (12.3) = estimated, N / - / * / blank = not given.
    """
    if text is None:
        return None
    if isinstance(text, (int, float)):
        return (float(text), 'measured') if text >= 0 else None
    raw = str(text).strip().replace(',', '')
    if not raw or raw in {'-', 'N', 'n', '*', '…', 'NA', 'n/a'}:
        return None
    estimated = raw.startswith('(') and raw.endswith(')')
    inner = raw[1:-1].strip() if estimated else raw
    if inner.lower() == 'tr':
        return 0.0, 'trace'
    if not _NUMBER.match(inner):
        return None
    value = float(inner)
    if value < 0:
        return None
    return value, 'estimated' if estimated else 'measured'
