"""Export the loaded library to one Excel workbook for review (docs/AI_FOOD_LIBRARY_PLAN.md §10).

Sheets: Summary, Foods (every library food with its main figures and sources), Kitchen (recipe keys, their food and the
change against the bots' current table), Disagree (figures whose sources spread more than 1.5 times), Left out (every
dataset record not in the library and why).
Run: python -I scripts/library/export_review.py <output.xlsx> [container]
"""
import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from load import query  # noqa: E402
from seed import key_of  # noqa: E402

FIGURES = ('kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium', 'calcium', 'iron', 'vitC', 'vitA', 'b12', 'vitD')
HEADER = Font(bold=True)
FILL = PatternFill('solid', fgColor='EEEEEE')


def sheet(book, title, header, rows, widths=None):
    ws = book.create_sheet(title)
    ws.append(header)
    for cell in ws[1]:
        cell.font, cell.fill = HEADER, FILL
    for row in rows:
        ws.append([number(v) for v in row])
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions
    for i, width in enumerate(widths or [], start=1):
        ws.column_dimensions[get_column_letter(i)].width = width
    return ws


def number(value):
    if isinstance(value, str) and re.fullmatch(r'-?\d+(\.\d+)?', value):
        return round(float(value), 2)
    return value


def main(path, container='quintaste-dev-db'):
    book = Workbook()
    book.remove(book.active)
    summary = query(container, """
        SELECT kind, category, count(*), count(*) FILTER (WHERE n > 1)
        FROM (SELECT f.*, (SELECT count(DISTINCT dataset) FROM library.food_source s WHERE s.food = f.key AND s.role = 'measured') n
              FROM library.food f) x GROUP BY kind, category ORDER BY kind, category""")
    ws = sheet(book, 'Summary', ['Kind', 'Group', 'Foods', 'From several countries'], summary, [14, 20, 10, 22])
    ws.append([])
    for label, sql in (
            ('Library foods', 'SELECT count(*) FROM library.food'),
            ('Dataset records used', "SELECT count(*) FROM library.food_source WHERE role = 'measured'"),
            ('Copies attached (not counted)', "SELECT count(*) FROM library.food_source WHERE role = 'copy'"),
            ('Dataset records left out', "SELECT count(*) FROM library.source_food WHERE left_out <> ''"),
            ('Figures from one record', "SELECT count(*) FROM library.food_value WHERE rule = 'single'"),
            ('Figures that are medians', "SELECT count(*) FROM library.food_value WHERE rule = 'median'"),
            ('Medians flagged disagree', "SELECT count(*) FROM library.food_value WHERE 'disagree' = ANY(flags)")):
        ws.append([label, '', number(query(container, sql)[0][0])])
    pivot = ', '.join(f"max(v.value) FILTER (WHERE v.nutrient = '{k}')" for k in FIGURES)
    foods = query(container, f"""
        SELECT f.key, f.name_en, f.name_zh, f.kind, f.category, f.diet, f.state, {pivot},
               (SELECT count(DISTINCT dataset) FROM library.food_source s WHERE s.food = f.key AND s.role = 'measured'),
               (SELECT string_agg(DISTINCT dataset, ', ') FROM library.food_source s WHERE s.food = f.key AND s.role = 'measured'),
               (SELECT string_agg(nutrient, ', ' ORDER BY nutrient) FROM library.food_value d WHERE d.food = f.key AND 'disagree' = ANY(d.flags)),
               (SELECT string_agg(alias, '; ') FROM library.alias a WHERE a.food = f.key AND a.lang = 'zh' AND a.alias <> lower(f.name_zh))
        FROM library.food f LEFT JOIN library.food_value v ON v.food = f.key
        GROUP BY f.key ORDER BY f.kind DESC, f.category, f.name_en""")
    sheet(book, 'Foods', ['Key', 'English', 'Chinese', 'Kind', 'Group', 'Diet', 'State', *[f'{k} /100g' for k in FIGURES],
                          'Countries', 'Datasets', 'Figures that disagree', 'Other Chinese names'], foods,
          [28, 46, 24, 10, 16, 9, 9] + [9] * len(FIGURES) + [9, 30, 24, 24])
    bot = json.loads(Path('ops/qt-team/nutrition_sg.json').read_text(encoding='utf-8'))['foods']
    old = {key_of(k): v.get('per100g') or {} for k, v in bot.items()}
    kitchen = query(container, """
        SELECT c.key, c.name_en, coalesce(f.name_en, ''), coalesce(f.name_zh, ''), c.stand_in, c.per100::text,
               jsonb_array_length(c.datasets)
        FROM library.card c LEFT JOIN library.food f ON f.key = c.food ORDER BY c.key""")
    rows = []
    for key, name, food_en, food_zh, stand_in, per100, countries in kitchen:
        new, was = json.loads(per100), old.get(key, {})
        moved = [f'{k} {was[k]:g}→{float(new[k]):g}' for k in ('kcal', 'protein', 'fat', 'carbs', 'sodium', 'calcium', 'iron')
                 if k in was and k in new and abs(float(new[k]) - was[k]) > max(0.1 * was[k], 0.3)]
        rows.append([key, name, food_en or '(no food yet)', food_zh, 'yes' if stand_in == 't' else '', countries,
                     *[new.get(k, '') for k in ('kcal', 'protein', 'fat', 'carbs', 'sodium')], '; '.join(moved)])
    sheet(book, 'Kitchen', ['Key', 'Recipe name', 'Library food', 'Chinese', 'Stand-in', 'Countries',
                            'kcal', 'protein', 'fat', 'carbs', 'sodium', 'Changed vs bots (>10%)'], rows,
          [26, 34, 44, 22, 9, 10, 8, 8, 8, 8, 8, 60])
    disagree = query(container, """
        SELECT f.name_en, f.name_zh, v.nutrient, v.value,
               (SELECT string_agg((s->>'dataset') || ' ' || (s->>'value'), '; ') FROM jsonb_array_elements(v.sources) s)
        FROM library.food_value v JOIN library.food f ON f.key = v.food
        WHERE 'disagree' = ANY(v.flags) ORDER BY f.name_en, v.nutrient""")
    sheet(book, 'Disagree', ['Food', 'Chinese', 'Nutrient', 'Median used', 'Each source'], disagree, [46, 24, 14, 12, 60])
    left = query(container, """
        SELECT dataset, source_id, coalesce(names->>'en', names->>'zh-Hant', names->>'ja'), left_out
        FROM library.source_food WHERE left_out <> '' ORDER BY left_out, dataset, source_id""")
    sheet(book, 'Left out', ['Dataset', 'Id', 'Name in the dataset', 'Why'], left, [16, 12, 60, 50])
    book.save(path)
    print(f'{path}: {len(foods)} foods, {len(rows)} kitchen keys, {len(disagree)} disagreeing figures, {len(left)} left out')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
