"""Build the food library's normalised layer from the downloaded datasets (docs/AI_FOOD_LIBRARY_PLAN.md §1-2).

The downloaded files are the raw layer: kept unchanged under .local, with their SHA-256 recorded. This writes the
normalised layer as CSV files for scripts/library/load.py, plus a coverage report:
  datasets.csv, nutrients.csv, foods.csv, values.csv, report.json

Run: python -I scripts/library/build.py <repository root> <output folder>

The whole pipeline, in order (B = .local/library/build, R = .local/library/review):
  1. build.py . B              normalised layer
  2. classify.py B             library kind, group, diet and state; what is left out and why
  3. dedupe.py B               records that copy another record
  4. cluster.py B              strict merges across datasets; partly agreeing pairs to B/review.csv
  5. AI judges the review pairs into R/decisions-by-ref.csv (same / different, written rule in the brief)
  6. assemble.py groups        final merges, audit and figure check; R/names-in-pending.jsonl for groups with no name
  7. AI names those foods into R/names-out-*.jsonl (English and Simplified Chinese)
  8. assemble.py repeats       foods named alike merged or listed to be named apart
  9. assemble.py write         clean layer CSVs (keys kept from R/food-keys.csv)
 10. load.py B --container ... loads everything, rebuilds the figures (values.sql) and the kitchen layer (seed.py) in one
                               transaction; then verify.sql
 11. export_tables.py .        the app's and the bots' nutrition tables and the data sources page
"""
import csv
import datetime as dt
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checks import check  # noqa: E402
from nutrients import NUTRIENTS, QUALITIES  # noqa: E402
from readers_asia import read_japan, read_taiwan  # noqa: E402
from readers_usda import read_fdc_csv, read_foundation_json  # noqa: E402
from readers_west import read_canada, read_uk  # noqa: E402

LIB = '.local/library/datasets'
# id, name, version, licence, licence page, credit line (the attribution each licence asks for, shown as written on the app's
# data sources page; checked 2 Nov 2026), dataset page, files, reader.
OGL_UK = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
DATASETS = (
    ('usda-sr', 'USDA FoodData Central SR Legacy', '2018-04', 'Public domain (CC0)', 'https://creativecommons.org/publicdomain/zero/1.0/',
     '', 'https://fdc.nal.usda.gov/download-datasets', '.local/nutrition/datasets/usda/FoodData_Central_sr_legacy_food_csv_2018-04',
     lambda p: read_fdc_csv(p, 'usda-sr')),
    ('usda-foundation', 'USDA FoodData Central Foundation Foods', '2026-10-29', 'Public domain (CC0)',
     'https://creativecommons.org/publicdomain/zero/1.0/', '', 'https://fdc.nal.usda.gov/download-datasets', f'{LIB}/usda-foundation/j',
     read_foundation_json),
    ('usda-fndds', 'USDA Food and Nutrient Database for Dietary Studies 2021-2023', '2024-10-31', 'Public domain (CC0)',
     'https://creativecommons.org/publicdomain/zero/1.0/', '', 'https://fdc.nal.usda.gov/download-datasets',
     f'{LIB}/usda-fndds/x/FoodData_Central_survey_food_csv_2024-10-31', lambda p: read_fdc_csv(p, 'usda-fndds')),
    # The licence's own attribution statement (Exhibit): provider, year, release name; then the release notice.
    ('taiwan-fda', 'Taiwan FDA Food Nutrient Database', '2026-10', 'Open Government Data License, version 1.0', 'https://data.gov.tw/license',
     'Taiwan Food and Drug Administration 2026, Food Nutrient Database. The Open Data is made available to the public under the '
     'Open Government Data License; adapted by QuinTaste.', 'https://data.gov.tw/en/datasets/8543',
     '.local/nutrition/datasets/taiwan/20_2.csv', read_taiwan),
    # MEXT website terms (based on the Public Data License 1.0): name the source and say separately that it was edited.
    ('japan-mext', 'Standard Tables of Food Composition in Japan, 8th revised edition, 2023 supplement', '2026-03-27',
     'MEXT website terms of use (Public Data License 1.0)', 'https://www.mext.go.jp/b_menu/1351168.htm',
     'Source: MEXT, Standard Tables of Food Composition in Japan 2020 (Eighth Revised Edition), 2023 supplement '
     '(https://www.mext.go.jp/); edited and processed by QuinTaste.',
     'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html', f'{LIB}/japan-mext', read_japan),
    # The dataset page names the Open Government Licence – Canada, which allows adapting with its attribution statement.
    ('canada-cnf', 'Canadian Nutrient File', '2015', 'Open Government Licence – Canada', 'https://open.canada.ca/en/open-government-licence-canada',
     'Contains information licensed under the Open Government Licence – Canada. Canadian Nutrient File, Health Canada, 2015; '
     'adapted by QuinTaste.', 'https://open.canada.ca/data/en/dataset/089885f9-ed53-44e6-854a-14d21a1ec2e0',
     f'{LIB}/canada-cnf/x', read_canada),
    ('uk-cofid', "McCance and Widdowson's Composition of Foods Integrated Dataset", '2021', 'Open Government Licence v3.0', OGL_UK,
     "Contains public sector information licensed under the Open Government Licence v3.0. McCance and Widdowson's Composition of "
     'Foods Integrated Dataset 2021, Public Health England; adapted by QuinTaste.',
     'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid',
     f'{LIB}/uk-cofid/cofid2021.xlsx', read_uk),
)


def digest(path):
    """SHA-256 over a file, or over every file of a folder in name order, plus the newest modification date."""
    path, sha = Path(path), hashlib.sha256()
    files = sorted(p for p in path.rglob('*') if p.is_file()) if path.is_dir() else [path]
    for file in files:
        sha.update(file.name.encode())
        sha.update(file.read_bytes())
    newest = max(f.stat().st_mtime for f in files)
    return sha.hexdigest(), dt.date.fromtimestamp(newest).isoformat()


def pg_array(items):
    return '{' + ','.join('"' + i.replace('"', '\\"') + '"' for i in items) + '}'


def build(repo, out):
    repo, out = Path(repo), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    report, dataset_rows = {}, []
    with open(out / 'foods.csv', 'w', encoding='utf-8', newline='') as fh, \
            open(out / 'values.csv', 'w', encoding='utf-8', newline='') as vh:
        foods_csv, values_csv = csv.writer(fh), csv.writer(vh)
        for did, name, version, licence, licence_url, credit, url, rel, reader in DATASETS:
            sha, fetched = digest(repo / rel)
            count, coverage, flags = 0, Counter(), Counter()
            for food in reader(str(repo / rel)):
                food_flags = check(food)
                if not food['values']:
                    continue
                count += 1
                flags.update(f.split(':')[0] if f.startswith('dropped') else f for f in food_flags)
                foods_csv.writerow([did, food['id'], json.dumps(food['names'], ensure_ascii=False),
                                    json.dumps(food['aliases'], ensure_ascii=False), food['category'],
                                    '' if food['refuse'] is None else food['refuse'], pg_array(food_flags), food.get('description', '')])
                for key, (value, quality) in food['values'].items():
                    assert quality in QUALITIES, quality
                    values_csv.writerow([did, food['id'], key, round(value, 6), quality])
                    coverage[key] += 1
            dataset_rows.append([did, name, version, licence, licence_url, credit, url, fetched, sha, count])
            report[did] = {'foods': count, 'flags': dict(flags),
                           'coverage': {k: round(100 * coverage[k] / count, 1) if count else 0 for k, *_ in NUTRIENTS}}
            print(f'{did}: {count} foods', file=sys.stderr)
    with open(out / 'datasets.csv', 'w', encoding='utf-8', newline='') as handle:
        csv.writer(handle).writerows(dataset_rows)
    with open(out / 'nutrients.csv', 'w', encoding='utf-8', newline='') as handle:
        csv.writer(handle).writerows([key, title, unit, group, i + 1] for i, (key, unit, group, title) in enumerate(NUTRIENTS))
    (out / 'report.json').write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding='utf-8')
    return report


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    build(sys.argv[1], sys.argv[2])
