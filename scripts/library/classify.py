"""Put every normalised food into the library's own groups (docs/AI_FOOD_LIBRARY_PLAN.md §1, "arrangement").

kind      ingredient (what recipes use), animal (meat, poultry, seafood: only the baseline for Snap a dish), dish (prepared
          foods: the usual version of a dish), or excluded (outside the app's needs).
category  one of CATEGORIES, the same across datasets.
diet      plant, dairy, egg, honey, meat, seafood, or unknown (prepared foods whose ingredients are not listed).
state     raw, cooked, dried, canned, fried, roasted, frozen, pickled, or '' when not stated.
Rules: each dataset's own group first, then words in the English name (all datasets have English except a few MEXT foods,
which use their Japanese name).
"""
import re

CATEGORIES = ('vegetables', 'fruits', 'grains-flours', 'noodles-pasta', 'breads', 'legumes-soy', 'nuts-seeds', 'mushrooms',
              'seaweed', 'herbs-spices', 'sauces-condiments', 'oils-fats', 'sweeteners', 'dairy', 'eggs', 'plant-milks',
              'beverages', 'snacks-sweets', 'dishes', 'meat', 'poultry', 'seafood')

# dataset group -> (kind, category). Unlisted groups fall through to name rules.
GROUPS = {
    'Vegetables and Vegetable Products': ('ingredient', 'vegetables'), 'Fruits and Fruit Juices': ('ingredient', 'fruits'),
    'Fruits and fruit juices': ('ingredient', 'fruits'), 'Cereal Grains and Pasta': ('ingredient', 'grains-flours'),
    'Cereals, Grains and Pasta': ('ingredient', 'grains-flours'), 'Legumes and Legume Products': ('ingredient', 'legumes-soy'),
    'Nut and Seed Products': ('ingredient', 'nuts-seeds'), 'Nuts and Seeds': ('ingredient', 'nuts-seeds'),
    'Spices and Herbs': ('ingredient', 'herbs-spices'), 'Fats and Oils': ('ingredient', 'oils-fats'),
    'Dairy and Egg Products': ('ingredient', 'dairy'), 'Sweets': ('dish', 'snacks-sweets'), 'Snacks': ('dish', 'snacks-sweets'),
    'Baked Products': ('dish', 'breads'), 'Breakfast Cereals': ('ingredient', 'grains-flours'),
    'Breakfast cereals': ('ingredient', 'grains-flours'), 'Beverages': ('ingredient', 'beverages'),
    'Soups, Sauces, and Gravies': ('dish', 'sauces-condiments'), 'Soups, Sauces and Gravies': ('dish', 'sauces-condiments'),
    'Meals, Entrees, and Side Dishes': ('dish', 'dishes'), 'Mixed Dishes': ('dish', 'dishes'),
    'Beef Products': ('animal', 'meat'), 'Pork Products': ('animal', 'meat'), 'Lamb, Veal, and Game Products': ('animal', 'meat'),
    'Lamb, Veal and Game': ('animal', 'meat'), 'Sausages and Luncheon Meats': ('animal', 'meat'),
    'Sausages and Luncheon meats': ('animal', 'meat'), 'Poultry Products': ('animal', 'poultry'),
    'Finfish and Shellfish Products': ('animal', 'seafood'),
    'Baby Foods': ('excluded', ''), 'Babyfoods': ('excluded', ''), 'Fast Foods': ('excluded', ''),
    'Restaurant Foods': ('excluded', ''), 'American Indian/Alaska Native Foods': ('excluded', ''),
    # MEXT food groups 01-18
    '01': ('ingredient', 'grains-flours'), '02': ('ingredient', 'vegetables'), '03': ('ingredient', 'sweeteners'),
    '04': ('ingredient', 'legumes-soy'), '05': ('ingredient', 'nuts-seeds'), '06': ('ingredient', 'vegetables'),
    '07': ('ingredient', 'fruits'), '08': ('ingredient', 'mushrooms'), '09': ('ingredient', 'seaweed'),
    '10': ('animal', 'seafood'), '11': ('animal', 'meat'), '12': ('ingredient', 'eggs'), '13': ('ingredient', 'dairy'),
    '14': ('ingredient', 'oils-fats'), '15': ('dish', 'snacks-sweets'), '16': ('ingredient', 'beverages'),
    '17': ('ingredient', 'sauces-condiments'), '18': ('dish', 'dishes'),
    # Taiwan FDA groups
    '蔬菜類': ('ingredient', 'vegetables'), '水果類': ('ingredient', 'fruits'), '穀物類': ('ingredient', 'grains-flours'),
    '澱粉類': ('ingredient', 'grains-flours'), '豆類': ('ingredient', 'legumes-soy'), '堅果及種子類': ('ingredient', 'nuts-seeds'),
    '菇類': ('ingredient', 'mushrooms'), '藻類': ('ingredient', 'seaweed'), '調味料及香辛料類': ('ingredient', 'sauces-condiments'),
    '油脂類': ('ingredient', 'oils-fats'), '糖類': ('ingredient', 'sweeteners'), '乳品類': ('ingredient', 'dairy'),
    '蛋類': ('ingredient', 'eggs'), '飲料類': ('ingredient', 'beverages'), '糕餅點心類': ('dish', 'snacks-sweets'),
    '加工調理食品及其他類': ('dish', 'dishes'), '肉類': ('animal', 'meat'), '魚貝類': ('animal', 'seafood'),
}
# UK CoFID group codes by first letter.
COFID = {'A': ('ingredient', 'grains-flours'), 'B': ('ingredient', 'dairy'), 'C': ('ingredient', 'eggs'),
         'D': ('ingredient', 'vegetables'), 'F': ('ingredient', 'fruits'), 'G': ('ingredient', 'nuts-seeds'),
         'H': ('ingredient', 'nuts-seeds'), 'J': ('animal', 'seafood'), 'M': ('animal', 'meat'), 'O': ('ingredient', 'oils-fats'),
         'P': ('ingredient', 'beverages'), 'Q': ('excluded', ''), 'S': ('ingredient', 'sweeteners'),
         'W': ('ingredient', 'sauces-condiments')}
# FNDDS: keep only mixed dishes (its single foods repeat SR Legacy); these WWEIA groups are dishes.
FNDDS_DISHES = re.compile(r'mixed dishes|pizza|stir-fry|sandwich|burger|burrito|taco|mexican|soups?,|soup|fried rice|lo/chow|'
                          r'egg rolls|dumpling|sushi|legume dishes|vegetable dishes|macaroni and cheese|nachos|coleslaw|'
                          r'mashed potatoes|eggs and omelets|ramen|chicken patties', re.I)

_W = lambda words: re.compile(r'(?<![a-z])(?:' + words + r')(?![a-z])', re.I)  # noqa: E731
EXCLUDE = _W(r'baby|babyfood|infant|toddler|formula|supplement|protein powder|nutrition bar|energy drink|meal replacement|'
             r'beer|wine|liquor|whiskey|whisky|vodka|rum|gin|brandy|sake|shochu|liqueur|cocktail|alcoholic|cider, hard')
# Name rules, in order: the first that matches sets the category (and kind for animal foods).
NAME_RULES = (
    (_W(r'soy ?milk|soya drink|soymilk|almond (?:milk|drink|beverage)|oat (?:milk|drink|beverage)|rice (?:milk|drink|beverage)'
        r'|coconut (?:milk|beverage)|plant-based milk|non-dairy'), 'ingredient', 'plant-milks'),
    (_W(r'mushrooms?|fungi|fungus|enoki|shiitake|shimeji|truffles?|morels?|chanterelle'), 'ingredient', 'mushrooms'),
    (_W(r'seaweed|laver|kelp|wakame|agar|kombu|nori|hijiki|spirulina|sea moss|irish moss'), 'ingredient', 'seaweed'),
    (_W(r'tofu|bean curd|beancurd|tempeh|natto|yuba|edamame|soybeans?|soya beans?|okara|textured vegetable protein'),
     'ingredient', 'legumes-soy'),
    (_W(r'noodles?|pasta|spaghetti|macaroni|vermicelli|udon|soba|ramen|lasagna|fettuccine|linguine|penne'), 'ingredient',
     'noodles-pasta'),
    (_W(r'eggs?|egg white|egg yolk|omelet'), 'ingredient', 'eggs'),
    (_W(r'honey|sugars?|syrup|molasses|jaggery|treacle|sweetener|jam|marmalade|jelly'), 'ingredient', 'sweeteners'),
    (_W(r'sauce|ketchup|vinegar|mustard|mayonnaise|dressing|relish|salsa|gravy|chutney|paste|bouillon|stock|broth'),
     'ingredient', 'sauces-condiments'),
    (_W(r'flour|starch|meal|semolina|bran|germ'), 'ingredient', 'grains-flours'),
    (_W(r'bread|buns?|rolls?|bagels?|pita|tortillas?|chapati|naan|croissants?|crackers?'), 'dish', 'breads'),
)
ANIMAL = _W(r'beef|pork|veal|lamb|mutton|goat|chicken|turkey|duck|goose|ham|bacon|sausages?|salami|pepperoni|frankfurters?|'
            r'hot dogs?|meat|meatballs?|liver|lard|tallow|suet|gelatin|gelatine|anchov(?:y|ies)|fish|tuna|salmon|cod|sardines?|'
            r'mackerel|shrimps?|prawns?|crab|lobster|clams?|oysters?|mussels?|scallops?|squid|octopus|cuttlefish|caviar|roe|'
            r'bonito|dashi|abalone')
ANIMAL_ZH = re.compile(r'肉|雞|鷄|鶏|豬|豚|牛(?!奶|乳|蒡|番茄|肝菌|樟)|羊(?!奶|乳|肚菌)|鴨|鵝|魚|蝦|蟹|貝(?!果)|蚵|魷|章魚|海參|火腿|培根|香腸|'
                       r'臘|えび|かに|いか|たこ|かつお|さば|さけ|まぐろ|しらす|ちくわ|かまぼこ|ハム|ベーコン|ソーセージ')
ANIMAL_ZH_NOT = re.compile(r'鮑魚菇|雞腿菇|雞樅|天貝|貝果|肉桂|肉豆蔻|肉荳蔻|魚腥草|[紅白黃綠果]肉|龍眼肉|桂圓肉|素')
# In plant groups only an explicit "with pork" style mention makes a food non-vegetarian ("coconut meat", "scallop squash"
# and the Chinese 肉 for fruit flesh are not meat).
ANIMAL_WITH = _W(r'(?:with|and|in|contains?) (?:\w+ )?(?:beef|pork|chicken|turkey|ham|bacon|meat|sausages?|fish|shrimps?|'
                 r'prawns?|anchov(?:y|ies)|lard|gelatin)')
PLANT_GROUPS = {'vegetables', 'fruits', 'grains-flours', 'noodles-pasta', 'legumes-soy', 'nuts-seeds', 'mushrooms', 'seaweed',
                'herbs-spices', 'sweeteners', 'plant-milks', 'beverages'}
PLANT_EXCEPTIONS = _W(r'oyster mushrooms?|abalone mushrooms?|mushroom oyster sauce|vegetarian oyster sauce|fish mint|'
                      r'vegetarian|vegan|plant-based|meatless|imitation|meat substitute|meat extender|veggie|coconut meat|'
                      r"lamb's lettuce|scallop squash|squash, summer, scallop|hamburger or hot dog|hamburger / hot dog|"
                      r'hot dog buns?|hamburger buns?|goat milk|goat cheese|milk, goat|cheese, goat')
DAIRY = _W(r'milk|cheese|butter|cream|yogh?urt|ghee|whey|casein|paneer|curd|buttermilk|kefir|ice cream')
# Meat and seafood are kept only as the usual version of a dish; Western cut, grade and trim variants add nothing for that.
WESTERN = {'usda-sr', 'usda-foundation', 'canada-cnf', 'uk-cofid'}
CUT_DETAIL = re.compile(r'trimmed to|separable|choice|select|prime|all grades|\d/\d+"|\bfat\b, |lean only|lean and fat|'
                        r'composite of|variety meats|by-products|retail cuts|bone-in|boneless|steak|roast\b|chuck|loin|rib|'
                        r'brisket|shank|round|flank|plate|shoulder|blade|sirloin|tenderloin|ground, \d+%', re.I)
DAIRY_ZH = re.compile(r'(?<![豆椰杏燕米])(?:奶|乳)(?!瓜|酪梨)|起司|乳酪|牛乳|チーズ|バター|ヨーグルト|クリーム')
# Branded products (USDA writes brands in capitals; Canada and the UK use the brand name): not sold the same way here.
BRANDED = re.compile(r"\b(?!USDA\b|NFS\b|UHT\b|RTE\b|RTF\b|WIC\b)[A-Z][A-Z'\-]{3,}\b|Kellogg|General Mills|Kraft|Nestl[eé]|Campbell|Heinz|Pillsbury|Betty Crocker|"
                     r"Hormel|Oscar Mayer|Hershey|Keebler|Kashi|Pepperidge|Nabisco|Quaker|Post |Weetabix|McCain")
STATES = (('fried', _W(r'fried|deep-fried|stir-fried|sauteed|tempura')),
          ('roasted', _W(r'roasted|toasted|grilled|broiled|baked')),
          ('cooked', _W(r'cooked|boiled|steamed|stewed|simmered|braised|poached|microwaved|blanched')),
          ('canned', _W(r'canned')), ('frozen', _W(r'frozen')), ('pickled', _W(r'pickled|fermented|brined|salted')),
          ('dried', _W(r'dried|dry|dehydrated|sun-dried|powder|powdered|flakes')), ('raw', _W(r'raw|fresh')))
# "Apples, raw, without skin, cooked, boiled" is cooked: every other state word wins over raw, so raw is checked last.
# Taiwan names rarely say the state; its sample description does (樣品狀態:生).
TAIWAN_STATES = (('raw', '生'), ('cooked', '熟'), ('dried', '乾'), ('frozen', '冷凍'), ('pickled', '醃'), ('fried', '炸'),
                 ('roasted', '烤'), ('canned', '罐'))
STATES_JA = (('raw', re.compile(r'(?:^|\s)生(?:$|\s)')), ('cooked', re.compile(r'ゆで|水煮|蒸し|煮')),
             ('fried', re.compile(r'油いため|素揚げ|揚げ|天ぷら|フライ')), ('roasted', re.compile(r'焼き|いり')),
             ('canned', re.compile(r'缶詰')), ('frozen', re.compile(r'冷凍')), ('pickled', re.compile(r'漬')),
             ('dried', re.compile(r'乾|干し|粉')))


def _state(en, other, description=''):
    hint = re.search(r'樣品狀態[:：]([^;；]+)', description)
    if hint:
        for state, mark in TAIWAN_STATES:
            if hint.group(1).strip().startswith(mark):
                return state
    for state, pattern in STATES:
        if en and pattern.search(en):
            return state
    for state, pattern in STATES_JA:
        if other and pattern.search(other):
            return state
    return ''


def classify(dataset, category, names, description=''):
    """(kind, category, diet, state, excluded reason) for one normalised food."""
    en = names.get('en', '')
    other = names.get('zh-Hant') or names.get('ja') or ''
    text = en or other
    if dataset == 'usda-fndds':
        if not FNDDS_DISHES.search(category) or EXCLUDE.search(category):
            return 'excluded', '', '', '', 'fndds single food (repeats SR Legacy) or outside scope'
        kind, group = 'dish', 'dishes'
    elif dataset == 'uk-cofid':
        kind, group = COFID.get(category[:1], ('ingredient', ''))
    else:
        kind, group = GROUPS.get(category, ('ingredient', ''))
    if kind == 'excluded' or EXCLUDE.search(en) or re.search(r'酒|ビール|ワイン|ウイスキー|焼酎|リキュール', other) \
            and 'みりん' not in other and '味醂' not in other:
        return 'excluded', '', '', '', 'outside scope: ' + (category or 'name')
    if dataset in ('usda-sr', 'usda-foundation', 'canada-cnf', 'uk-cofid') and BRANDED.search(en):
        return 'excluded', '', '', '', 'branded product'
    if kind == 'ingredient':
        for pattern, rule_kind, rule_group in NAME_RULES:
            if pattern.search(en) and not (rule_group == 'eggs' and group in ('breads', 'snacks-sweets')):
                kind, group = rule_kind, rule_group
                break
    if group in PLANT_GROUPS:
        animal = ANIMAL_WITH.search(en)
    else:
        animal = ANIMAL.search(en) or (ANIMAL_ZH.search(other) and not ANIMAL_ZH_NOT.search(other))
    animal = animal and not PLANT_EXCEPTIONS.search(text)
    if group == 'eggs' and kind == 'ingredient':
        return kind, group, 'egg', _state(en, other, description), ''
    if group == 'dairy' and kind == 'ingredient' and not ANIMAL_WITH.search(en):
        return kind, group, 'dairy', _state(en, other, description), ''
    if kind == 'animal' and dataset in WESTERN and CUT_DETAIL.search(en):
        return 'excluded', '', '', '', 'meat cut detail (not needed for Singapore dishes)'
    if kind == 'animal' or group in ('meat', 'poultry', 'seafood'):
        diet = 'seafood' if group == 'seafood' or re.search(r'fish|shrimp|prawn|crab|clam|oyster|squid|魚|蝦|蟹|貝', text, re.I) \
            else 'meat'
        kind = 'animal' if kind != 'dish' else kind
    elif animal:
        diet = 'seafood' if re.search(r'fish|anchov|shrimp|prawn|crab|clam|oyster|squid|bonito|dashi|魚|蝦|蟹|貝|えび|かつお', text,
                                      re.I) else 'meat'
        if kind == 'ingredient' and group not in ('sauces-condiments', 'oils-fats'):
            kind = 'dish'
    elif group == 'eggs':
        diet = 'egg'
    elif group == 'dairy' or (DAIRY.search(en) and not _W('coconut|soy|almond|oat|peanut|cocoa|shea|nut').search(en)) \
            or DAIRY_ZH.search(other):
        diet = 'dairy' if kind == 'ingredient' else 'unknown'
    elif _W('honey').search(en) or 'はちみつ' in other or '蜂蜜' in other:
        diet = 'honey'
    elif kind == 'ingredient':
        diet = 'plant'
    else:
        diet = 'unknown'
    return kind, group or 'dishes', diet, _state(en, other, description), ''


def main(build):
    """Writes classified.csv (dataset, id, kind, category, diet, state, left-out reason, display name) from foods.csv."""
    import csv
    import json
    with open(build / 'foods.csv', encoding='utf-8', newline='') as source, \
            open(build / 'classified.csv', 'w', encoding='utf-8', newline='') as target:
        out = csv.writer(target)
        for dataset, food_id, names, _, category, _, _, description in csv.reader(source):
            names = json.loads(names)
            out.writerow([dataset, food_id, *classify(dataset, category, names, description),
                          names.get('en') or names.get('zh-Hant') or names.get('ja') or ''])


if __name__ == '__main__':
    import sys
    from pathlib import Path
    main(Path(sys.argv[1] if len(sys.argv) > 1 else '.local/library/build'))
