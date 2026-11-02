"""Assemble the clean layer (library.food, food_source, alias) from the build (docs/AI_FOOD_LIBRARY_PLAN.md §1-2).

Every judgement is stored against dataset records ("dataset:id"), never against row numbers, so a rebuild keeps the
work already done and only new questions go to AI:
  review/decisions-by-ref.csv  a, b, decision, reason   same/different for pairs cluster.py could not decide
  review/audit-out.csv         cid, ref, reason         records the name audit found in the wrong group
  review/names-out-*.jsonl     {cid, en, zh, aliasesEn, aliasesZh}; cid is the record the group was named after
  review/manual.json           {"merge": [[ref, ...]], "separate": [ref, ...], "rename": {ref: [en, zh]},
                               "set": {ref: {kind, group, diet, state}}}   settled by hand and by the audits
  review/food-keys.csv         ref, key   the key each record's food had, so keys stay with their food across rebuilds
Steps:
  groups   strict merges + "same" decisions, the audit, the figure check and the manual merges -> final-clusters.csv;
           writes review/pending-pairs.jsonl (pairs with no decision) and review/names-in-pending.jsonl (groups with
           no name). Run again after AI has answered them.
  repeats  foods named the same: merged when their figures agree; listed in review/names-in-rename.jsonl otherwise.
  write    the clean CSV files for load.py: food.csv, food_source.csv, alias.csv, left_out.csv.
Run: python -I scripts/library/assemble.py groups|repeats|write [build folder] [review folder]
"""
import csv
import glob
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cluster import distance, tokens  # noqa: E402
from classify import STATES  # noqa: E402
from nutrients import slug  # noqa: E402


def name_state(name):
    """The state an English name states (raw, cooked, fried...), or '' when it states none."""
    return next((state for state, pattern in STATES if pattern.search(name)), '')

DIET_ORDER = ('meat', 'seafood', 'egg', 'dairy', 'honey', 'unknown', 'plant')  # when records disagree, the stricter wins
KIND_ORDER = ('dish', 'animal', 'ingredient')
MAIN = ('kcal', 'protein', 'fat', 'carbs', 'carbsAvailable', 'fibre', 'water', 'sodium')
# UK records "weighed with skin and bones" give figures per 100 g including what is not eaten.
WEIGHED = re.compile(r'weighed (?:with|whole|in)', re.I)
# Game that Singapore dishes never use (Canada's and the UK's game groups).
EXOTIC = re.compile(r'(?<![a-z])(?:seal|walrus|whale|beaver|muskrat|bear|caribou|moose|elk|squirrel|opossum|raccoon|'
                    r'bison|buffalo|antelope|deer|venison|rabbit|hare|frog|turtle|kangaroo|horse|emu|ostrich)(?![a-z])', re.I)


def read(path):
    with open(path, encoding='utf-8', newline='') as handle:
        yield from csv.reader(handle)


def ref(food):
    return f'{food[0]}:{food[1]}'


def unref(text):
    return tuple(text.split(':', 1))


class Groups:
    """Library foods as groups of records; a group's id is the ref of the record it is named after (its first)."""

    def __init__(self, rows):
        self.members = defaultdict(list)
        for cid, d, i in rows:
            self.members[cid].append((d, i))
        self.where = {f: cid for cid, foods in self.members.items() for f in foods}

    def datasets(self, cid):
        return {d for d, _ in self.members[cid]}

    def join(self, a, b, allow_same_dataset=False):
        """Moves b's records into a; refuses when both hold a record of one dataset (distinct foods there)."""
        if a == b or (not allow_same_dataset and self.datasets(a) & self.datasets(b)):
            return False
        for food in self.members.pop(b):
            self.members[a].append(food)
            self.where[food] = a
        return True

    def take_out(self, cid, foods):
        """Moves foods into their own group, named after the first of them; the rest keep (or inherit) the id."""
        rest = [f for f in self.members.pop(cid) if f not in foods]
        rest_cid = cid if unref(cid) in rest else ref(rest[0])
        self.members[rest_cid] = rest
        self.members[ref(foods[0])] = list(foods)
        for f in rest:
            self.where[f] = rest_cid
        for f in foods:
            self.where[f] = ref(foods[0])
        return rest_cid, ref(foods[0])

    def save(self, path):
        with open(path, 'w', encoding='utf-8', newline='') as handle:
            out = csv.writer(handle)
            for cid, foods in sorted(self.members.items()):
                for d, i in foods:
                    out.writerow([cid, d, i])


def figures_of(build, wanted=None):
    figures = defaultdict(dict)
    for d, i, key, value, _ in read(build / 'values.csv'):
        if key in MAIN and (wanted is None or (d, i) in wanted):
            figures[(d, i)][key] = float(value)
    for f in figures.values():
        if 'carbs' not in f and 'carbsAvailable' in f:
            f['carbs'] = f['carbsAvailable'] + f.get('fibre', 0)
    return figures


def salty_apart(a, b):
    return 'sodium' in a and 'sodium' in b and abs(a['sodium'] - b['sodium']) > max(150, 0.5 * max(a['sodium'], b['sodium']))


def median(values):
    values = sorted(values)
    n = len(values)
    return values[n // 2] if n % 2 else (values[n // 2 - 1] + values[n // 2]) / 2


def figure_check(groups, figures):
    """A record whose figures do not fit the rest of its food (the main figures it has within 20% of the median; sodium
    within 150 mg, or half the larger value) leaves it; when fewer than two records agree, the food is split into single
    records. A record sharing no main figure with the median cannot be compared and stays."""
    touched = set()
    for cid in [c for c, foods in groups.members.items() if len(foods) > 1]:
        foods = groups.members[cid]
        mid = {k: median([figures[f][k] for f in foods if k in figures[f]])
               for k in ('kcal', 'protein', 'fat', 'carbs', 'water', 'sodium') if any(k in figures[f] for f in foods)}
        apart = {f: distance(figures[f], mid, least=1) for f in foods}
        fits = [f for f in foods if (apart[f] is None or apart[f] <= 0.2) and not salty_apart(figures[f], mid)]
        if len(fits) < 2:
            fits = foods[:1]
        for f in [f for f in foods if f not in fits]:
            current = groups.where[f]
            touched.update(groups.take_out(current, [f]))
    return touched


def groups(build, review):
    g = Groups(read(build / 'clusters.csv'))
    decisions = {}
    if (review / 'decisions-by-ref.csv').is_file():
        for row in read(review / 'decisions-by-ref.csv'):
            if row[0] != 'a':
                decisions[frozenset((row[0], row[1]))] = row[2].strip()
    pending, merged = [], 0
    for row in read(build / 'review.csv'):
        a, b = (row[0], row[1]), (row[3], row[4])
        decision = decisions.get(frozenset((ref(a), ref(b))))
        if decision is None:
            pending.append(row)
        elif decision == 'same' and a in g.where and b in g.where:
            merged += g.join(g.where[a], g.where[b])
    # The name audit: records listed for one group and one reason leave together.
    leaving = defaultdict(list)
    if (review / 'audit-out.csv').is_file():
        for row in read(review / 'audit-out.csv'):
            if row[0] != 'cid' and len(row) > 2 and unref(row[1]) in g.where:
                leaving[(g.where[unref(row[1])], row[2].strip())].append(unref(row[1]))
    touched = set()
    for (cid, _), foods in sorted(leaving.items()):
        foods = [f for f in foods if g.where.get(f) == cid]
        if foods and len(foods) < len(g.members[cid]):
            touched.update(g.take_out(cid, foods))
    figures = figures_of(build)
    touched |= figure_check(g, figures)
    manual = json.loads((review / 'manual.json').read_text(encoding='utf-8')) if (review / 'manual.json').is_file() else {}
    for refs in manual.get('merge', []):
        foods = [unref(r) for r in refs if unref(r) in g.where]
        for f in foods[1:]:
            g.join(g.where[foods[0]], g.where[f], allow_same_dataset=True)
    # Records found in the wrong food by the dish and meat audit (a steamed fillet with raw ones) leave it.
    for r in manual.get('separate', []):
        food = unref(r)
        if food in g.where and len(g.members[g.where[food]]) > 1:
            g.take_out(g.where[food], [food])
    g.save(build / 'final-clusters.csv')
    write_pending(build, review, g, pending)
    print(f'decided merges {merged}; pairs without a decision {len(pending)}; library foods {len(g.members)}')


def write_pending(build, review, g, pending):
    names = {(r[0], r[1]): json.loads(r[2]) for r in read(build / 'foods.csv')}
    classes = {(r[0], r[1]): r[2:6] for r in read(build / 'classified.csv')}
    with open(review / 'pending-pairs.jsonl', 'w', encoding='utf-8') as handle:
        for row in pending:
            handle.write(json.dumps({'a': row[0] + ':' + row[1], 'aName': row[2], 'b': row[3] + ':' + row[4],
                                     'bName': row[5], 'group': row[6], 'state': row[7]}, ensure_ascii=False) + '\n')
    named = resolve_names(review, g)
    with open(review / 'names-in-pending.jsonl', 'w', encoding='utf-8') as handle:
        unnamed = 0
        for cid, foods in sorted(g.members.items()):
            if cid in named:
                continue
            unnamed += 1
            kind, group, _, state = settle([classes[f] for f in foods])
            line = {'cid': cid, 'kind': kind, 'group': group, 'state': state,
                    'en': sorted({names[f].get('en', '') for f in foods} - {''})}
            zh = sorted({names[f].get('zh-Hant', '') for f in foods} - {''})
            ja = sorted({names[f].get('ja', '') for f in foods} - {''})
            line.update({**({'zhTW': zh} if zh else {}), **({'ja': ja} if ja else {})})
            handle.write(json.dumps(line, ensure_ascii=False) + '\n')
    print(f'groups without a name {unnamed} (review/names-in-pending.jsonl)')


def name_items(review):
    """Every name ever given, by the ref it was given to; later passes win (pending > rename > split > first)."""
    def order(path):
        return 3 if 'pending' in path else 2 if 'rename' in path else 1 if 'split' in path else 0
    named = {}
    for path in sorted(glob.glob(str(review / 'names-out-*.jsonl')), key=order):
        for line in open(path, encoding='utf-8'):
            if line.strip():
                item = json.loads(line)
                if item.get('en', '').strip() and item.get('zh', '').strip():
                    named[item['cid']] = item
    manual = json.loads((review / 'manual.json').read_text(encoding='utf-8')) if (review / 'manual.json').is_file() else {}
    for r, (en, zh) in manual.get('rename', {}).items():
        named[r] = {'cid': r, 'en': en, 'zh': zh, 'aliasesEn': [], 'aliasesZh': []}
    return named


def resolve_names(review, g):
    """Group id -> name: the name given to the group's own id, else the name given to the first of its records that has
    one (a group whose first record moved keeps the name its records had)."""
    items, names = name_items(review), {}
    for cid, foods in g.members.items():
        item = items.get(cid) or next((items[ref(f)] for f in foods if ref(f) in items), None)
        if item is not None:
            names[cid] = item
    return names


def check_names(review):
    """Refuses names that drifted onto other foods: in every naming batch, a name must share a word with its source
    English names (Taiwan's odd English and spelling fixes leave a few misses, so up to 3% is allowed)."""
    for source in sorted(glob.glob(str(review / 'names-in-*.jsonl'))):
        target = source.replace('names-in-', 'names-out-')
        if 'rename' in source or not Path(target).is_file():
            continue
        named = {}
        for line in open(target, encoding='utf-8'):
            if line.strip():
                item = json.loads(line)
                named[item['cid']] = item
        checked = missed = 0
        for line in open(source, encoding='utf-8'):
            item = json.loads(line)
            words = set().union(*(tokens(e) for e in item.get('en', []))) if item.get('en') else set()
            got = tokens(named.get(item['cid'], {}).get('en', ''))
            if words and got:
                checked += 1
                missed += not (words & got)
        if checked and missed / checked > 0.03:
            raise SystemExit(f'{Path(target).name}: {missed} of {checked} names do not match their foods; rename that batch')


def repeats(build, review):
    """Foods with the same English name, kind and state. The same name from different countries' tables is the same food
    measured twice (merged; figures become medians, flagged where they spread). Within one table a repeated name with
    figures that differ means the name lost a qualifier: listed in review/names-in-rename.jsonl to be named apart."""
    check_names(review)
    g = Groups(read(build / 'final-clusters.csv'))
    named = resolve_names(review, g)
    missing = set(g.members) - set(named)
    if missing:
        raise SystemExit(f'{len(missing)} groups have no name; run groups and name review/names-in-pending.jsonl first')
    classes = {(r[0], r[1]): r for r in read(build / 'classified.csv')}
    figures = figures_of(build)
    # Three passes over the names: the exact English name; the same words after plurals and synonyms ("Raspberries, raw"
    # and "Raspberry, raw"); the same Chinese name ("Beef, mince, raw" and "Beef, ground, raw" are both 牛肉末（生）).
    keys = (lambda cid: named[cid]['en'].strip().lower(),
            lambda cid: ' '.join(sorted(tokens(named[cid]['en']))) or named[cid]['en'].lower(),
            lambda cid: re.sub(r'\s+', '', named[cid]['zh']))
    merged, apart, zh_apart = 0, [], []
    for step, key in enumerate(keys):
        groups_by = defaultdict(list)
        for cid in g.members:
            groups_by[key(cid)].append(cid)
        for cids in groups_by.values():
            first, rest = sorted(cids)[0], []
            for other in sorted(cids)[1:]:
                state_a, state_b = classes[g.members[first][0]][5], classes[g.members[other][0]][5]
                # Raw and cooked are different foods, whether the table or the final name says so ("fillet, raw" against
                # "fillet, steamed" have the same words once cooking words are set aside).
                named_a, named_b = name_state(named[first]['en']), name_state(named[other]['en'])
                if (state_a and state_b and state_a != state_b) or (named_a and named_b and named_a != named_b):
                    rest.append(other)
                    continue
                a, b = figures[g.members[first][0]], figures[g.members[other][0]]
                near = distance(a, b)
                if near is None:  # sparse records (some Foundation foods): compare the figures both have
                    both = [k for k in a if k in b and k != 'sodium']
                    near = max((abs(a[k] - b[k]) / max(a[k], b[k], 1) for k in both), default=0)
                countries_apart = not (g.datasets(first) & g.datasets(other))
                # Only the exact English name is strong enough to accept another country's figures 50% apart;
                # same words or the same Chinese name need figures within 25%.
                limit = 0.5 if step == 0 else 0.25
                if (countries_apart and near <= limit and not (step and salty_apart(a, b))) or (near <= 0.2 and not salty_apart(a, b)):
                    merged += g.join(first, other, allow_same_dataset=True)
                else:
                    rest.append(other)
            if rest and step == 0:
                apart.append([first, *rest])
            elif rest and step == 2:
                zh_apart.append([first, *rest])
    # Later passes may have merged foods an earlier pass set apart.
    apart = [k for k in ([c for c in grp if c in g.members] for grp in apart) if len(k) > 1]
    zh_apart = [k for k in ([c for c in grp if c in g.members] for grp in zh_apart) if len(k) > 1]
    g.save(build / 'final-clusters.csv')
    with open(review / 'names-in-zh.jsonl', 'w', encoding='utf-8') as handle:
        for group in zh_apart:
            handle.write(json.dumps({'foods': [{'cid': cid, 'en': named[cid]['en'], 'zh': named[cid]['zh']} for cid in group]},
                                    ensure_ascii=False) + '\n')
    print(f'{len(zh_apart)} groups of different foods share a Chinese name (review/names-in-zh.jsonl)')
    names = {(r[0], r[1]): json.loads(r[2]) for r in read(build / 'foods.csv')}
    manual = json.loads((review / 'manual.json').read_text(encoding='utf-8')) if (review / 'manual.json').is_file() else {}
    settled = set(manual.get('rename', {}))
    left = [group for group in apart if not all(c in settled or unref(c) in {unref(r) for r in settled} for c in group)]
    with open(review / 'names-in-rename.jsonl', 'w', encoding='utf-8') as handle:
        for group in left:
            handle.write(json.dumps({'foods': [{
                'cid': cid, 'currentName': named[cid]['en'], 'currentZh': named[cid]['zh'],
                'sourceNames': sorted({n for f in g.members[cid] for n in names[f].values()}),
                'per100g': {k: round(v, 1) for k, v in figures[g.members[cid][0]].items()}} for cid in group]},
                ensure_ascii=False) + '\n')
    print(f'merged {merged} repeats; {len(left)} groups still to name apart; library foods {len(g.members)}')


_NOT_ANIMAL = re.compile(r'egg-free|eggless|eggplant|egg fruit|egg plant|non-dairy|dairy-free|milkfish|fish mint|'
                         r'butternut|butterhead|butter bean|butterbur|cream of tartar|honeydew|vegetarian|vegan|plant-based|'
                         r'imitation|meatless|(?:soy|soya|almond|oat|rice|coconut|peanut|cashew|nut|plant|cocoa|shea|apple|'
                         r'seed|sesame) (?:milk|butter|cream|yogurt|cheese|drink|beverage)', re.I)
_W = lambda words: re.compile(r'(?<![a-z])(?:' + words + r')(?![a-z])', re.I)  # noqa: E731
NAME_DIETS = (
    ('meat', _W(r'pork|beef|chicken|turkey|duck|lamb|mutton|ham|bacon|sausages?|lard|tallow|gelatin|meat|liver')),
    ('seafood', _W(r'fish|dashi|anchov(?:y|ies)|shrimps?|prawns?|crab|clams?|oysters?|squid|bonito|tuna|salmon|sardines?')),
    ('egg', _W(r'eggs?|egg yolk|egg white|mayonnaise|custard')),
    ('dairy', _W(r'milk|cheese|butter|cream|yogh?urt|ghee|whey|casein|paneer|buttermilk|kefir')),
)


# Chain fast-food items (the UK table has a few): a brand's recipe, not a food people cook with or photograph generically.
CHAIN = re.compile(r"Big Mac|Quarter Pounder|Whopper|McDonald|Burger King|KFC|Kentucky Fried|Subway|Pizza Hut|Domino|"
                   r"Taco Bell|Wendy's|George Weston|Thomas'|Mars bar|Twix|Snickers|Reese|Kit ?Kat|Bounty|Milky Way", re.I)
NOODLES = re.compile(r'(?<![a-z])(?:noodles?|udon|soba|ramen|vermicelli|macaroni|spaghetti|pasta)(?![a-z])', re.I)


# Prepared baked goods that dataset groups file under cereals, sugars or vegetables: dishes, not ingredients. Flours, mixes,
# mochi, fu, pastry for baking and fruit varieties named "tart" or "pie" stay ingredients.
BAKED = re.compile(r'(?<![a-z])(?:waffles?|pancakes?|cakes?|biscuits?|cookies?|muffins?|scones?|pies?|pastries|buns?|'
                   r'doughnuts?|croissants?|brownies?|tarts?|crumble|flapjacks?)(?![a-z])', re.I)
NOT_BAKED = re.compile(r"flour|\bmix\b|premix|mochi|rice cake|glutinous cake|\bfu\b|wheat gluten|cherr|pumpkin, pie|pie mix|"
                       r"for crispy duck|^pastry|shepherd's purse|cereal", re.I)
SAVOURY = re.compile(r'shepherd|lentil|vegetable|mycoprotein|potato|cheese', re.I)
# Basic sweeteners and cocoa that some tables file under sweets: ingredients.
SWEETENER = re.compile(r'^(?:honey|maple syrup|molasses|treacle|golden syrup|agave|sugars?|sugar, |syrup, (?:corn|maple|cane)|'
                       r'cocoa(?:,)? powder|cocoa, dry|jam|marmalade|jelly, fruit)', re.I)
MEAT_DISH = re.compile(r'(?<![a-z])(?:pies?|curry|stew|casserole|sandwich|soup|burger|lasagne|lasagna|pizza|bolognese|kebab|'
                       r'pasty|pasties|risotto|biryani|chilli con carne|moussaka|hotpot|goulash|stir-fried with|'
                       r'with (?:rice|vegetables|potato|sauce|gravy|noodles|pasta|dumplings))(?![a-z])', re.I)
# Pastry made the British way usually has butter or lard; only filo is reliably plant.
PASTRY = re.compile(r'(?<![a-z])pastry(?![a-z])', re.I)


def name_diet(name):
    """The strictest diet the final English name itself states ("Noodles, egg" is egg, "Greek yogurt" dairy), or
    'plant' when it states none. Only ever makes a food's diet stricter."""
    text = _NOT_ANIMAL.sub(' ', name)
    return next((diet for diet, pattern in NAME_DIETS if pattern.search(text)), 'plant')


def settle(classes):
    """One kind, group, diet and state for a merged food."""
    # The kind most records give; on a tie, ingredient over dish over animal (honey filed as "sweets" in one table is
    # still an ingredient).
    votes = Counter(c[0] for c in classes)
    kind = max(votes, key=lambda k: (votes[k], -('ingredient', 'dish', 'animal').index(k)))
    group = Counter(c[1] for c in classes if c[0] == kind).most_common(1)[0][0]
    diet = min((c[2] or 'unknown' for c in classes), key=DIET_ORDER.index)
    state = Counter(c[3] for c in classes if c[3]).most_common(1)
    return kind, group, diet, state[0][0] if state else ''


def key_of(name, used):
    base = slug(name, 72) or 'food'
    key, n = base, 2
    while key in used:
        key, n = f'{base}-{n}', n + 1
    used.add(key)
    return key


def previous_keys(build, review):
    """ref -> food key from the last library written (review/food-keys.csv; the first time, the build's food_source.csv)."""
    path = review / 'food-keys.csv'
    if path.is_file():
        return {r[0]: r[1] for r in read(path)}
    if (build / 'food_source.csv').is_file():
        return {f'{r[0]}:{r[1]}': r[2] for r in read(build / 'food_source.csv')}
    return {}


def keep_keys(kept, previous):
    """Food keys stay with their food across rebuilds: each food takes the key most of its records had (larger foods
    first; on a tie, the key of the record the food is named after); a new food gets a key from its name that no earlier
    library used, so a retired key never names another food."""
    used, taken, keys = set(previous.values()), set(), {}
    for cid, row in sorted(kept.items(), key=lambda item: (-len(item[1]['foods']), item[0])):
        votes = Counter(previous[ref(f)] for f in row['foods'] if ref(f) in previous)
        ranked = sorted(votes, key=lambda k: (-votes[k], k != previous.get(cid)))
        key = next((k for k in ranked if k not in taken), None) or key_of(row['en'], used)
        taken.add(key)
        keys[cid] = key
    return keys


def fixes_for(foods, fixes, cid):
    """The manual.json "set" corrections of a food's records, merged; two records asking for different values stop."""
    fixed = {}
    for f in foods:
        for field, value in fixes.get(ref(f), {}).items():
            if fixed.setdefault(field, value) != value:
                raise SystemExit(f'manual.json "set" disagrees for {cid} on {field}: {fixed[field]} against {value}')
    return fixed


def classify_food(name_en, foods, classes, fixed):
    """Kind, group, diet and state of one food, or None when it is left out (exotic game, chain items)."""
    kind, group, diet, state = settle([classes[f][2:6] for f in foods])
    diet = min((diet, name_diet(name_en)), key=DIET_ORDER.index)
    # Corrections from the audits (manual.json "set": {ref: {kind, group, diet, state}}) win.
    kind, group = fixed.get('kind', kind), fixed.get('group', group)
    diet, state = fixed.get('diet', diet), fixed.get('state', state)
    if (kind == 'animal' and EXOTIC.search(name_en)) or CHAIN.search(name_en):
        return None
    if not fixed.get('group') and kind == 'ingredient' and group == 'grains-flours' and NOODLES.search(name_en) \
            and 'sauce' not in name_en.lower():
        group = 'noodles-pasta'
    if not fixed.get('kind') and kind == 'ingredient' and BAKED.search(name_en) and not NOT_BAKED.search(name_en):
        kind, group = 'dish', 'dishes' if SAVOURY.search(name_en) else 'snacks-sweets'
        if diet == 'plant' and not re.search(r'fried in (?:\w+ )?oil$', name_en):
            diet = 'unknown'
    if not fixed.get('kind') and kind == 'dish' and group == 'snacks-sweets' and SWEETENER.search(name_en):
        kind, group = 'ingredient', 'sweeteners'
    # Meat groups also hold meat dishes (curries, stews, burgers, pasties); a raw cut stays a reference.
    if not fixed.get('kind') and kind == 'animal' and MEAT_DISH.search(name_en) and not re.search(r'\braw\b', name_en, re.I):
        kind, group = 'dish', 'dishes'
    if PASTRY.search(name_en) and 'filo' not in name_en.lower() and diet == 'plant':
        diet = 'unknown'
    return kind, group, diet, state


def write_sources(build, review, kept, food_of, previous):
    """food_source.csv (measured records and the copies of them) and review/food-keys.csv; returns (where, copies)."""
    where = {f: food_of[cid] for cid, row in kept.items() for f in row['foods']}
    copies = {(r[0], r[1]): (r[2], r[3]) for r in read(build / 'duplicates.csv')}
    sources = sorted([(*food, key, 'measured') for food, key in where.items()]
                     + [(*food, where[of], 'copy') for food, of in copies.items() if of in where])
    with open(build / 'food_source.csv', 'w', encoding='utf-8', newline='') as handle:
        csv.writer(handle).writerows(sources)
    live = {key for *_, key, _ in sources}
    with open(review / 'food-keys.csv', 'w', encoding='utf-8', newline='') as handle:
        out = csv.writer(handle)
        out.writerows((f'{d}:{i}', key) for d, i, key, _ in sources)
        # Keys of foods that left the library stay reserved, so no later food takes them.
        out.writerows((f'retired:{key}', key) for key in sorted(set(previous.values()) - live))
    with open(build / 'food-groups.csv', 'w', encoding='utf-8', newline='') as handle:  # key -> group id, for fixes
        csv.writer(handle).writerows(sorted((key, cid) for cid, key in food_of.items()))
    return where, copies


def write(build, review):
    check_names(review)
    g = Groups(read(build / 'final-clusters.csv'))
    classes = {(r[0], r[1]): r for r in read(build / 'classified.csv')}
    weighed = {(r[0], r[1]) for r in read(build / 'foods.csv')
               if r[0] == 'uk-cofid' and WEIGHED.search(json.loads(r[2]).get('en', ''))}
    named = resolve_names(review, g)
    missing = set(g.members) - set(named)
    if missing:
        raise SystemExit(f'{len(missing)} foods have no names yet, e.g. {sorted(missing)[:5]}')
    # A food none of whose records gives energy cannot serve recipe nutrition (sparse Foundation analyses).
    figures = figures_of(build)
    no_energy = {f for f in g.where if 'kcal' not in figures.get(f, {})}
    manual = json.loads((review / 'manual.json').read_text(encoding='utf-8')) if (review / 'manual.json').is_file() else {}
    fixes, kept = manual.get('set', {}), {}
    for cid, foods in sorted(g.members.items()):
        foods = [f for f in foods if f not in weighed]
        item = named[cid]
        name_en, name_zh = item['en'].strip()[:160], item['zh'].strip()[:80]
        if not foods or all(f in no_energy for f in foods):
            continue
        facts = classify_food(name_en, foods, classes, fixes_for(foods, fixes, cid))
        if facts:
            kept[cid] = {'foods': foods, 'en': name_en, 'zh': name_zh, 'item': item, 'facts': facts}
    previous = previous_keys(build, review)
    food_of = keep_keys(kept, previous)
    with open(build / 'food.csv', 'w', encoding='utf-8', newline='') as fh, \
            open(build / 'alias.csv', 'w', encoding='utf-8', newline='') as ah:
        foods_csv, alias_csv = csv.writer(fh), csv.writer(ah)
        for cid, row in kept.items():
            key, item = food_of[cid], row['item']
            foods_csv.writerow([key, row['en'], row['zh'], *row['facts']])
            seen = set()
            for lang, words in (('en', [row['en'], *item.get('aliasesEn', [])]), ('zh', [row['zh'], *item.get('aliasesZh', [])])):
                for word in words:
                    word = word.strip().lower()
                    if word and (lang, word) not in seen and len(word) <= 160:
                        seen.add((lang, word))
                        alias_csv.writerow([lang, word, key])
    where, copies = write_sources(build, review, kept, food_of, previous)
    with open(build / 'left_out.csv', 'w', encoding='utf-8', newline='') as handle:
        out = csv.writer(handle)
        for food, row in classes.items():
            if food in where or (food in copies and copies[food] in where):
                continue
            reason = row[6] or ('copy of a record left out' if food in copies else
                                'per 100 g including inedible parts' if food in weighed else
                                'no energy figure' if food in no_energy else
                                'chain fast-food or branded item' if CHAIN.search(named.get(g.where.get(food, ''), {}).get('en', '')) else
                                'outside scope: game not used in Singapore dishes')
            out.writerow([*food, reason[:120]])
    reused = sum(key in set(previous.values()) for key in food_of.values())
    print(f'foods {len(food_of)}, records {len(where)}, keys kept from the last library {reused}')


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else ''
    build = Path(sys.argv[2] if len(sys.argv) > 2 else '.local/library/build')
    review = Path(sys.argv[3] if len(sys.argv) > 3 else '.local/library/review')
    {'groups': groups, 'repeats': repeats, 'write': write}.get(step, lambda *_: sys.exit(__doc__))(build, review)
