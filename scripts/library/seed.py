"""Fill the kitchen layer (library.ingredient) from the ingredient keys recipes already use, linked to library foods.

Source: the bots' nutrition table ops/qt-team/nutrition_sg.json, plus any key of the app's reviewed recipe table
(server-assets/nutrition/ingredient-table.json) the bots' table lacks, so a key added there reaches both (export_tables.py then
writes it into the bots' table). Each key points at the library food that holds its record; a key marked `analogue` is a
stand-in. Open Food Facts figures are not used (ODbL share-alike;
docs/AI_FOOD_LIBRARY_PLAN.md §2), so a key that only had those has no food until one is chosen.

Writes SQL to stdout:
  python -I scripts/library/seed.py <repository root> | docker exec -i quintaste-dev-db psql -U quintaste -d quintaste -q
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nutrients import slug  # noqa: E402

# Kitchen keys whose bot entry names no USDA or Taiwan record (Open Food Facts figures or none), or the wrong one,
# matched by hand to the library record of the same food (2 Nov 2026). Bay leaf and garam masala stay negligible in recipes.
LINKS = {
    'bay-leaf': ('usda-sr', '170917'),
    'cherry-tomato': ('taiwan-fda', 'E74004'),
    'garam-masala': ('uk-cofid', '13-829'),
    'legacy-paneer': ('uk-cofid', '12-495'),
    # Super firm tofu matches a Singapore tau kwa pack (117 kcal, 13.1 g protein, 6.7 g fat per 100 g) within 6%; Taiwan's
    # dougan (161 kcal) is drier.
    'tau-kwa': ('usda-sr', '174297'),
    # The bot's tapioca key pointed at tapioca pearls; the starch is Taiwan's cassava starch (also Japan's 02028).
    'legacy-tapioca-starch': ('taiwan-fda', 'B0320101'),
    # The bot took Taiwan's 豆腐皮 for dried tau kee, but that record is fresh beancurd skin (60% water).
    'tw-yuba': ('japan-mext', '04060'),
}
PLAIN = re.compile(r"^[a-z0-9][a-z0-9 '\-]*[a-z0-9]$")


def key_of(name):
    return slug(name, 60)


def words_of(food):
    names = {food['name'].lower()}
    for pattern in food.get('match', []):
        text = pattern.strip('^$').replace('(?<![a-z])', '').replace('(?![a-z])', '')
        if PLAIN.match(text):
            names.add(text)
    return sorted(n for n in names if len(n) <= 120)


def text(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"


def array(words):
    """A PostgreSQL text[] literal, each element quoted with its backslashes and quotes escaped."""
    return '{' + ','.join('"' + w.replace('\\', '\\\\').replace('"', '\\"') + '"' for w in words) + '}'


def source_of(food, key):
    """(dataset, id) of the record a bot key means: the hand links, the `record` export_tables.py writes, else the bot's
    original USDA id or Taiwan FDA source."""
    if key in LINKS:
        return LINKS[key]
    if food.get('record'):
        return tuple(food['record'].split(':', 1))
    source = food.get('source') or {}
    if food.get('fdcId'):
        return 'usda-sr', str(food['fdcId'])
    if source.get('dataset', '').startswith('Taiwan FDA'):
        return 'taiwan-fda', str(source['id'])
    if source.get('dataset', '').startswith('USDA SR'):
        return 'usda-sr', str(source['id'])
    return None


def app_food(food):
    """A recipe-table entry in the bots' table shape: its USDA SR Legacy id becomes `fdcId`."""
    return {**{k: v for k, v in food.items() if k != 'usda'}, **({'fdcId': food['usda']} if food.get('usda') else {})}


def kitchen_foods(repo):
    """Every kitchen key: the bots' table, then the recipe-table keys it lacks."""
    bot = json.loads((Path(repo) / 'ops/qt-team/nutrition_sg.json').read_text(encoding='utf-8'))['foods']
    app = json.loads((Path(repo) / 'server-assets/nutrition/ingredient-table.json').read_text(encoding='utf-8'))['foods']
    return {**bot, **{key: app_food(food) for key, food in app.items() if key not in bot}}


def statements(repo):
    """The kitchen layer's SQL, without a transaction: load.py runs it inside its own, main() wraps it in one."""
    foods = kitchen_foods(repo)
    keys = {}
    for name in foods:
        keys.setdefault(key_of(name), []).append(name)
    clash = {k: v for k, v in keys.items() if len(v) > 1}
    if clash:
        raise SystemExit(f'kitchen keys that make the same library key: {clash}')
    for bot_key, food in sorted(foods.items()):
        units = {**({'each': food['each']} if 'each' in food else {}), **food.get('per', {})}
        key = key_of(bot_key)
        source = source_of(food, key)
        link = (f"(SELECT food FROM library.food_source WHERE dataset = {text(source[0])} AND source_id = {text(source[1])})"
                if source else 'NULL')
        words = array(words_of(food))
        yield (f"INSERT INTO library.ingredient (key, food, name_en, stand_in, words, units, g_per_ml, negligible, colour, staple) "
               f"VALUES ({text(key)}, {link}, {text(food['name'])}, {str(bool(food.get('analogue'))).lower()}, "
               f"{text(words)}, {text(json.dumps(units))}::jsonb, {food.get('gPerMl') or 'NULL'}, "
               f"{str(bool(food.get('negligible'))).lower()}, {text(food.get('colour'))}, {text(food.get('staple'))}) "
               f"ON CONFLICT (key) DO UPDATE SET food = EXCLUDED.food, name_en = EXCLUDED.name_en, stand_in = EXCLUDED.stand_in, "
               f"words = EXCLUDED.words, units = EXCLUDED.units, g_per_ml = EXCLUDED.g_per_ml, negligible = EXCLUDED.negligible, "
               f"colour = EXCLUDED.colour, staple = EXCLUDED.staple, updated_at = now();")
    yield ("UPDATE library.ingredient i SET name_zh = f.name_zh FROM library.food f WHERE f.key = i.food AND i.name_zh = '';")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.stdout.reconfigure(encoding='utf-8')
    print('\\set ON_ERROR_STOP on\nBEGIN;')
    for statement in statements(sys.argv[1]):
        print(statement)
    print('COMMIT;')
