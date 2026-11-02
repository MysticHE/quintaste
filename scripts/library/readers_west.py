"""Canadian Nutrient File 2015 (CSV) and UK CoFID 2021 (Excel) readers. Values per 100 g edible portion."""
import csv
from pathlib import Path

import openpyxl

from nutrients import convert, parse
from readers_usda import pick


def _cnf(folder, name):
    # The CNF files are Windows-1252 (French names).
    with open(Path(folder) / name, encoding='cp1252', newline='') as handle:
        yield from csv.DictReader(handle)


def read_canada(folder, dataset='canada-cnf'):
    nutrients = {row['NutrientID']: (row['NutrientCode'], row['NutrientUnit']) for row in _cnf(folder, 'NUTRIENT NAME.csv')}
    groups = {row['FoodGroupID']: row['FoodGroupName'] for row in _cnf(folder, 'FOOD GROUP.csv')}
    foods = {}
    for row in _cnf(folder, 'FOOD NAME.csv'):
        names = {'en': row['FoodDescription'].strip()}
        if row.get('FoodDescriptionF', '').strip():
            names['fr'] = row['FoodDescriptionF'].strip()
        foods[row['FoodID']] = {'dataset': dataset, 'id': row['FoodID'], 'names': names, 'aliases': [],
                                'category': groups.get(row['FoodGroupID'], ''), 'refuse': None, 'found': {}}
    for row in _cnf(folder, 'NUTRIENT AMOUNT.csv'):
        food, nutrient, cell = foods.get(row['FoodID']), nutrients.get(row['NutrientID']), parse(row['NutrientValue'])
        if food is not None and nutrient is not None and cell is not None:
            food['found'][nutrient[0]] = (cell[0], nutrient[1])
    for food in foods.values():
        food['values'] = pick(food.pop('found'))
        yield food


# CoFID sheet -> {code: (our key, unit)}; carbohydrate is "available" (monosaccharide equivalents), not by difference.
COFID = {
    '1.3 Proximates': {'KCALS': ('kcal', 'kcal'), 'PROT': ('protein', 'g'), 'FAT': ('fat', 'g'), 'SATFOD': ('satFat', 'g'),
                       'CHO': ('carbsAvailable', 'g'), 'TOTSUG': ('sugar', 'g'), 'AOACFIB': ('fibre', 'g'), 'WATER': ('water', 'g')},
    '1.4 Inorganics': {'NA': ('sodium', 'mg'), 'K': ('potassium', 'mg'), 'CA': ('calcium', 'mg'), 'MG': ('magnesium', 'mg'),
                       'FE': ('iron', 'mg'), 'ZN': ('zinc', 'mg'), 'I': ('iodine', 'µg')},
    '1.5 Vitamins': {'VITD': ('vitD', 'µg'), 'VITE': ('vitE', 'mg'), 'VITB12': ('b12', 'µg'), 'FOLT': ('folate', 'µg'),
                     'VITC': ('vitC', 'mg')},
    '1.12 (PUFA per 100gFood)': {'FOD18:3cn3': ('ala', 'g')},
}
COFID_VITA = ('RET', 'CAREQU')  # RAE = retinol + carotene (beta-carotene equivalents) / 12


def _cofid_sheet(book, name):
    rows = book[name].iter_rows(values_only=True)
    next(rows)  # row 1: headings with units
    columns = {str(c).strip(): i for i, c in enumerate(next(rows)) if c}  # row 2: component codes
    for row in rows:
        code = str(row[0] or '').strip()
        if code and row[1]:
            yield code, row, columns


def read_uk(path, dataset='uk-cofid'):
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    foods = {}
    for sheet, mapping in COFID.items():
        for code, row, columns in _cofid_sheet(book, sheet):
            food = foods.setdefault(code, {'dataset': dataset, 'id': code, 'names': {'en': str(row[1]).strip()}, 'aliases': [],
                                           'category': str(row[3] or '').strip(), 'refuse': None, 'values': {}})
            for tag, (key, unit) in mapping.items():
                cell = parse(row[columns[tag]]) if tag in columns else None
                if cell is not None:
                    value = convert(cell[0], unit, key)
                    if value is None:  # the mapping above names the units, so this is a reader mistake, not data
                        raise ValueError(f'CoFID {tag}: cannot convert {unit} to {key}')
                    food['values'][key] = (value, cell[1])
            if sheet == '1.5 Vitamins':
                retinol, carotene = (parse(row[columns[t]]) if t in columns else None for t in COFID_VITA)
                if retinol is not None and carotene is not None:
                    food['values']['vitA'] = (retinol[0] + carotene[0] / 12, 'calculated')
    # Fibre is AOAC only: NSP (ENGFIB) is a different, lower measure, so it is not used as a stand-in.
    yield from foods.values()
