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
  5. AI judges the review pairs into R/decisions*.csv (same / different, written rule in the brief)
  6. assemble.py prepare       final merges; R/names-in-*.jsonl
  7. AI names every food into R/names-out-*.jsonl (English and Simplified Chinese)
  8. assemble.py write         clean layer CSVs
  9. load.py B --container ... then values.sql, seed.py and verify.sql against the database
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
# id, name, version, licence, credit line (empty when the licence asks for none), page, files read, reader
DATASETS = (
    ('usda-sr', 'USDA FoodData Central SR Legacy', '2018-04', 'Public domain (CC0)', '',
     'https://fdc.nal.usda.gov/download-datasets', '.local/nutrition/datasets/usda/FoodData_Central_sr_legacy_food_csv_2018-04',
     lambda p: read_fdc_csv(p, 'usda-sr')),
    ('usda-foundation', 'USDA FoodData Central Foundation Foods', '2026-10-29', 'Public domain (CC0)', '',
     'https://fdc.nal.usda.gov/download-datasets', f'{LIB}/usda-foundation/j', read_foundation_json),
    ('usda-fndds', 'USDA Food and Nutrient Database for Dietary Studies 2021-2023', '2024-10-31', 'Public domain (CC0)', '',
     'https://fdc.nal.usda.gov/download-datasets', f'{LIB}/usda-fndds/x/FoodData_Central_survey_food_csv_2024-10-31',
     lambda p: read_fdc_csv(p, 'usda-fndds')),
    ('taiwan-fda', 'Taiwan FDA Food Nutrient Database', '2026-10', 'Open Government Data License, version 1.0',
     'Taiwan Food and Drug Administration, Food Nutrient Database', 'https://data.gov.tw/en/datasets/8543',
     '.local/nutrition/datasets/taiwan/20_2.csv', read_taiwan),
    ('japan-mext', 'Standard Tables of Food Composition in Japan, 8th revised edition, 2023 supplement', '2026-03-27',
     'Government of Japan Standard Terms of Use 2.0 (compatible with CC BY 4.0)',
     'MEXT, Standard Tables of Food Composition in Japan 2020 (Eighth Revised Edition), 2023 supplement; processed by QuinTaste',
     'https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html', f'{LIB}/japan-mext', read_japan),
    ('canada-cnf', 'Canadian Nutrient File', '2015', 'Health Canada terms: free use with acknowledgement',
     'Health Canada, Canadian Nutrient File 2015',
     'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data.html',
     f'{LIB}/canada-cnf/x', read_canada),
    ('uk-cofid', "McCance and Widdowson's Composition of Foods Integrated Dataset", '2021', 'Open Government Licence v3.0',
     "Public Health England, McCance and Widdowson's Composition of Foods Integrated Dataset 2021",
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
        for did, name, version, licence, credit, url, rel, reader in DATASETS:
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
            dataset_rows.append([did, name, version, licence, credit, url, fetched, sha, count])
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
