"""Load the normalised layer built by scripts/library/build.py into library.* (server/library/schema.sql).

Replaces each built dataset's foods and values in one transaction. Datasets not in the build are left alone. When the
clean layer has been assembled (scripts/library/assemble.py write), the same transaction also replaces library.food,
food_source, alias and source_food.left_out, rebuilds the figures (values.sql) and relinks the kitchen layer (seed.py), so
readers never see foods without figures or kitchen keys without a food.

Local development database (Docker container quintaste-dev-db):
  python -I scripts/library/load.py .local/library/build --container quintaste-dev-db --user quintaste --db quintaste
"""
import argparse
import csv
import io
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from seed import statements  # noqa: E402

FILES = ('datasets', 'nutrients', 'foods', 'values')
CLEAN = ('food', 'food_source', 'alias', 'left_out')
SQL = r"""
CREATE TEMP TABLE s_dataset (id text, name text, version text, licence text, licence_url text, credit text, url text, fetched date,
  sha256 text, foods integer) ON COMMIT DROP;
CREATE TEMP TABLE s_nutrient (key text, name text, unit text, grp text, position smallint) ON COMMIT DROP;
CREATE TEMP TABLE s_food (dataset text, source_id text, names jsonb, aliases jsonb, category text, refuse_pct numeric,
  flags text[], description text) ON COMMIT DROP;
CREATE TEMP TABLE s_value (dataset text, source_id text, nutrient text, value numeric, quality text) ON COMMIT DROP;
\copy s_dataset FROM '{dir}/datasets.csv' WITH (FORMAT csv, FORCE_NOT_NULL (credit))
\copy s_nutrient FROM '{dir}/nutrients.csv' WITH (FORMAT csv)
\copy s_food FROM '{dir}/foods.csv' WITH (FORMAT csv, FORCE_NOT_NULL (category, description))
\copy s_value FROM '{dir}/values.csv' WITH (FORMAT csv)
INSERT INTO library.nutrient (key, name, unit, grp, position) SELECT * FROM s_nutrient
  ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit, grp = EXCLUDED.grp, position = EXCLUDED.position;
INSERT INTO library.dataset (id, name, version, licence, licence_url, credit, url, fetched, sha256, foods) SELECT * FROM s_dataset
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, version = EXCLUDED.version, licence = EXCLUDED.licence,
    licence_url = EXCLUDED.licence_url, credit = EXCLUDED.credit, url = EXCLUDED.url, fetched = EXCLUDED.fetched, sha256 = EXCLUDED.sha256,
    foods = EXCLUDED.foods, loaded_at = now();
DELETE FROM library.source_food f WHERE f.dataset IN (SELECT id FROM s_dataset)
  AND NOT EXISTS (SELECT 1 FROM s_food s WHERE s.dataset = f.dataset AND s.source_id = f.source_id);
INSERT INTO library.source_food (dataset, source_id, names, aliases, category, refuse_pct, flags, description)
  SELECT * FROM s_food ON CONFLICT (dataset, source_id) DO UPDATE SET names = EXCLUDED.names, aliases = EXCLUDED.aliases,
    category = EXCLUDED.category, refuse_pct = EXCLUDED.refuse_pct, flags = EXCLUDED.flags, description = EXCLUDED.description;
DELETE FROM library.source_value WHERE dataset IN (SELECT id FROM s_dataset);
INSERT INTO library.source_value (dataset, source_id, nutrient, value, quality) SELECT * FROM s_value;
SELECT d.id, d.foods, (SELECT count(*) FROM library.source_food f WHERE f.dataset = d.id) AS loaded,
  (SELECT count(*) FROM library.source_value v WHERE v.dataset = d.id) AS figures FROM library.dataset d ORDER BY d.id;
"""
CLEAN_SQL = r"""
CREATE TEMP TABLE s_fd (key text, name_en text, name_zh text, kind text, category text, diet text, state text) ON COMMIT DROP;
CREATE TEMP TABLE s_fs (dataset text, source_id text, food text, role text) ON COMMIT DROP;
CREATE TEMP TABLE s_al (lang text, alias text, food text) ON COMMIT DROP;
CREATE TEMP TABLE s_lo (dataset text, source_id text, reason text) ON COMMIT DROP;
\copy s_fd FROM '{dir}/food.csv' WITH (FORMAT csv, FORCE_NOT_NULL (state))
\copy s_fs FROM '{dir}/food_source.csv' WITH (FORMAT csv)
\copy s_al FROM '{dir}/alias.csv' WITH (FORMAT csv)
\copy s_lo FROM '{dir}/left_out.csv' WITH (FORMAT csv)
-- Deleting foods removes their sources, figures and aliases and unlinks kitchen ingredients; values.sql and the seed
-- statements that follow in this transaction put them back.
DELETE FROM library.food;
INSERT INTO library.food (key, name_en, name_zh, kind, category, diet, state) SELECT * FROM s_fd;
INSERT INTO library.food_source (dataset, source_id, food, role) SELECT * FROM s_fs;
INSERT INTO library.alias (lang, alias, food) SELECT DISTINCT lang, alias, food FROM s_al;
UPDATE library.source_food SET left_out = '' WHERE left_out <> '';
UPDATE library.source_food f SET left_out = s.reason FROM s_lo s WHERE s.dataset = f.dataset AND s.source_id = f.source_id;
SELECT kind, count(*) FROM library.food GROUP BY kind ORDER BY kind;
"""


def query(container, sql):
    """Rows of a query run in the local database container, as lists of text."""
    out = subprocess.run(['docker', 'exec', container, 'psql', '-U', 'quintaste', '-d', 'quintaste', '-X', '-q', '-c',
                          f'COPY ({sql}) TO STDOUT WITH (FORMAT csv)'], capture_output=True, check=True)
    return list(csv.reader(io.StringIO(out.stdout.decode('utf-8'))))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('build')
    parser.add_argument('--container', required=True)
    parser.add_argument('--user', required=True)
    parser.add_argument('--db', required=True)
    args = parser.parse_args()
    build, target = Path(args.build), '/tmp/library-build'
    for name in FILES:
        if not (build / f'{name}.csv').is_file():
            raise SystemExit(f'missing {name}.csv in {build}; run scripts/library/build.py first')
    clean = all((build / f'{name}.csv').is_file() for name in CLEAN)
    subprocess.run(['docker', 'exec', args.container, 'mkdir', '-p', target], check=True)
    for name in FILES + (CLEAN if clean else ()):
        subprocess.run(['docker', 'cp', str(build / f'{name}.csv'), f'{args.container}:{target}/{name}.csv'], check=True)
    after = ''
    if clean:
        after = CLEAN_SQL + (HERE / 'values.sql').read_text(encoding='utf-8') + '\n' + '\n'.join(statements(HERE.parents[1])) + '\n'
    script = '\\set ON_ERROR_STOP on\nBEGIN;\n' + SQL + after + 'COMMIT;\n'
    try:
        subprocess.run(['docker', 'exec', '-i', args.container, 'psql', '-U', args.user, '-d', args.db, '-q', '-X'],
                       input=script.replace('{dir}', target), text=True, check=True)
    finally:
        subprocess.run(['docker', 'exec', args.container, 'rm', '-rf', target], check=True)


if __name__ == '__main__':
    main()
