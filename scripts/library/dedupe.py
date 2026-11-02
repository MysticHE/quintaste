"""Find copied records before the library counts sources (docs/AI_FOOD_LIBRARY_PLAN.md §2, duplicates).

A copy is not an independent measurement, so it must not count twice when sources agree. Two kinds:
  copy      Canada CNF or FNDDS food whose key figures equal a USDA SR Legacy food's (CNF imported many USDA records).
  repeat    a food that repeats another food of the same dataset: same figures and the same name once normalised.
Reads foods.csv, values.csv and classified.csv from the build folder; writes duplicates.csv (dataset, id, of dataset,
of id, kind) and prints counts.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

SIGNATURE = ('kcal', 'protein', 'fat', 'carbs', 'water', 'calcium', 'iron')


def words(name):
    return set(re.findall(r'[a-z]+', name.lower()))


def norm(name):
    return ' '.join(sorted(words(name)))


def load(build):
    kept, names = {}, {}
    for d, i, kind, *_ in csv.reader(open(build / 'classified.csv', encoding='utf-8')):
        if kind != 'excluded':
            kept[(d, i)] = kind
    for d, i, n, *_ in csv.reader(open(build / 'foods.csv', encoding='utf-8')):
        if (d, i) in kept:
            n = json.loads(n)
            names[(d, i)] = n.get('en') or n.get('zh-Hant') or n.get('ja') or ''
    figures = defaultdict(dict)
    for d, i, key, value, _ in csv.reader(open(build / 'values.csv', encoding='utf-8')):
        if (d, i) in kept and key in SIGNATURE:
            figures[(d, i)][key] = round(float(value), 2)
    return kept, names, figures


def signature(f):
    if not all(k in f for k in ('kcal', 'protein', 'fat')):
        return None
    return tuple(f.get(k) for k in SIGNATURE)


def find(build):
    kept, names, figures = load(build)
    by_sig = defaultdict(list)
    for food in kept:
        sig = signature(figures.get(food, {}))
        if sig:
            by_sig[sig].append(food)
    found, copied = [], set()
    for sig, foods in by_sig.items():
        sr = [f for f in foods if f[0] == 'usda-sr']
        for food in foods:
            if food[0] in ('canada-cnf', 'usda-fndds') and sr:
                best = max(sr, key=lambda s: len(words(names[s]) & words(names[food])))
                found.append((*food, *best, 'copy'))
                copied.add(food)
        firsts = {}
        for food in sorted(foods):
            key = (food[0], norm(names[food]))
            if key in firsts and food not in copied:
                found.append((*food, *firsts[key], 'repeat'))
                copied.add(food)
            firsts.setdefault(key, food)
    return found


if __name__ == '__main__':
    build = Path(sys.argv[1] if len(sys.argv) > 1 else '.local/library/build')
    rows = find(build)
    with open(build / 'duplicates.csv', 'w', encoding='utf-8', newline='') as handle:
        csv.writer(handle).writerows(rows)
    counts = defaultdict(int)
    for row in rows:
        counts[(row[0], row[4])] += 1
    print(dict(counts))
