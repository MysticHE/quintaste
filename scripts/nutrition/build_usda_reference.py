"""Build server-assets/nutrition/usda-reference.json from the USDA FoodData Central SR Legacy CSV download (public domain).

Every SR Legacy food with its per-100 g energy, protein, fat, carbohydrate, fibre, sugar and sodium, plus the household
portions USDA weighed (1 tbsp, 1 clove, 1 medium ...). The AI ingredient resolver picks foods and gram weights from this
list, so figures always come from USDA rather than the model.

Download: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
Run: python -I scripts/nutrition/build_usda_reference.py <unzipped folder> <repository root>
"""
import csv
import json
import sys
from datetime import date
from pathlib import Path

NUTRIENTS = {'1008': 'kcal', '1003': 'protein', '1004': 'fat', '1005': 'carbs', '1079': 'fibre', '2000': 'sugar', '1093': 'sodium'}
ORDER = ['kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium']


def rows(folder, name):
    with open(folder / name, newline='', encoding='utf-8') as handle:
        yield from csv.DictReader(handle)


def main():
    if len(sys.argv) != 3:
        raise SystemExit('usage: build_usda_reference.py <SR Legacy CSV folder> <repository root>')
    folder, root = Path(sys.argv[1]), Path(sys.argv[2])
    categories = {r['id']: r['description'] for r in rows(folder, 'food_category.csv')}
    units = {r['id']: r['name'] for r in rows(folder, 'measure_unit.csv')}
    foods = {r['fdc_id']: {'name': r['description'].strip(), 'category': categories.get(r['food_category_id'], ''), 'n': {}, 'portions': []}
             for r in rows(folder, 'food.csv') if r['data_type'] == 'sr_legacy_food'}
    for r in rows(folder, 'food_nutrient.csv'):
        key = NUTRIENTS.get(r['nutrient_id'])
        food = foods.get(r['fdc_id'])
        if key and food is not None and r['amount'] != '':
            food['n'][key] = round(float(r['amount']), 3)
    for r in rows(folder, 'food_portion.csv'):
        food = foods.get(r['fdc_id'])
        if food is None or not r['gram_weight']:
            continue
        unit = units.get(r['measure_unit_id'], '')
        label = ' '.join(part for part in [r['amount'] if r['amount'] not in ('', '1', '1.0') else '', '' if unit == 'undetermined' else unit,
                                           r['portion_description'], r['modifier']] if part).strip()
        grams = round(float(r['gram_weight']), 2)
        amount = float(r['amount']) if r['amount'] else 1.0
        if label and grams > 0 and amount > 0:
            food['portions'].append([label, grams])
    out = {}
    for fdc, food in sorted(foods.items(), key=lambda item: int(item[0])):
        if 'kcal' not in food['n']:
            continue
        out[fdc] = [food['name'], food['category'], *[food['n'].get(key) for key in ORDER], food['portions'][:8]]
    target = root / 'server-assets' / 'nutrition' / 'usda-reference.json'
    document = {
        'source': 'USDA FoodData Central, SR Legacy (April 2018), public domain. Per 100 g; sodium in mg, others in g; null when USDA has no value.',
        'built': date.today().isoformat(),
        'fields': ['name', 'category', *ORDER, 'portions'],
        'foods': out,
    }
    target.write_text(json.dumps(document, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(out)} foods, {target.stat().st_size // 1024} KB -> {target}')


main()
