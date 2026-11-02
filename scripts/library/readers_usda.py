"""USDA FoodData Central readers: SR Legacy and FNDDS (CSV), Foundation Foods (JSON). Public domain.

Each reader yields food dicts: {dataset, id, names, aliases, category, refuse, values: {key: (value, quality)}}.
Canada's CNF uses the same nutrient numbers, so readers_west.py reuses NUMBERS.
"""
import csv
import glob
import json
from pathlib import Path

from nutrients import convert

# Our key -> USDA nutrient numbers in order of preference; a later number is used only when the earlier ones are missing.
NUMBERS = {
    'kcal': ('208', '957', '958'), 'protein': ('203',), 'fat': ('204', '298'), 'satFat': ('606',), 'carbs': ('205', '205.2'),
    'sugar': ('269', '269.3'), 'fibre': ('291',), 'sodium': ('307',), 'water': ('255',), 'ash': ('207',), 'vitA': ('320',),
    'vitC': ('401',), 'vitD': ('328',), 'vitE': ('323',), 'b12': ('418',), 'folate': ('435', '417'), 'iron': ('303',),
    'calcium': ('301',), 'zinc': ('309',), 'magnesium': ('304',), 'potassium': ('306',), 'iodine': ('314',),
    'ala': ('851', '619'), 'lysine': ('505',), 'methionine': ('506',),
}
# Fallback numbers that are a different measure of the same thing.
FALLBACK_QUALITY = {'957': 'calculated', '958': 'calculated', '619': 'estimated', '205.2': 'calculated'}


def pick(found):
    """found: {number: (value, unit)} -> {key: (value, quality)} using NUMBERS' order."""
    values = {}
    for key, numbers in NUMBERS.items():
        for number in numbers:
            if number in found:
                value, unit = found[number]
                converted = convert(value, unit, key)
                if converted is not None:
                    values[key] = (converted, FALLBACK_QUALITY.get(number, 'measured'))
                    break
    return values


def _number(text):
    try:
        value = float(text)
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


def _csv(folder, name):
    with open(Path(folder) / name, encoding='utf-8', newline='') as handle:
        yield from csv.DictReader(handle)


def read_fdc_csv(folder, dataset):
    """SR Legacy or FNDDS CSV folder (food.csv, food_nutrient.csv, nutrient.csv)."""
    # SR Legacy's food_nutrient.nutrient_id is the nutrient's id; FNDDS puts the nutrient number there instead. The two
    # ranges do not overlap (ids from 1000, numbers below 1000), so one lookup serves both.
    nutrients = {}
    for row in _csv(folder, 'nutrient.csv'):
        nutrients[row['id']] = nutrients[row['nutrient_nbr']] = (row['nutrient_nbr'], row['unit_name'])
    categories = {row['id']: row['description'] for row in _csv(folder, 'food_category.csv')} \
        if (Path(folder) / 'food_category.csv').exists() else {}
    if (Path(folder) / 'survey_fndds_food.csv').exists():
        wweia = {row['wweia_food_category']: row['wweia_food_category_description'] for row in _csv(folder, 'wweia_food_category.csv')}
        categories_by_food = {row['fdc_id']: wweia.get(row['wweia_category_number'], '') for row in _csv(folder, 'survey_fndds_food.csv')}
    else:
        categories_by_food = {}
    foods = {}
    for row in _csv(folder, 'food.csv'):
        category = categories_by_food.get(row['fdc_id']) or categories.get(row.get('food_category_id', ''), '')
        foods[row['fdc_id']] = {'dataset': dataset, 'id': row['fdc_id'], 'names': {'en': row['description'].strip()},
                                'aliases': [], 'category': category, 'refuse': None, 'found': {}}
    for row in _csv(folder, 'food_nutrient.csv'):
        food, nutrient, value = foods.get(row['fdc_id']), nutrients.get(row['nutrient_id']), _number(row['amount'])
        if food is not None and nutrient is not None and value is not None:
            food['found'][nutrient[0]] = (value, nutrient[1])
    for food in foods.values():
        food['values'] = pick(food.pop('found'))
        yield food


def read_foundation_json(folder, dataset='usda-foundation'):
    path = glob.glob(str(Path(folder) / '*.json'))[0]
    with open(path, encoding='utf-8') as handle:
        foods = json.load(handle)['FoundationFoods']
    for item in foods:
        found = {}
        for entry in item.get('foodNutrients', []):
            nutrient, value = entry.get('nutrient') or {}, _number(entry.get('amount'))
            if nutrient.get('number') and value is not None:
                found[str(nutrient['number'])] = (value, nutrient.get('unitName', ''))
        yield {'dataset': dataset, 'id': str(item['fdcId']), 'names': {'en': item['description'].strip()}, 'aliases': [],
               'category': (item.get('foodCategory') or {}).get('description', ''), 'refuse': None, 'values': pick(found)}
