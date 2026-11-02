"""Generate the app's and the bots' nutrition figures from the food library (docs/AI_FOOD_LIBRARY_PLAN.md §1).

Reads library.card and library.dataset in the local database and writes:
  server-assets/nutrition/library-figures.json  per-100 g figures and the source record for every key of the reviewed recipe
                                                table (server-assets/nutrition/ingredient-table.json), read by
                                                server/nutrition and scripts/recipe-nutrition.ts
  ops/qt-team/nutrition_sg.json                 the QT Cooker's v3 table: its match words, units, colours and staples are
                                                kept, its figures replaced by the library's; recipe-table keys it lacks are
                                                added with the recipe table's match words and units
  src/data/food-data-sources.ts                 the datasets, their credit lines and licences, for Settings > Food Data Sources
Match words and units stay curated in the recipe table and the bot table; only figures come from here. Never edit the
outputs by hand. Run after load.py: python -I scripts/library/export_tables.py <repository root> [container]
"""
import datetime as dt
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(1, str(HERE.parents[1] / 'ops/qt-team'))
from load import query  # noqa: E402
from nutrition import MICRO  # noqa: E402  (the bots' vitamins and minerals; the app's list is server/nutrition/nutrients.mjs)
from seed import app_food, key_of, source_of  # noqa: E402

APP = ('kcal', 'protein', 'fat', 'carbs', 'fibre', 'sugar', 'sodium')
RECIPE_FIELDS = ('name', 'gPerMl', 'each', 'per', 'negligible', 'analogue', 'match')


def per100_of(text):
    """A card's figures, rounded, with total carbohydrate filled from available carbohydrate plus fibre for foods only
    the UK table measures (CoFID gives available carbohydrate, not carbohydrate by difference)."""
    figures = {k: round(float(v), 3) for k, v in json.loads(text).items()}
    if 'carbs' not in figures and 'carbsAvailable' in figures:
        figures['carbs'] = round(figures['carbsAvailable'] + figures.get('fibre', 0), 3)
    return figures


def cards(container):
    rows = query(container, """
        SELECT c.key, c.food, f.name_en, c.negligible, c.per100::text, c.datasets::text
        FROM library.card c LEFT JOIN library.food f ON f.key = c.food""")
    return {key: {'food': food, 'name': name, 'negligible': negligible == 't', 'per100': per100_of(per100),
                  'datasets': json.loads(datasets)} for key, food, name, negligible, per100, datasets in rows}


def sources(container):
    rows = query(container, 'SELECT id, name, version, licence, licence_url, credit, url FROM library.dataset ORDER BY id')
    return [{'id': i, 'name': n, 'version': v, 'licence': lic, 'licenceUrl': lu, 'credit': c or n, 'url': u}
            for i, n, v, lic, lu, c, u in rows]


def record_of(key, food):
    """'dataset:id' of the record a kitchen key is linked through (seed.py's rule), or '' when it has none."""
    source = source_of(food, key_of(key))
    return ':'.join(source) if source else ''


def app_figures(repo, card, datasets, today):
    table = json.loads((repo / 'server-assets/nutrition/ingredient-table.json').read_text(encoding='utf-8'))
    bot = json.loads((repo / 'ops/qt-team/nutrition_sg.json').read_text(encoding='utf-8'))['foods']
    foods, missing = {}, []
    for key, food in sorted(table['foods'].items()):
        if food.get('negligible'):
            continue
        row = card.get(key_of(key))
        if not row or not row['food'] or 'kcal' not in row['per100']:
            missing.append(key)
            continue
        foods[key] = {'food': row['food'], 'name': row['name'], 'record': record_of(key, bot.get(key) or app_food(food)),
                      'per100': row['per100']}
    if missing:
        raise SystemExit(f'recipe-table keys without a library food with energy: {missing}; link them in seed.py')
    document = {'source': 'QuinTaste food library: per 100 g edible portion; sodium and minerals in mg, vitamins A, D, B12, '
                          'folate and iodine in µg, others in g. Medians where several datasets measured the food.',
                'built': today, 'table': table['version'], 'datasets': [d['credit'] for d in datasets], 'foods': foods}
    path = repo / 'server-assets/nutrition/library-figures.json'
    path.write_text(json.dumps(document, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{path}: {len(foods)} foods')


def bot_table(repo, card, datasets, today):
    path = repo / 'ops/qt-team/nutrition_sg.json'
    document = json.loads(path.read_text(encoding='utf-8'))
    table = json.loads((repo / 'server-assets/nutrition/ingredient-table.json').read_text(encoding='utf-8'))['foods']
    added = [key for key in sorted(table) if key not in document['foods']]
    for key in added:
        document['foods'][key] = {k: table[key][k] for k in RECIPE_FIELDS if k in table[key]} | app_food({'usda': table[key].get('usda')})
    document['micro'], kept = list(MICRO), []
    for key, food in document['foods'].items():
        row = card.get(key_of(key))
        if food.get('negligible') or not row or not row['food']:
            kept.append(key)
            continue
        # The record the key was linked through stays, so seed.py links it the same way from this file next time.
        record, figures = record_of(key, food), row['per100']
        for field in ('fdcId', 'usda', 'source'):
            food.pop(field, None)
        food.update({'record': record, 'food': row['food'], 'foodName': row['name']})
        food['per100g'] = {**{k: figures.get(k) for k in APP}, **{k: figures[k] for k in MICRO if k in figures}}
    document.update({'built': today, 'source': 'QuinTaste food library (generated by scripts/library/export_tables.py in the '
                     'app repo; never edit the figures by hand). Values per 100 g; sodium and minerals in mg, vitA, vitD, folate '
                     'and b12 in ug, others in g. Credits: ' + '; '.join(d['credit'] for d in datasets)})
    path.write_text(json.dumps(document, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{path}: {len(document["foods"]) - len(kept)} foods from the library; added from the recipe table: {added}; '
          f'kept as they were: {kept}')


def data_sources(repo, datasets):
    fields = ('id', 'name', 'version', 'licence', 'licenceUrl', 'credit', 'url')
    entries = ',\n'.join('  ' + json.dumps({k: d[k] for k in fields}, ensure_ascii=False) for d in datasets)
    path = repo / 'src/data/food-data-sources.ts'
    path.write_text('// Generated by scripts/library/export_tables.py from library.dataset; do not edit by hand.\n'
                    '// Credit lines are the attribution the licences ask for, shown as written, with a link to each licence.\n'
                    'export type FoodDataSource = { id: string; name: string; version: string; licence: string; licenceUrl: string; '
                    'credit: string; url: string };\n\n'
                    f'export const foodDataSources: readonly FoodDataSource[] = [\n{entries},\n];\n', encoding='utf-8')
    print(f'{path}: {len(datasets)} datasets')


def main(repo, container='quintaste-dev-db'):
    repo, today = Path(repo), dt.date.today().isoformat()
    card, datasets = cards(container), sources(container)
    # The bots' table first: recipe-table keys it gains are then found by the app table's record lookup too.
    bot_table(repo, card, datasets, today)
    app_figures(repo, card, datasets, today)
    data_sources(repo, datasets)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
