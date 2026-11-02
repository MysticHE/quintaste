"""Merge the same food across datasets into one library food (docs/AI_FOOD_LIBRARY_PLAN.md §2, matching).

Two foods from different datasets are the same food when they share the library group and state, their names say the
same thing (after synonyms and plurals) and their main figures agree. A food joins at most one food per other dataset,
only as each other's best match, and a merged food never holds two foods of one dataset (those are distinct foods).
  same   names and figures agree: merged.
  review names or figures only partly agree: written to review.csv for a judgement, not merged.
Reads the build folder (foods, values, classified, duplicates); writes clusters.csv (cluster, dataset, id) and review.csv.
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dedupe import SIGNATURE  # noqa: E402

STOP = set('and or with without of the a an in on all types type varieties variety commercial regular prepared plain whole '
           'includes including form style mature usda nfs ns made from added salt unsalted salted fresh raw cooked boiled '
           'drained dried dry canned frozen fried roasted baked steamed solids liquids liquid edible portion only weighed'.split())
SYNONYMS = {'aubergine': 'eggplant', 'brinjal': 'eggplant', 'courgette': 'zucchini', 'capsicum': 'sweetpepper',
            'cilantro': 'coriander', 'garbanzo': 'chickpea', 'soya': 'soy', 'soybean': 'soy', 'yoghurt': 'yogurt',
            'yogourt': 'yogurt', 'swede': 'rutabaga', 'beetroot': 'beet', 'mangetout': 'snowpea', 'maize': 'corn',
            'groundnut': 'peanut', 'prawn': 'shrimp', 'spring': 'green', 'scallion': 'greenonion', 'beancurd': 'tofu',
            'curd': 'tofu', 'aubergines': 'eggplant', 'chilli': 'chili', 'chile': 'chili', 'okras': 'okra'}
_WORD = re.compile(r'[a-z]+')


def tokens(name):
    out = set()
    for word in _WORD.findall(name.lower()):
        if word.endswith('ies') and len(word) > 4:
            word = word[:-3] + 'y'
        elif word.endswith('oes') and len(word) > 4:
            word = word[:-2]
        elif word.endswith('s') and not word.endswith('ss') and len(word) > 3:
            word = word[:-1]
        word = SYNONYMS.get(word, word)
        if word not in STOP and len(word) > 1:
            out.add(word)
    return out


def distance(a, b, least=3):
    """Mean relative difference of the main figures both foods have (0 = same), or None with fewer than `least`."""
    floors = {'kcal': 20, 'protein': 1.5, 'fat': 1.5, 'carbs': 3, 'water': 4}
    parts = [abs(a[k] - b[k]) / max(a[k], b[k], floors[k]) for k in floors if k in a and k in b]
    return sum(parts) / len(parts) if parts and len(parts) >= least else None


def load(build):
    dup = {(r[0], r[1]) for r in csv.reader(open(build / 'duplicates.csv', encoding='utf-8'))}
    foods = {}
    for d, i, kind, group, diet, state, why, _ in csv.reader(open(build / 'classified.csv', encoding='utf-8')):
        if kind != 'excluded' and (d, i) not in dup:
            foods[(d, i)] = {'kind': kind, 'group': group, 'state': state}
    for d, i, n, *_ in csv.reader(open(build / 'foods.csv', encoding='utf-8')):
        if (d, i) in foods:
            foods[(d, i)]['name'] = json.loads(n).get('en', '')
    figures = defaultdict(dict)
    for d, i, key, value, _ in csv.reader(open(build / 'values.csv', encoding='utf-8')):
        if (d, i) in foods and key in SIGNATURE:
            figures[(d, i)][key] = float(value)
    for key, food in foods.items():
        food['tokens'], food['figures'] = tokens(food.get('name', '')), figures[key]
    return foods


def best_matches(foods):
    blocks = defaultdict(list)
    for key, food in foods.items():
        if food['tokens']:
            blocks[(food['kind'], food['group'], food['state'])].append(key)
    best = {}
    for members in blocks.values():
        index = defaultdict(set)
        for key in members:
            for t in foods[key]['tokens']:
                index[t].add(key)
        for key in members:
            a = foods[key]
            seen = set().union(*(index[t] for t in a['tokens'])) - {key}
            for other in seen:
                if other[0] == key[0]:
                    continue
                b = foods[other]
                jac = len(a['tokens'] & b['tokens']) / len(a['tokens'] | b['tokens'])
                dist = distance(a['figures'], b['figures'])
                if dist is None or jac < 0.34:
                    continue
                score = 0.6 * jac + 0.4 * (1 - min(dist, 1))
                slot = (key, other[0])
                if slot not in best or score > best[slot][0]:
                    best[slot] = (score, other, jac, dist)
    return best


def cluster(build):
    foods = load(build)
    best = best_matches(foods)
    parent = {k: k for k in foods}
    members = {k: {k[0]: k} for k in foods}

    def root(k):
        while parent[k] != k:
            parent[k] = parent[parent[k]]
            k = parent[k]
        return k

    same, review = [], []
    for (key, _), (score, other, jac, dist) in sorted(best.items(), key=lambda t: -t[1][0]):
        back = best.get((other, key[0]))
        if not back or back[1] != key or key > other:
            continue
        if jac >= 0.5 and dist <= 0.15:
            ra, rb = root(key), root(other)
            if ra != rb and not set(members[ra]) & set(members[rb]):
                parent[rb] = ra
                members[ra].update(members.pop(rb))
                same.append((key, other))
                continue
        review.append((key, other, round(jac, 2), round(dist, 2)))
    with open(build / 'clusters.csv', 'w', encoding='utf-8', newline='') as handle:
        out = csv.writer(handle)
        for key in sorted(foods):
            r = root(key)
            out.writerow([f'{r[0]}:{r[1]}', *key])
    with open(build / 'review.csv', 'w', encoding='utf-8', newline='') as handle:
        out = csv.writer(handle)
        for a, b, jac, dist in review:
            out.writerow([*a, foods[a]['name'], *b, foods[b]['name'], foods[a]['group'], foods[a]['state'], jac, dist])
    clusters = defaultdict(int)
    for key in foods:
        clusters[root(key)] += 1
    print(f'foods {len(foods)}, merged pairs {len(same)}, library foods {len(clusters)}, '
          f'multi-source {sum(1 for v in clusters.values() if v > 1)}, review pairs {len(review)}')


if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    cluster(Path(sys.argv[1] if len(sys.argv) > 1 else '.local/library/build'))
