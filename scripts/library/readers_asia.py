"""Taiwan FDA Food Nutrient Database (CSV) and Japan MEXT Standard Tables 8th ed. 2023 (Excel) readers.

Both give values per 100 g edible portion. Output shape as in readers_usda.py.
"""
import csv
import re
from pathlib import Path

import openpyxl

from nutrients import convert, parse

TAIWAN = {
    '熱量': 'kcal', '粗蛋白': 'protein', '粗脂肪': 'fat', '飽和脂肪': 'satFat', '總碳水化合物': 'carbs', '糖質總量': 'sugar',
    '膳食纖維': 'fibre', '鈉': 'sodium', '水分': 'water', '灰分': 'ash', '維生素C': 'vitC', '維生素D總量(ug)': 'vitD',
    'α-生育酚': 'vitE', '維生素B12': 'b12', '葉酸': 'folate', '鐵': 'iron', '鈣': 'calcium', '鋅': 'zinc', '鎂': 'magnesium',
    '鉀': 'potassium', '次亞麻油酸(18:3)': 'ala', '離胺酸(Lys)': 'lysine', '甲硫胺酸(Met)': 'methionine',
}
TAIWAN_VITA = {'視網醇': 1.0, 'β-胡蘿蔔素': 1 / 12, 'α-胡蘿蔔素': 1 / 24}  # RAE = retinol + beta/12 + alpha/24
_SPLIT = re.compile(r'[,，、;；/]')


def read_taiwan(path, dataset='taiwan-fda'):
    foods = {}
    with open(path, encoding='utf-8-sig', newline='') as handle:
        for row in csv.DictReader(handle):
            fid = row['整合編號'].strip()
            food = foods.get(fid)
            if food is None:
                aliases = [a.strip() for a in _SPLIT.split(row['俗名'] or '') if a.strip()]
                english = [n.strip() for n in (row['樣品英文名稱'] or '').split(';') if n.strip()]
                refuse = parse(row['廢棄率'])
                food = foods[fid] = {
                    'dataset': dataset, 'id': fid, 'aliases': [{'lang': 'zh-Hant', 'text': a} for a in aliases]
                    + [{'lang': 'en', 'text': e} for e in english[1:]],
                    'names': {'zh-Hant': row['樣品名稱'].strip(), **({'en': english[0]} if english else {})},
                    'category': row['食品分類'].strip(), 'description': (row['內容物描述'] or '').strip()[:500], 'refuse': refuse[0] if refuse else None, 'values': {}, 'vitA': {}}
            item, cell = row['分析項'].strip(), parse(row['每100克含量'])
            if cell is None:
                continue
            if item in TAIWAN_VITA:
                food['vitA'][item] = cell[0]
            elif item in TAIWAN:
                value = convert(cell[0], row['含量單位'], TAIWAN[item])
                if value is not None:
                    food['values'][TAIWAN[item]] = (value, cell[1])
    for food in foods.values():
        parts = food.pop('vitA')
        if parts:
            food['values']['vitA'] = (sum(v * TAIWAN_VITA[k] for k, v in parts.items()), 'calculated')
        yield food


# MEXT tag -> (our key, unit). Main table (第2章), amino acid table 1 (per 100 g edible), fatty acid table 1 (per 100 g edible).
MEXT_MAIN = {
    'ENERC_KCAL': ('kcal', 'kcal'), 'PROT-': ('protein', 'g'), 'FAT-': ('fat', 'g'), 'CHOCDF-': ('carbs', 'g'),
    'CHOAVL': ('carbsAvailable', 'g'), 'FIB-': ('fibre', 'g'), 'NA': ('sodium', 'mg'), 'WATER': ('water', 'g'),
    'ASH': ('ash', 'g'), 'VITA_RAE': ('vitA', 'µg'), 'VITC': ('vitC', 'mg'), 'VITD': ('vitD', 'µg'), 'TOCPHA': ('vitE', 'mg'),
    'VITB12': ('b12', 'µg'), 'FOL': ('folate', 'µg'), 'FE': ('iron', 'mg'), 'CA': ('calcium', 'mg'), 'ZN': ('zinc', 'mg'),
    'MG': ('magnesium', 'mg'), 'K': ('potassium', 'mg'), 'ID': ('iodine', 'µg'),
}
MEXT_AMINO = {'LYS': ('lysine', 'mg'), 'MET': ('methionine', 'mg')}
MEXT_FAT = {'FASAT': ('satFat', 'g'), 'F18D3N3': ('ala', 'mg')}
_FOOD_NO = re.compile(r'^\d{5}$')


def _mext_rows(path):
    """(food number, name, remarks, {tag: cell}) for every food row of a table's whole-table sheet."""
    sheet = openpyxl.load_workbook(path, read_only=True, data_only=True)['表全体']
    tags, name_col = None, None
    for row in sheet.iter_rows(values_only=True):
        if tags is None:
            if '成分識別子' in row:
                name_col = row.index('成分識別子')
                tags = {i: str(c).strip() for i, c in enumerate(row) if i > name_col and c not in (None, '')}
            continue
        number = str(row[name_col - 2] or '').strip()
        if not _FOOD_NO.match(number):
            continue
        # The remarks (備考) column follows the last nutrient column.
        after = [c for c in row[max(tags) + 1:] if isinstance(c, str) and c.strip()]
        yield number, str(row[name_col]).replace('　', ' ').strip(), after[0] if after else '', \
            {tags[i]: row[i] for i in tags if i < len(row)}
    if tags is None:
        raise SystemExit(f'{path}: no tag row found')


def _mext_values(cells, mapping):
    values = {}
    for tag, (key, unit) in mapping.items():
        cell = parse(cells.get(tag))
        if cell is not None:
            value = convert(cell[0], unit, key)
            if value is not None:
                values[key] = (value, cell[1])
    return values


def mext_english(path):
    """Item number -> English name from MEXT's English 7th edition table (same item numbers as the 8th edition)."""
    names = {}
    if not Path(path).is_file():
        return names
    for row in openpyxl.load_workbook(path, read_only=True, data_only=True)['Table'].iter_rows(values_only=True):
        number, name = str(row[1] or '').strip(), row[3]
        if _FOOD_NO.match(number) and isinstance(name, str):
            # Drop MEXT's footnote marks and synonym notes: "Common oats*, oatmeal, raw\n［*Syn. Oats］".
            names[number] = re.sub(r'\s+', ' ', name.split('\n')[0].replace('*', '')).strip()
    return names


def read_japan(folder, dataset='japan-mext'):
    folder = Path(folder)
    english = mext_english(folder / 'mext7_en.xlsx')
    extra = {}
    for name, mapping in (('mext_04.xlsx', MEXT_AMINO), ('mext_09.xlsx', MEXT_FAT)):
        seen = set()
        for number, _, _, cells in _mext_rows(folder / name):
            seen.update(cells)
            extra.setdefault(number, {}).update(_mext_values(cells, mapping))
        missing = set(mapping) - seen
        if missing:
            raise SystemExit(f'{name}: tags not found: {sorted(missing)}')
    for number, name, remarks, cells in _mext_rows(folder / 'mext_02.xlsx'):
        refuse = parse(cells.get('REFUSE'))
        aliases = []
        for line in remarks.splitlines():
            if line.startswith('別名'):
                aliases += [a.strip() for a in _SPLIT.split(line.split('：', 1)[-1]) if a.strip()]
        values = _mext_values(cells, MEXT_MAIN)
        values.update(extra.get(number, {}))
        names = {'ja': name, **({'en': english[number]} if number in english else {})}
        yield {'dataset': dataset, 'id': number, 'names': names, 'aliases': [{'lang': 'ja', 'text': a} for a in aliases],
               'category': number[:2], 'refuse': refuse[0] if refuse else None, 'values': values}
