"""Dish cards for "Snap a dish": the usual version of popular Singapore and Asian dishes.

Each card lists the parts of the dish as it is usually made (meat, seafood, egg and the five
pungent included), so the app can swap the animal parts for plant ones. A card links a measured
dish record only where the record is genuinely the same dish in its usual form; protein and
energy per serving are then read from the library build, never estimated.

Run from the repository root:  python -X utf8 -I scripts/library/dish_cards.py
Reads  .local/library/build/{foods,values,datasets}.csv
Writes server-assets/nutrition/dish-cards.json
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / ".local" / "library" / "build"
OUT = ROOT / "server-assets" / "nutrition" / "dish-cards.json"
VERSION = "2026-11-03"

ROLES = {
    "season", "sweeten", "sour", "heat", "aromatic", "fat", "flavour-oil", "thicken", "coat",
    "bind", "protein", "vegetable", "staple", "liquid", "creamy", "garnish",
}
CATEGORIES = {
    "B": "Breakfast", "N": "Noodles", "R": "Rice meals", "W": "With rice", "S": "Soups",
    "K": "Snacks & kueh", "D": "Desserts & drinks",
}
CUISINES = {
    "ch": "chinese", "ma": "malay", "in": "indian", "pe": "peranakan", "th": "thai",
    "ja": "japanese", "ko": "korean", "vi": "vietnamese", "id": "indonesian", "fi": "filipino",
    "we": "western", "ot": "other",
}
DISH_DATASETS = {"usda-fndds", "uk-cofid", "taiwan-fda", "japan-mext"}

CARDS: list[dict] = []

def D(cid: str, en: str, zh: str, aliases: str, cuisine: str, cat: str, serving: int,
      parts: str, rec: str | None = None) -> None:
    """One card. parts: 'name grams role; ...'. aliases: 'a|b'."""
    items = []
    for chunk in parts.split(";"):
        chunk = chunk.strip()
        if not chunk:
            continue
        name, grams, role = chunk.rsplit(" ", 2)
        items.append({"name": name.strip(), "grams": float(grams) if "." in grams else int(grams),
                      "role": role})
    CARDS.append({
        "id": cid, "name": {"en": en, "zh": zh},
        "aliases": [a.strip() for a in aliases.split("|") if a.strip()],
        "cuisine": CUISINES[cuisine], "category": CATEGORIES[cat], "serving": serving,
        "parts": items, "record": rec,
    })

# ---------------------------------------------------------------- Chinese hawker noodles
D("char-kway-teow", "Char kway teow", "炒粿条", "fried kway teow|炒粿條|ckt", "ch", "N", 450,
  "flat rice noodles 180 staple; yellow noodles 60 staple; cockles 30 protein; Chinese sausage 25 protein;"
  "fish cake 20 protein; eggs 50 protein; bean sprouts 40 vegetable; Chinese chives 15 vegetable;"
  "lard 20 fat; dark soy sauce 15 season; garlic 8 aromatic; sambal chilli 10 heat")
D("hokkien-mee", "Hokkien prawn mee", "福建虾面", "hokkien mee|fried hokkien mee|福建蝦麵|福建炒虾面", "ch", "N", 480,
  "yellow noodles 140 staple; thick rice vermicelli 90 staple; prawns 60 protein; squid 30 protein;"
  "pork belly 25 protein; eggs 50 protein; prawn stock 60 liquid; bean sprouts 30 vegetable; lard 15 fat;"
  "garlic 8 aromatic; lime 5 sour; sambal belacan 12 heat")
D("kl-hokkien-mee", "KL Hokkien mee", "黑福建面", "dark hokkien mee|kl hokkien noodles|大炒福建面", "ch", "N", 420,
  "thick yellow noodles 220 staple; pork slices 40 protein; prawns 30 protein; squid 20 protein;"
  "pork lard crisps 10 garnish; cabbage 40 vegetable; dark soy sauce 20 season; pork stock 60 liquid;"
  "garlic 8 aromatic; lard 15 fat")
D("bak-chor-mee", "Bak chor mee", "肉脞面", "minced meat noodles|bak chor mee pok|肉脞麵", "ch", "N", 350,
  "mee pok 150 staple; minced pork 50 protein; pork slices 25 protein; pork liver 20 protein;"
  "pork balls 40 protein; braised mushrooms 15 vegetable; black vinegar 10 sour; chilli paste 10 heat;"
  "lard 8 fat; fried shallots 5 garnish; light soy sauce 8 season; spring onion 3 garnish")
D("fishball-noodles", "Fishball noodles", "鱼圆面", "fishball mee pok|fish ball noodles|魚圓麵|mee pok", "ch", "N", 330,
  "mee pok 150 staple; fish balls 80 protein; fish cake 20 protein; minced pork 25 protein;"
  "chilli paste 10 heat; black vinegar 8 sour; lard 8 fat; fried shallots 4 garnish; lettuce 20 vegetable;"
  "light soy sauce 6 season")
D("wanton-mee", "Wanton mee", "云吞面", "wonton noodles|wanton noodles|雲吞麵|wantan mee", "ch", "N", 330,
  "egg noodles 150 staple; char siu 40 protein; wontons (pork and prawn) 60 protein; choy sum 30 vegetable;"
  "oyster sauce 10 season; sesame oil 5 flavour-oil; lard 6 fat; chilli sauce 10 heat;"
  "pickled green chillies 8 sour; dark soy sauce 5 season")
D("ban-mian", "Ban mian", "板面", "pan mee|mee hoon kueh|面粉粿|板麵", "ch", "N", 560,
  "wheat noodles 180 staple; anchovy stock 250 liquid; minced pork 40 protein; eggs 50 protein;"
  "dried anchovies (ikan bilis) 10 garnish; sweet potato leaves 30 vegetable; shiitake mushrooms 15 vegetable;"
  "fried shallots 5 garnish; light soy sauce 8 season; chilli padi 3 heat")
D("lor-mee", "Lor mee", "卤面", "滷麵|lor mee noodles", "ch", "N", 560,
  "yellow noodles 180 staple; pork stock 200 liquid; potato starch 15 thicken; braised pork belly 40 protein;"
  "fried fish 30 protein; ngoh hiang 20 protein; braised eggs 50 protein; bean sprouts 20 vegetable;"
  "garlic 8 aromatic; black vinegar 10 sour; dark soy sauce 10 season; chilli 8 heat")
D("prawn-mee", "Prawn noodle soup", "虾面", "hae mee|prawn mee|蝦麵|har mee", "ch", "N", 580,
  "yellow noodles 100 staple; rice vermicelli 60 staple; prawns 70 protein; pork ribs 50 protein;"
  "prawn and pork bone broth 250 liquid; water spinach 25 vegetable; bean sprouts 20 vegetable;"
  "fried shallots 5 garnish; dried chilli 5 heat; lard 6 fat; light soy sauce 6 season; rock sugar 3 sweeten")
D("laksa", "Curry laksa", "叻沙", "katong laksa|laksa lemak|nyonya laksa|咖喱叻沙", "pe", "N", 580,
  "thick rice vermicelli 180 staple; coconut milk 100 creamy; chicken stock 150 liquid; prawns 40 protein;"
  "cockles 20 protein; fish cake 25 protein; bean sprouts 25 vegetable; dried shrimp 10 flavour-oil;"
  "shrimp paste (belacan) 6 season; shallots 20 aromatic; lemongrass 10 aromatic; dried chilli 10 heat")
D("assam-laksa", "Assam laksa", "亚参叻沙", "penang laksa|亞參叻沙|檳城叻沙", "ma", "N", 580,
  "thick rice noodles 180 staple; mackerel 60 protein; tamarind 20 sour; fish stock 220 liquid;"
  "torch ginger flower 5 aromatic; pineapple 30 vegetable; cucumber 25 vegetable; red onion 20 aromatic;"
  "mint 3 garnish; black prawn paste (hae ko) 15 season; red chilli 10 heat; lemongrass 8 aromatic")
D("mee-siam", "Mee siam", "米暹", "mee siam kuah|mee siam goreng", "ma", "N", 470,
  "rice vermicelli 160 staple; tamarind 15 sour; dried shrimp 15 flavour-oil; shrimp paste (belacan) 5 season;"
  "fermented soybean paste (taucheo) 15 season; shallots 20 aromatic; dried chilli 10 heat; prawns 30 protein;"
  "hard-boiled eggs 50 protein; Chinese chives 8 vegetable; lime 5 sour; prawn stock 150 liquid")
D("mee-rebus", "Mee rebus", "马来卤面", "mi rebus|mee kuah", "ma", "N", 520,
  "yellow noodles 180 staple; sweet potato 50 thicken; beef stock 180 liquid; dried shrimp 10 flavour-oil;"
  "shallots 15 aromatic; dried chilli 8 heat; fermented soybean paste (taucheo) 10 season;"
  "hard-boiled eggs 50 protein; bean sprouts 20 vegetable; green chilli 5 heat; lime 5 sour;"
  "fried shallots 5 garnish")
D("mee-goreng-mamak", "Mee goreng mamak", "印度炒面", "mamak mee goreng|indian mee goreng|mee goreng", "in", "N", 420,
  "yellow noodles 200 staple; eggs 50 protein; boiled potato 30 vegetable; firm tofu 25 protein;"
  "chilli sauce 20 heat; tomato ketchup 15 sweeten; mutton 20 protein; cabbage 20 vegetable;"
  "tomato 20 vegetable; vegetable oil 15 fat; lime 5 sour; shallots 10 aromatic")
D("beef-hor-fun", "Beef hor fun", "牛肉河粉", "beef kway teow|wet beef hor fun|牛河", "ch", "N", 520,
  "flat rice noodles 220 staple; beef slices 80 protein; beef stock 150 liquid; fermented black beans 8 season;"
  "oyster sauce 10 season; dark soy sauce 8 season; corn starch 8 thicken; garlic 6 aromatic;"
  "kai lan 30 vegetable; vegetable oil 15 fat")
D("dry-fried-beef-hor-fun", "Dry-fried beef hor fun", "干炒牛河", "gon chow ngau ho|干炒牛河粉|beef chow fun", "ch", "N", 370,
  "flat rice noodles 220 staple; beef slices 60 protein; bean sprouts 40 vegetable; spring onion 10 vegetable;"
  "onion 15 aromatic; dark soy sauce 12 season; light soy sauce 6 season; vegetable oil 20 fat; sugar 3 sweeten",
  rec="usda-fndds:2708796")
D("wat-dan-hor", "Wat dan hor", "滑蛋河", "egg gravy hor fun|滑蛋河粉|wat tan hor", "ch", "N", 570,
  "flat rice noodles 220 staple; eggs 50 protein; prawns 30 protein; pork slices 30 protein; squid 20 protein;"
  "fish cake 15 protein; chicken stock 150 liquid; corn starch 10 thicken; choy sum 30 vegetable;"
  "oyster sauce 8 season; garlic 6 aromatic; lard 10 fat")
D("cantonese-fried-noodles", "Cantonese fried noodles", "广东炒面", "sang mee|crispy noodles with gravy|廣東炒麵|生面", "ch", "N", 460,
  "crispy egg noodles 120 staple; prawns 40 protein; pork slices 30 protein; squid 20 protein;"
  "fish cake 15 protein; eggs 50 protein; chicken stock 120 liquid; corn starch 10 thicken;"
  "choy sum 40 vegetable; oyster sauce 8 season; garlic 6 aromatic")
D("seafood-white-bee-hoon", "White bee hoon", "白米粉", "seafood white bee hoon|sembawang white bee hoon|白米粉海鲜", "ch", "N", 470,
  "rice vermicelli 180 staple; prawns 40 protein; squid 30 protein; clams 30 protein; eggs 30 protein;"
  "cabbage 40 vegetable; seafood stock 120 liquid; lard 10 fat; garlic 6 aromatic; fish sauce 5 season")
D("economy-bee-hoon", "Economy fried bee hoon", "经济米粉", "economy noodles|fried mee hoon|經濟米粉|炒米粉", "ch", "B", 300,
  "rice vermicelli 160 staple; cabbage 30 vegetable; carrot 10 vegetable; light soy sauce 8 season;"
  "dark soy sauce 5 season; vegetable oil 15 fat; luncheon meat 30 protein; fried egg 50 protein;"
  "garlic 5 aromatic")
D("ee-fu-noodles", "Ee-fu noodles", "伊面", "yee mee|e-fu noodles|伊府面|braised ee-fu noodles", "ch", "N", 340,
  "ee-fu noodles 180 staple; shiitake mushrooms 20 vegetable; yellow chives 20 vegetable; oyster sauce 10 season;"
  "dark soy sauce 6 season; chicken stock 60 liquid; sesame oil 4 flavour-oil; vegetable oil 10 fat;"
  "crab meat 30 protein")
D("curry-mee", "Curry chicken noodles", "咖喱鸡面", "curry mee|curry noodles|咖喱麵|咖喱雞麵", "ch", "N", 560,
  "yellow noodles 120 staple; rice vermicelli 60 staple; chicken thigh 80 protein; potato 50 vegetable;"
  "tau pok 20 protein; coconut milk 80 creamy; chicken stock 120 liquid; curry powder 8 season;"
  "shallots 15 aromatic; garlic 6 aromatic; dried chilli 6 heat; vegetable oil 15 fat")
D("fish-soup-bee-hoon", "Sliced fish bee hoon soup", "鱼片米粉汤", "sliced fish soup|fish soup bee hoon|魚片米粉|鱼片汤", "ch", "N", 590,
  "rice vermicelli 150 staple; sliced fish 100 protein; fish stock 250 liquid; tomato 30 vegetable;"
  "lettuce 30 vegetable; evaporated milk 20 creamy; fried shallots 5 garnish; ginger 5 aromatic;"
  "Shaoxing wine 5 flavour-oil; fish sauce 5 season")
D("kway-chap", "Kway chap", "粿汁", "kueh chap|kuay chap", "ch", "N", 620,
  "flat rice sheets 200 staple; braising broth 200 liquid; pork intestines 60 protein; pork belly 50 protein;"
  "braised eggs 50 protein; tau pok 20 protein; dark soy sauce 15 season; star anise 1 aromatic;"
  "garlic 8 aromatic; salted vegetables 20 vegetable; chilli vinegar 10 heat; galangal 3 aromatic")
D("yong-tau-foo", "Yong tau foo", "酿豆腐", "ytf|yong tau fu|釀豆腐", "ch", "N", 600,
  "fish paste 60 bind; tofu 60 protein; bitter gourd 30 vegetable; eggplant 30 vegetable; okra 20 vegetable;"
  "fish balls 40 protein; tau pok 20 protein; rice vermicelli 100 staple; anchovy and soybean stock 250 liquid;"
  "sweet sauce 15 sweeten; chilli sauce 10 heat")
D("la-mian", "Lanzhou beef noodle soup", "兰州牛肉面", "la mian|hand-pulled noodles|蘭州拉麵|牛肉拉面", "ch", "N", 600,
  "hand-pulled wheat noodles 200 staple; beef shank 60 protein; beef bone broth 280 liquid; white radish 30 vegetable;"
  "coriander 5 garnish; spring onion 5 garnish; chilli oil 10 heat; star anise 1 aromatic; ginger 5 aromatic;"
  "salt 2 season")
D("taiwanese-beef-noodles", "Taiwanese braised beef noodle soup", "红烧牛肉面", "紅燒牛肉麵|niu rou mian", "ch", "N", 650,
  "wheat noodles 200 staple; beef shank 100 protein; beef bone broth 250 liquid; chilli bean paste (doubanjiang) 15 season;"
  "dark soy sauce 10 season; tomato 30 vegetable; bok choy 30 vegetable; garlic 8 aromatic; ginger 5 aromatic;"
  "star anise 1 aromatic; pickled mustard greens 10 sour")
D("zha-jiang-mian", "Zha jiang mian", "炸酱面", "zhajiang noodles|炸醬麵|jajang noodles chinese", "ch", "N", 400,
  "wheat noodles 200 staple; minced pork 70 protein; sweet bean sauce 25 season; yellow soybean paste 10 season;"
  "cucumber 40 vegetable; bean sprouts 20 vegetable; vegetable oil 15 fat; garlic 6 aromatic; spring onion 5 garnish")
D("dan-dan-noodles", "Dan dan noodles", "担担面", "擔擔麵|dandan mian", "ch", "N", 380,
  "wheat noodles 200 staple; minced pork 50 protein; sesame paste 20 creamy; chilli oil 15 heat;"
  "Sichuan peppercorn 2 heat; light soy sauce 10 season; black vinegar 6 sour; preserved mustard greens (ya cai) 10 season;"
  "bok choy 30 vegetable; chicken stock 40 liquid; garlic 5 aromatic; spring onion 5 garnish")
D("oyster-mee-sua", "Oyster mee sua", "蚵仔面线", "蚵仔麵線|oyster vermicelli|mee sua", "ch", "N", 450,
  "wheat vermicelli (mee sua) 120 staple; oysters 50 protein; pork intestines 30 protein; pork stock 200 liquid;"
  "sweet potato starch 15 thicken; bonito flakes 3 flavour-oil; black vinegar 8 sour; garlic 6 aromatic;"
  "coriander 3 garnish; fried shallots 5 garnish")
D("jajangmyeon", "Jajangmyeon", "韩式炸酱面", "jjajangmyeon|짜장면|korean black bean noodles", "ko", "N", 550,
  "wheat noodles 250 staple; pork belly 50 protein; black bean paste (chunjang) 40 season; onion 70 vegetable;"
  "zucchini 40 vegetable; potato 30 vegetable; cabbage 20 vegetable; vegetable oil 15 fat; potato starch 8 thicken;"
  "sugar 5 sweeten; cucumber 15 garnish")

# ---------------------------------------------------------------- Rice plates and porridge
D("hainanese-chicken-rice", "Hainanese chicken rice", "海南鸡饭", "chicken rice|海南雞飯|white chicken rice|steamed chicken rice", "ch", "R", 400,
  "jasmine rice 220 staple; poached chicken 100 protein; chicken fat 10 fat; garlic 8 aromatic; ginger 8 aromatic;"
  "pandan leaves 2 aromatic; chilli sauce 15 heat; dark soy sauce 8 season; cucumber 25 vegetable;"
  "sesame oil 4 flavour-oil; shallots 6 aromatic")
D("roast-chicken-rice", "Roasted chicken rice", "烧鸡饭", "roast chicken rice|燒雞飯|烤鸡饭", "ch", "R", 420,
  "jasmine rice 220 staple; roasted chicken 110 protein; chicken fat 10 fat; honey 6 sweeten; dark soy sauce 10 season;"
  "oyster sauce 6 season; garlic 8 aromatic; ginger 6 aromatic; chilli sauce 15 heat; cucumber 25 vegetable")
D("soy-sauce-chicken-rice", "Soy sauce chicken rice", "豉油鸡饭", "see yao gai|豉油雞飯|soya sauce chicken", "ch", "R", 430,
  "jasmine rice 220 staple; chicken thigh 110 protein; light soy sauce 15 season; dark soy sauce 15 season;"
  "rock sugar 8 sweeten; Shaoxing wine 8 flavour-oil; star anise 1 aromatic; ginger 6 aromatic;"
  "spring onion 5 garnish; bok choy 40 vegetable")
D("braised-duck-rice", "Teochew braised duck rice", "卤鸭饭", "braised duck rice|滷鴨飯|lor ark png", "ch", "R", 450,
  "jasmine rice 220 staple; braised duck 90 protein; braised eggs 50 protein; firm tofu 30 protein;"
  "dark soy sauce 10 season; galangal 3 aromatic; star anise 1 aromatic; garlic 6 aromatic;"
  "garlic chilli vinegar 10 heat; cucumber 20 vegetable; braising sauce 20 season")
D("roast-duck-rice", "Roast duck rice", "烧鸭饭", "燒鴨飯|siu ngap fan|cantonese roast duck rice", "ch", "R", 430,
  "jasmine rice 220 staple; roast duck 110 protein; roast duck gravy 30 season; maltose 5 sweeten;"
  "five-spice powder 1 season; dark soy sauce 8 season; cucumber 20 vegetable; chilli sauce 12 heat;"
  "bok choy 30 vegetable")
D("char-siu-rice", "Char siu rice", "叉烧饭", "char siew rice|barbecued pork rice|叉燒飯", "ch", "R", 400,
  "jasmine rice 220 staple; char siu 80 protein; char siu sauce 25 sweeten; maltose 5 sweeten;"
  "light soy sauce 6 season; cucumber 20 vegetable; chilli sauce 12 heat; bok choy 30 vegetable")
D("roast-pork-rice", "Roast pork rice", "烧肉饭", "siu yuk rice|sio bak png|燒肉飯|crispy pork belly rice", "ch", "R", 400,
  "jasmine rice 220 staple; roast pork belly 90 protein; salt 2 season; five-spice powder 1 season;"
  "mustard 8 heat; light soy sauce 6 season; cucumber 20 vegetable; char siu sauce 20 sweeten;"
  "bok choy 30 vegetable")
D("claypot-rice", "Claypot chicken rice", "瓦煲饭", "claypot rice|煲仔饭|砂煲鸡饭|煲仔飯", "ch", "R", 430,
  "jasmine rice 250 staple; chicken thigh 80 protein; Chinese sausage 25 protein; salted fish 8 season;"
  "shiitake mushrooms 10 vegetable; dark soy sauce 15 season; oyster sauce 8 season; ginger 5 aromatic;"
  "sesame oil 4 flavour-oil; lard 10 fat; spring onion 3 garnish")
D("hainanese-curry-rice", "Hainanese curry rice", "海南咖喱饭", "scissors-cut curry rice|剪刀饭|海南咖哩飯|curry rice", "ch", "R", 560,
  "jasmine rice 250 staple; chicken thigh 70 protein; potato 30 vegetable; coconut milk 30 creamy;"
  "curry powder 5 season; onion 15 aromatic; braised cabbage 50 vegetable; fried pork cutlet 50 protein;"
  "dark soy sauce 10 season; braised pork gravy 30 liquid; vegetable oil 10 fat",
  rec="usda-fndds:2706438")
D("teochew-porridge", "Teochew porridge", "潮州粥", "teochew muay|潮州糜|plain porridge with sides", "ch", "R", 480,
  "rice porridge 300 staple; braised duck 40 protein; salted egg 30 protein; steamed fish 40 protein;"
  "preserved radish omelette 30 protein; salted vegetables 20 vegetable; braised peanuts 20 protein")
D("cantonese-porridge", "Cantonese porridge", "广东粥", "century egg pork porridge|pork porridge|皮蛋瘦肉粥|廣東粥|jook", "ch", "B", 460,
  "jasmine rice 60 staple; water 300 liquid; minced pork 40 protein; century egg 30 protein; pork liver 15 protein;"
  "ginger 5 aromatic; spring onion 3 garnish; you tiao 10 garnish; sesame oil 2 flavour-oil; white pepper 1 season",
  rec="taiwan-fda:R0100101")
D("fish-porridge", "Fish porridge", "鱼片粥", "fish congee|魚片粥|sliced fish porridge", "ch", "B", 450,
  "jasmine rice 60 staple; fish stock 300 liquid; sliced fish 70 protein; ginger 6 aromatic; spring onion 3 garnish;"
  "fried shallots 4 garnish; sesame oil 2 flavour-oil; light soy sauce 5 season",
  rec="usda-fndds:2708981")
D("frog-porridge", "Claypot frog leg porridge", "田鸡粥", "frog porridge|田雞粥|kung pao frog porridge", "ch", "R", 500,
  "jasmine rice 60 staple; water 250 liquid; frog legs 120 protein; dried chilli 5 heat; dark soy sauce 15 season;"
  "oyster sauce 8 season; ginger 8 aromatic; spring onion 8 garnish; Shaoxing wine 8 flavour-oil; vegetable oil 15 fat")
D("egg-fried-rice", "Egg fried rice", "蛋炒饭", "蛋炒飯|chinese egg fried rice", "ch", "R", 340,
  "jasmine rice 250 staple; eggs 50 protein; spring onion 10 garnish; vegetable oil 20 fat;"
  "light soy sauce 8 season; salt 1 season; white pepper 1 season",
  rec="uk-cofid:11-444")
D("yangzhou-fried-rice", "Yangzhou fried rice", "扬州炒饭", "yang chow fried rice|揚州炒飯|yeung chow fried rice", "ch", "R", 410,
  "jasmine rice 250 staple; char siu 40 protein; prawns 30 protein; eggs 40 protein; green peas 20 vegetable;"
  "spring onion 8 garnish; vegetable oil 20 fat; light soy sauce 8 season",
  rec="usda-fndds:2708954")
D("salted-fish-fried-rice", "Salted fish chicken fried rice", "咸鱼鸡粒炒饭", "salted fish fried rice|鹹魚雞粒炒飯", "ch", "R", 400,
  "jasmine rice 250 staple; salted fish 15 season; chicken thigh 50 protein; eggs 40 protein; lettuce 20 vegetable;"
  "garlic 8 aromatic; vegetable oil 20 fat; light soy sauce 6 season; spring onion 6 garnish")
D("lu-rou-fan", "Taiwanese braised pork rice", "卤肉饭", "lu rou fan|滷肉飯|braised minced pork rice", "ch", "R", 380,
  "jasmine rice 220 staple; pork belly 80 protein; dark soy sauce 12 season; light soy sauce 8 season;"
  "rock sugar 6 sweeten; fried shallots 10 aromatic; five-spice powder 1 season; braised egg 25 protein;"
  "pickled radish 10 sour; Shaoxing wine 5 flavour-oil")
D("hk-steamed-fish", "Steamed fish Hong Kong style", "港式蒸鱼", "steamed fish|清蒸鱼|steamed fish with soy sauce", "ch", "W", 290,
  "seabass 220 protein; light soy sauce 15 season; ginger 10 aromatic; spring onion 10 garnish;"
  "coriander 3 garnish; vegetable oil 15 fat; sugar 3 sweeten; Shaoxing wine 5 flavour-oil")
D("chicken-adobo", "Chicken adobo with rice", "菲律宾酱醋鸡饭", "adobong manok|adobo|chicken adobo rice", "fi", "R", 420,
  "jasmine rice 200 staple; chicken thigh 120 protein; soy sauce 20 season; cane vinegar 20 sour;"
  "garlic 12 aromatic; bay leaves 1 aromatic; black peppercorns 2 heat; vegetable oil 10 fat; brown sugar 5 sweeten")
D("nasi-lemak", "Nasi lemak", "椰浆饭", "nasi lemak ayam|椰漿飯", "ma", "R", 420,
  "jasmine rice 170 staple; coconut milk 30 creamy; pandan leaves 2 aromatic; fried chicken wing 90 protein;"
  "fried egg 50 protein; dried anchovies (ikan bilis) 15 protein; peanuts 15 garnish;"
  "sambal chilli with belacan 30 heat; cucumber 20 vegetable")
D("nasi-goreng", "Nasi goreng", "马来炒饭", "nasi goreng kampung|indonesian fried rice|印尼炒饭", "ma", "R", 430,
  "jasmine rice 250 staple; eggs 50 protein; chicken 40 protein; prawns 20 protein; shrimp paste (belacan) 5 season;"
  "sweet soy sauce (kecap manis) 15 sweeten; shallots 15 aromatic; garlic 6 aromatic; red chilli 8 heat;"
  "vegetable oil 15 fat; fried shallots 3 garnish")
D("nasi-biryani-chicken", "Chicken biryani", "鸡肉黄姜饭", "nasi briyani ayam|chicken briyani|chicken biryani rice|鸡肉印度香饭", "in", "R", 500,
  "basmati rice 230 staple; chicken thigh 130 protein; ghee 15 fat; yoghurt 30 creamy; onion 40 aromatic;"
  "garlic 6 aromatic; ginger 6 aromatic; biryani spices 6 season; mint 3 garnish; tomato 25 vegetable;"
  "fried shallots 8 garnish",
  rec="uk-cofid:19-454")
D("nasi-biryani-mutton", "Mutton biryani", "羊肉印度香饭", "nasi briyani kambing|mutton briyani|羊肉黄姜饭", "in", "R", 500,
  "basmati rice 230 staple; mutton 120 protein; ghee 15 fat; yoghurt 30 creamy; onion 40 aromatic;"
  "garlic 6 aromatic; ginger 6 aromatic; biryani spices 6 season; mint 3 garnish; tomato 25 vegetable;"
  "fried shallots 8 garnish",
  rec="uk-cofid:19-591")
D("nasi-padang", "Nasi padang", "巴东饭", "padang rice|nasi campur padang", "id", "R", 500,
  "jasmine rice 220 staple; beef rendang 70 protein; ayam bakar 70 protein; cassava leaves curry 50 vegetable;"
  "coconut milk 30 creamy; sambal hijau 20 heat; hard-boiled egg 50 protein; shallots 10 aromatic")
D("ayam-penyet", "Ayam penyet", "印尼炸鸡饭", "smashed fried chicken|ayam penyet rice", "id", "R", 470,
  "chicken leg 200 protein; jasmine rice 150 staple; sambal terasi 30 heat; tempeh 30 protein; tofu 30 protein;"
  "cucumber 20 vegetable; galangal 5 aromatic; turmeric 3 season; vegetable oil 20 fat")
D("ayam-masak-merah", "Ayam masak merah with rice", "番茄辣鸡饭", "ayam masak merah|chicken in red gravy", "ma", "R", 480,
  "jasmine rice 220 staple; chicken thigh 120 protein; tomato puree 40 sour; dried chilli paste 20 heat;"
  "onion 30 aromatic; garlic 8 aromatic; ginger 6 aromatic; sugar 8 sweeten; vegetable oil 15 fat;"
  "evaporated milk 15 creamy")
D("ayam-buah-keluak", "Ayam buah keluak", "黑果鸡", "buah keluak chicken|chicken buah keluak", "pe", "W", 300,
  "chicken thigh 150 protein; buah keluak nuts 30 flavour-oil; tamarind 15 sour; shrimp paste (belacan) 6 season;"
  "shallots 25 aromatic; lemongrass 8 aromatic; galangal 8 aromatic; candlenuts 8 thicken; dried chilli 10 heat;"
  "vegetable oil 15 fat; water 50 liquid")
D("babi-pongteh", "Babi pongteh", "娘惹炖猪肉", "pongteh|ayam pongteh|braised pork with taucheo", "pe", "W", 300,
  "pork belly 150 protein; fermented soybean paste (taucheo) 20 season; shallots 30 aromatic; garlic 12 aromatic;"
  "dark soy sauce 10 season; palm sugar 10 sweeten; potato 50 vegetable; shiitake mushrooms 15 vegetable;"
  "water 40 liquid")
D("bibimbap", "Bibimbap", "韩式拌饭", "dolsot bibimbap|비빔밥|拌饭", "ko", "R", 500,
  "short-grain rice 220 staple; beef mince 50 protein; fried egg 50 protein; spinach 30 vegetable;"
  "bean sprouts 30 vegetable; carrot 25 vegetable; zucchini 25 vegetable; shiitake mushrooms 20 vegetable;"
  "gochujang 20 heat; sesame oil 8 flavour-oil; garlic 5 aromatic",
  rec="usda-fndds:2708950")
D("kimchi-fried-rice", "Kimchi fried rice", "泡菜炒饭", "kimchi bokkeumbap|김치볶음밥|泡菜炒飯", "ko", "R", 420,
  "short-grain rice 220 staple; kimchi 80 vegetable; pork belly 40 protein; fried egg 50 protein;"
  "gochujang 10 heat; sesame oil 5 flavour-oil; vegetable oil 10 fat; spring onion 5 garnish; seaweed 2 garnish")
D("japanese-curry-rice", "Japanese curry rice", "日式咖喱饭", "kare raisu|カレーライス|日式咖哩飯", "ja", "R", 520,
  "short-grain rice 230 staple; pork shoulder 70 protein; potato 50 vegetable; carrot 30 vegetable; onion 50 aromatic;"
  "curry roux 30 thicken; water 60 liquid; vegetable oil 8 fat")
D("katsu-curry", "Katsu curry", "日式炸猪排咖喱饭", "katsu kare|カツカレー|tonkatsu curry", "ja", "R", 600,
  "short-grain rice 230 staple; pork loin 120 protein; panko breadcrumbs 20 coat; eggs 15 bind; wheat flour 10 coat;"
  "vegetable oil 20 fat; curry roux 30 thicken; potato 40 vegetable; carrot 25 vegetable; onion 40 aromatic;"
  "water 60 liquid")
D("katsudon", "Katsudon", "炸猪排盖饭", "katsu don|カツ丼|pork cutlet rice bowl", "ja", "R", 550,
  "short-grain rice 230 staple; pork loin 110 protein; panko breadcrumbs 20 coat; eggs 80 protein; wheat flour 10 coat;"
  "vegetable oil 20 fat; dashi 50 liquid; soy sauce 12 season; mirin 12 sweeten; onion 40 aromatic")
D("oyakodon", "Oyakodon", "亲子丼", "親子丼|chicken and egg rice bowl|oyako don", "ja", "R", 500,
  "short-grain rice 230 staple; chicken thigh 90 protein; eggs 100 protein; onion 40 aromatic; dashi 60 liquid;"
  "soy sauce 12 season; mirin 12 sweeten; sugar 4 sweeten; mitsuba 2 garnish")
D("gyudon", "Gyudon", "牛肉盖饭", "beef bowl|牛丼|gyu don", "ja", "R", 480,
  "short-grain rice 230 staple; beef slices 90 protein; onion 60 aromatic; dashi 50 liquid; soy sauce 12 season;"
  "mirin 12 sweeten; sugar 5 sweeten; pickled ginger 10 garnish; ginger 3 aromatic")
D("unagi-don", "Unagi don", "鳗鱼饭", "unadon|鰻魚飯|eel rice bowl", "ja", "R", 380,
  "short-grain rice 230 staple; grilled eel 100 protein; eel sauce (tare) 25 sweeten; mirin 8 sweeten;"
  "soy sauce 8 season; sansho pepper 1 heat; spring onion 3 garnish")
D("chirashi-don", "Chirashi don", "散寿司饭", "chirashizushi|ちらし寿司|sashimi rice bowl", "ja", "R", 420,
  "sushi rice 230 staple; rice vinegar 15 sour; salmon sashimi 50 protein; tuna sashimi 40 protein;"
  "prawns 20 protein; salmon roe 10 protein; tamagoyaki 30 protein; cucumber 15 vegetable; pickled ginger 8 garnish;"
  "soy sauce 10 season")
D("omurice", "Omurice", "蛋包饭", "omelette rice|オムライス|蛋包飯", "ja", "R", 450,
  "short-grain rice 200 staple; chicken thigh 50 protein; eggs 100 protein; tomato ketchup 40 sweeten;"
  "onion 30 aromatic; butter 12 fat; green peas 10 vegetable; milk 10 creamy")
D("thai-basil-chicken", "Thai basil chicken rice", "泰式打抛鸡饭", "pad kra pao|phat kaphrao|basil minced chicken|打拋雞", "th", "R", 460,
  "jasmine rice 220 staple; minced chicken 100 protein; fried egg 50 protein; holy basil 10 aromatic;"
  "garlic 10 aromatic; bird's eye chilli 6 heat; oyster sauce 10 season; fish sauce 8 season;"
  "dark soy sauce 5 season; sugar 4 sweeten; vegetable oil 20 fat; long beans 20 vegetable")
D("pineapple-fried-rice", "Thai pineapple fried rice", "泰式菠萝炒饭", "khao pad sapparot|菠蘿炒飯|pineapple rice", "th", "R", 420,
  "jasmine rice 230 staple; pineapple 60 vegetable; prawns 40 protein; eggs 40 protein; cashew nuts 15 garnish;"
  "raisins 10 sweeten; curry powder 3 season; fish sauce 8 season; shallots 10 aromatic; vegetable oil 15 fat;"
  "chicken floss 5 garnish")
D("com-tam", "Com tam", "越南碎米饭", "broken rice|cơm tấm|vietnamese pork chop rice", "vi", "R", 480,
  "broken rice 220 staple; grilled pork chop 120 protein; fish sauce 15 season; lemongrass 8 aromatic;"
  "garlic 8 aromatic; sugar 10 sweeten; fried egg 50 protein; pickled carrot and daikon 30 sour;"
  "cucumber 20 vegetable; spring onion oil 8 flavour-oil")
D("tahu-telur", "Tahu telur", "印尼豆腐蛋", "tofu omelette|tahu telor", "id", "W", 300,
  "firm tofu 100 protein; eggs 100 protein; peanut sauce 50 creamy; sweet soy sauce (kecap manis) 15 sweeten;"
  "bean sprouts 20 vegetable; cucumber 15 vegetable; fried shallots 5 garnish; vegetable oil 15 fat")

# ---------------------------------------------------------------- Zi char and with-rice dishes
D("chilli-crab", "Chilli crab", "辣椒螃蟹", "chili crab|辣椒蟹|singapore chilli crab", "ch", "W", 450,
  "mud crab 250 protein; tomato ketchup 30 sweeten; chilli sauce 25 heat; eggs 25 bind; garlic 10 aromatic;"
  "shallots 15 aromatic; red chilli 15 heat; sugar 10 sweeten; corn starch 5 thicken; chicken stock 60 liquid;"
  "ginger 5 aromatic")
D("black-pepper-crab", "Black pepper crab", "黑胡椒螃蟹", "黑胡椒蟹|pepper crab", "ch", "W", 330,
  "mud crab 250 protein; black pepper 8 heat; butter 25 fat; oyster sauce 12 season; dark soy sauce 8 season;"
  "garlic 12 aromatic; shallots 10 aromatic; curry leaves 2 aromatic; sugar 5 sweeten")
D("cereal-prawns", "Cereal prawns", "麦片虾", "butter cereal prawns|麥片蝦|oat prawns", "ch", "W", 240,
  "prawns 150 protein; instant oat cereal 30 coat; butter 20 fat; curry leaves 3 aromatic; bird's eye chilli 3 heat;"
  "sugar 5 sweeten; milk powder 10 coat; egg yolk 10 bind; corn starch 10 coat")
D("salted-egg-prawns", "Salted egg yolk prawns", "咸蛋虾", "鹹蛋蝦|golden prawns", "ch", "W", 240,
  "prawns 150 protein; salted egg yolks 40 protein; butter 20 fat; curry leaves 3 aromatic; corn starch 12 coat;"
  "bird's eye chilli 3 heat; sugar 4 sweeten; evaporated milk 10 creamy")
D("sweet-and-sour-pork", "Sweet and sour pork", "咕噜肉", "gu lou yuk|goo lou yok|咕嚕肉|甜酸肉", "ch", "W", 260,
  "pork shoulder 120 protein; corn starch 20 coat; eggs 10 bind; pineapple 30 vegetable; bell pepper 20 vegetable;"
  "onion 20 aromatic; tomato ketchup 20 sweeten; white vinegar 8 sour; sugar 10 sweeten; vegetable oil 15 fat",
  rec="usda-fndds:2706401")
D("kung-pao-chicken", "Kung pao chicken", "宫保鸡丁", "gong bao chicken|宮保雞丁|kung po chicken", "ch", "W", 230,
  "chicken thigh 130 protein; dried chilli 5 heat; Sichuan peppercorn 2 heat; peanuts 20 garnish;"
  "spring onion 15 vegetable; garlic 6 aromatic; ginger 5 aromatic; light soy sauce 8 season; black vinegar 8 sour;"
  "sugar 6 sweeten; vegetable oil 15 fat; corn starch 5 thicken",
  rec="usda-fndds:2706796")
D("mapo-tofu", "Mapo tofu", "麻婆豆腐", "mapo doufu|ma po tofu|麻婆豆腐饭", "ch", "W", 310,
  "silken tofu 180 protein; minced pork 40 protein; chilli bean paste (doubanjiang) 15 season;"
  "fermented black beans 5 season; Sichuan peppercorn 2 heat; chilli oil 10 heat; garlic 6 aromatic;"
  "ginger 4 aromatic; chicken stock 40 liquid; corn starch 5 thicken; spring onion 5 garnish",
  rec="japan-mext:18049")
D("beef-broccoli", "Beef with broccoli", "西兰花炒牛肉", "beef and broccoli|芥兰牛肉|西蘭花牛肉", "ch", "W", 260,
  "beef flank 100 protein; broccoli 110 vegetable; oyster sauce 12 season; light soy sauce 8 season;"
  "garlic 6 aromatic; ginger 4 aromatic; corn starch 5 thicken; vegetable oil 15 fat; sugar 3 sweeten",
  rec="usda-fndds:2706738")
D("black-pepper-beef", "Black pepper beef", "黑椒牛肉", "黑椒牛柳|black pepper beef cubes", "ch", "W", 250,
  "beef sirloin 130 protein; onion 40 aromatic; bell pepper 30 vegetable; black pepper 5 heat;"
  "oyster sauce 12 season; dark soy sauce 6 season; butter 10 fat; garlic 6 aromatic; corn starch 5 thicken")
D("har-cheong-gai", "Har cheong gai", "虾酱鸡", "prawn paste chicken|shrimp paste chicken|蝦醬雞", "ch", "W", 250,
  "chicken wings 200 protein; fermented shrimp paste 15 season; corn starch 15 coat; sugar 3 sweeten;"
  "Shaoxing wine 5 flavour-oil; vegetable oil 15 fat")
D("lemon-chicken", "Lemon chicken", "柠檬鸡", "檸檬雞|cantonese lemon chicken", "ch", "W", 250,
  "chicken thigh 150 protein; eggs 15 bind; corn starch 20 coat; lemon juice 15 sour; sugar 15 sweeten;"
  "custard powder 5 thicken; vegetable oil 20 fat; lemon slices 10 garnish")
D("coffee-pork-ribs", "Coffee pork ribs", "咖啡排骨", "coffee spare ribs|kopi pork ribs", "ch", "W", 250,
  "pork ribs 180 protein; instant coffee 5 flavour-oil; corn starch 15 coat; sugar 15 sweeten; butter 10 fat;"
  "eggs 10 bind; vegetable oil 15 fat")
D("marmite-chicken", "Marmite chicken", "妈蜜鸡", "媽蜜雞|marmite pork ribs", "ch", "W", 240,
  "chicken thigh 160 protein; yeast extract (Marmite) 12 season; honey 15 sweeten; maltose 10 sweeten;"
  "corn starch 15 coat; eggs 10 bind; vegetable oil 15 fat; sesame seeds 3 garnish")
D("sambal-kangkong", "Sambal kangkong", "马来风光", "kangkong belacan|馬來風光|stir-fried water spinach with sambal", "ma", "W", 210,
  "water spinach 150 vegetable; shrimp paste (belacan) 8 season; dried shrimp 8 flavour-oil; red chilli 10 heat;"
  "shallots 10 aromatic; garlic 6 aromatic; vegetable oil 15 fat")
D("kai-lan-oyster-sauce", "Kai lan with oyster sauce", "蚝油芥兰", "kailan oyster sauce|蠔油芥蘭|chinese broccoli", "ch", "W", 200,
  "kai lan 160 vegetable; oyster sauce 15 season; garlic 8 aromatic; vegetable oil 10 fat; sugar 2 sweeten;"
  "Shaoxing wine 5 flavour-oil")
D("hotplate-tofu", "Hotplate tofu", "铁板豆腐", "sizzling tofu|鐵板豆腐|hot plate egg tofu", "ch", "W", 330,
  "egg tofu 150 protein; minced pork 30 protein; prawns 20 protein; eggs 50 protein; oyster sauce 10 season;"
  "mushrooms 20 vegetable; carrot 10 vegetable; corn starch 5 thicken; chicken stock 40 liquid; vegetable oil 10 fat")
D("steamed-egg", "Chinese steamed egg", "蒸蛋", "水蒸蛋|steamed egg custard|chinese chawanmushi", "ch", "W", 200,
  "eggs 100 protein; chicken stock 90 liquid; light soy sauce 5 season; sesame oil 2 flavour-oil; spring onion 2 garnish")
D("three-egg-spinach", "Three-egg spinach", "三皇蛋苋菜", "spinach with three eggs|三蛋苋菜|superior spinach", "ch", "W", 300,
  "Chinese spinach 150 vegetable; century egg 25 protein; salted egg 25 protein; eggs 30 protein;"
  "garlic 10 aromatic; chicken stock 60 liquid; vegetable oil 10 fat")
D("chai-poh-omelette", "Preserved radish omelette", "菜脯蛋", "chai poh neng|chai poh egg|菜埔蛋", "ch", "W", 150,
  "eggs 100 protein; preserved radish (chai poh) 25 season; garlic 5 aromatic; vegetable oil 15 fat; spring onion 3 garnish")
D("fu-yong-egg", "Fu yong egg", "芙蓉蛋", "egg foo young|芙蓉蛋饭|prawn omelette", "ch", "W", 220,
  "eggs 120 protein; prawns 30 protein; char siu 20 protein; onion 25 aromatic; bean sprouts 15 vegetable;"
  "light soy sauce 5 season; vegetable oil 15 fat",
  rec="usda-fndds:2707196")
D("mui-choy-kong-bak", "Braised pork belly with preserved mustard", "梅菜扣肉", "mui choy kong bak|mei cai kou rou|kong bak", "ch", "W", 260,
  "pork belly 150 protein; preserved mustard greens (mui choy) 50 vegetable; dark soy sauce 12 season;"
  "light soy sauce 8 season; rock sugar 10 sweeten; garlic 8 aromatic; Shaoxing wine 8 flavour-oil;"
  "five-spice powder 1 season; vegetable oil 10 fat")
D("tau-yu-bak", "Tau yu bak", "豆油肉", "hokkien braised pork|soy braised pork belly|卤肉", "ch", "W", 310,
  "pork belly 150 protein; eggs 50 protein; tau pok 30 protein; dark soy sauce 20 season; light soy sauce 10 season;"
  "garlic 10 aromatic; star anise 1 aromatic; cinnamon 1 aromatic; rock sugar 8 sweeten; water 30 liquid")
D("chap-chye", "Nonya chap chye", "娘惹杂菜", "chap chye|peranakan mixed vegetables|什菜|杂菜", "pe", "W", 270,
  "cabbage 120 vegetable; glass noodles 20 staple; dried shiitake 10 vegetable; wood ear fungus 8 vegetable;"
  "dried lily buds 5 vegetable; dried beancurd skin 10 protein; dried shrimp 8 flavour-oil;"
  "fermented soybean paste (taucheo) 10 season; pork belly 20 protein; garlic 6 aromatic;"
  "vegetable oil 10 fat; prawn stock 40 liquid")
D("sambal-sotong", "Sambal sotong", "参巴苏东", "sambal squid|叁巴苏东|sotong sambal", "ma", "W", 230,
  "squid 150 protein; sambal chilli paste 35 heat; shrimp paste (belacan) 5 season; onion 20 aromatic;"
  "tamarind 8 sour; sugar 6 sweeten; vegetable oil 15 fat")

D("sambal-stingray", "Sambal stingray", "参巴魔鬼鱼", "bbq stingray|ikan pari bakar|烧魔鬼鱼|ikan bakar", "ma", "W", 250,
  "stingray 180 protein; sambal chilli paste 40 heat; shrimp paste (belacan) 5 season; shallots 10 aromatic;"
  "lime 5 sour; onion 10 aromatic")
D("assam-fish", "Assam fish", "亚参鱼", "assam pedas|ikan asam pedas|亞參魚", "pe", "W", 440,
  "red snapper 180 protein; tamarind 25 sour; okra 40 vegetable; eggplant 50 vegetable; tomato 30 vegetable;"
  "laksa leaves 2 aromatic; shrimp paste (belacan) 5 season; chilli paste 20 heat; shallots 15 aromatic;"
  "lemongrass 8 aromatic; sugar 5 sweeten; water 60 liquid")
D("udang-masak-nanas", "Prawn and pineapple curry", "黄姜椰浆虾", "udang masak lemak nanas|pineapple prawn curry|gulai udang nanas", "pe", "W", 330,
  "prawns 130 protein; pineapple 70 vegetable; coconut milk 70 creamy; turmeric 3 season; lemongrass 8 aromatic;"
  "shallots 20 aromatic; candlenuts 6 thicken; red chilli 10 heat; shrimp paste (belacan) 4 season;"
  "tamarind 5 sour")
D("fish-head-curry", "Fish head curry", "咖喱鱼头", "curry fish head|咖哩魚頭", "in", "W", 540,
  "red snapper head 200 protein; okra 40 vegetable; eggplant 50 vegetable; tomato 30 vegetable; tamarind 15 sour;"
  "coconut milk 50 creamy; fish curry powder 10 season; shallots 20 aromatic; garlic 8 aromatic;"
  "curry leaves 2 aromatic; vegetable oil 20 fat; fish stock 100 liquid")
D("curry-chicken", "Curry chicken", "咖喱鸡", "kari ayam|chicken curry|咖哩雞|chicken curry with potato", "ma", "W", 350,
  "chicken thigh 120 protein; potato 60 vegetable; coconut milk 60 creamy; curry powder 8 season;"
  "shallots 20 aromatic; garlic 8 aromatic; lemongrass 5 aromatic; ginger 5 aromatic; vegetable oil 15 fat;"
  "chicken stock 50 liquid",
  rec="usda-fndds:2706437")
D("beef-rendang", "Beef rendang", "牛肉仁当", "rendang daging|仁當|rendang", "ma", "W", 280,
  "beef chuck 150 protein; coconut milk 60 creamy; toasted coconut (kerisik) 15 thicken; shallots 20 aromatic;"
  "garlic 8 aromatic; galangal 8 aromatic; lemongrass 8 aromatic; dried chilli 10 heat; turmeric leaf 2 aromatic;"
  "palm sugar 5 sweeten")

D("mutton-curry", "Mutton curry", "咖喱羊肉", "kari kambing|咖哩羊肉|mutton masala", "in", "W", 320,
  "mutton 150 protein; potato 50 vegetable; onion 40 aromatic; tomato 30 vegetable; ginger 6 aromatic;"
  "garlic 8 aromatic; meat curry powder 10 season; yoghurt 15 creamy; ghee 10 fat; curry leaves 2 aromatic")
D("mutton-rogan-josh", "Lamb rogan josh", "印度羊肉咖喱", "rogan josh|mutton rogan josh", "in", "W", 320,
  "lamb shoulder 160 protein; yoghurt 40 creamy; onion 40 aromatic; tomato 30 vegetable; ghee 15 fat;"
  "Kashmiri chilli powder 4 heat; garlic 8 aromatic; ginger 6 aromatic; garam masala 3 season; fennel 2 aromatic",
  rec="uk-cofid:19-595")
D("chicken-tikka-masala", "Chicken tikka masala", "印度奶油番茄鸡", "tikka masala|chicken tikka", "in", "W", 330,
  "chicken breast 150 protein; yoghurt 30 creamy; cream 40 creamy; tomato puree 50 sour; onion 30 aromatic;"
  "butter 10 fat; garlic 6 aromatic; ginger 6 aromatic; garam masala 3 season; paprika 3 season",
  rec="uk-cofid:19-296")
D("butter-chicken", "Butter chicken", "黄油鸡", "murgh makhani|butter chicken masala|印度黄油鸡", "in", "W", 330,
  "chicken thigh 150 protein; butter 25 fat; cream 40 creamy; tomato puree 60 sour; yoghurt 20 creamy;"
  "cashew nuts 15 thicken; garlic 6 aromatic; ginger 6 aromatic; kasuri methi 1 aromatic; garam masala 3 season")
D("chicken-korma", "Chicken korma", "印度奶油鸡咖喱", "korma|kurma ayam|chicken kurma", "in", "W", 320,
  "chicken breast 150 protein; yoghurt 40 creamy; cream 30 creamy; ground almonds 15 thicken; onion 40 aromatic;"
  "ghee 12 fat; garlic 6 aromatic; ginger 6 aromatic; cardamom 1 aromatic; coconut milk 20 creamy",
  rec="uk-cofid:19-565")
D("tandoori-chicken", "Tandoori chicken", "唐杜里烤鸡", "tandoori ayam|印度烤鸡", "in", "W", 220,
  "chicken leg 170 protein; yoghurt 30 creamy; lemon juice 8 sour; Kashmiri chilli powder 4 heat;"
  "garlic 6 aromatic; ginger 6 aromatic; garam masala 3 season; ghee 5 fat",
  rec="uk-cofid:19-540")
D("dhal", "Dhal", "印度扁豆咖喱", "dal|masoor dal|dhal curry|parippu", "in", "W", 250,
  "red lentils 70 protein; water 120 liquid; tomato 25 vegetable; onion 20 aromatic; ghee 10 fat; turmeric 1 season;"
  "cumin seeds 2 aromatic; garlic 5 aromatic; curry leaves 1 aromatic; green chilli 3 heat",
  rec="uk-cofid:15-763")
D("palak-paneer", "Palak paneer", "菠菜奶酪", "saag paneer|palak panir", "in", "W", 250,
  "spinach 140 vegetable; paneer 60 protein; cream 15 creamy; onion 20 aromatic; ghee 8 fat; garlic 5 aromatic;"
  "ginger 4 aromatic; green chilli 3 heat; garam masala 2 season",
  rec="usda-fndds:2709631")
D("chicken-teriyaki", "Chicken teriyaki", "照烧鸡", "teriyaki chicken|照燒雞|tori teriyaki", "ja", "W", 200,
  "chicken thigh 160 protein; soy sauce 15 season; mirin 15 sweeten; sake 8 flavour-oil; sugar 6 sweeten;"
  "vegetable oil 5 fat",
  rec="usda-fndds:2706433")
D("chicken-karaage", "Chicken karaage", "日式炸鸡", "karaage|唐揚げ|から揚げ|japanese fried chicken", "ja", "W", 180,
  "chicken thigh with skin 140 protein; soy sauce 8 season; sake 5 flavour-oil; ginger 4 aromatic; garlic 4 aromatic;"
  "potato starch 15 coat; vegetable oil 10 fat",
  rec="japan-mext:11289")
D("tonkatsu", "Tonkatsu", "日式炸猪排", "pork katsu|豚カツ|とんかつ|炸豬排", "ja", "W", 160,
  "pork loin 130 protein; wheat flour 8 coat; eggs 12 bind; panko breadcrumbs 15 coat; vegetable oil 15 fat",
  rec="japan-mext:11276")
D("prawn-tempura", "Prawn tempura", "炸虾天妇罗", "ebi tempura|海老天ぷら|shrimp tempura|天婦羅蝦", "ja", "K", 150,
  "prawns 100 protein; tempura flour 20 coat; eggs 8 bind; ice water 10 liquid; vegetable oil 12 fat",
  rec="japan-mext:10416")
D("hamburg-steak", "Japanese hamburg steak", "日式汉堡排", "hambagu|ハンバーグ|hamburg|日式漢堡排", "ja", "W", 200,
  "beef and pork mince 130 protein; onion 30 aromatic; panko breadcrumbs 10 bind; milk 10 creamy; eggs 15 bind;"
  "nutmeg 0.5 season; vegetable oil 5 fat",
  rec="japan-mext:18050")
D("nikujaga", "Nikujaga", "日式土豆炖肉", "肉じゃが|meat and potato stew|niku jaga", "ja", "W", 350,
  "beef slices 60 protein; potato 120 vegetable; onion 50 aromatic; carrot 30 vegetable; shirataki noodles 30 staple;"
  "dashi 40 liquid; soy sauce 12 season; mirin 10 sweeten; sugar 6 sweeten",
  rec="japan-mext:18036")
D("tamagoyaki", "Tamagoyaki", "日式玉子烧", "dashimaki tamago|卵焼き|japanese rolled omelette|玉子燒", "ja", "K", 120,
  "eggs 100 protein; dashi 10 liquid; sugar 6 sweeten; soy sauce 2 season; mirin 3 sweeten; vegetable oil 3 fat",
  rec="japan-mext:12018")
D("teriyaki-salmon", "Salmon teriyaki", "照烧三文鱼", "teriyaki salmon|サーモン照り焼き|照燒鮭魚", "ja", "W", 200,
  "salmon fillet 160 protein; soy sauce 12 season; mirin 12 sweeten; sake 6 flavour-oil; sugar 5 sweeten;"
  "vegetable oil 5 fat")
D("bulgogi", "Beef bulgogi", "韩式烤牛肉", "bulgogi|불고기|korean bbq beef", "ko", "W", 250,
  "beef ribeye 150 protein; soy sauce 15 season; Korean pear 25 sweeten; sugar 8 sweeten; garlic 10 aromatic;"
  "sesame oil 6 flavour-oil; onion 30 aromatic; spring onion 8 garnish; sesame seeds 2 garnish")
D("samgyeopsal", "Samgyeopsal", "韩式烤五花肉", "korean pork belly bbq|삼겹살|korean bbq pork belly", "ko", "W", 320,
  "pork belly 180 protein; lettuce 40 vegetable; perilla leaves 10 vegetable; garlic 15 aromatic;"
  "ssamjang 20 season; sesame oil 5 flavour-oil; kimchi 40 vegetable; green chilli 5 heat; salt 1 season")
D("dakgalbi", "Dakgalbi", "韩式辣炒鸡排", "spicy stir-fried chicken|닭갈비|春川辣炒鸡", "ko", "W", 400,
  "chicken thigh 160 protein; gochujang 25 heat; gochugaru 5 heat; cabbage 80 vegetable; sweet potato 50 vegetable;"
  "rice cakes (tteok) 40 staple; perilla leaves 5 aromatic; garlic 10 aromatic; soy sauce 10 season;"
  "sugar 8 sweeten; vegetable oil 10 fat")
D("korean-fried-chicken", "Korean fried chicken", "韩式炸鸡", "yangnyeom chicken|양념치킨|kfc korean|韓式炸雞", "ko", "W", 280,
  "chicken wings 200 protein; potato starch 20 coat; wheat flour 10 coat; gochujang 15 heat; honey 10 sweeten;"
  "corn syrup 10 sweeten; garlic 8 aromatic; soy sauce 8 season; vegetable oil 15 fat; sesame seeds 2 garnish")
D("japchae", "Japchae", "韩式杂菜", "잡채|korean glass noodles|chapchae", "ko", "N", 300,
  "sweet potato glass noodles 120 staple; beef strips 40 protein; spinach 40 vegetable; carrot 25 vegetable;"
  "onion 30 aromatic; shiitake mushrooms 20 vegetable; egg 20 protein; soy sauce 12 season; sugar 6 sweeten;"
  "sesame oil 8 flavour-oil; garlic 5 aromatic")
D("massaman-curry", "Massaman curry", "马沙文咖喱", "massaman beef|kaeng matsaman|瑪莎曼咖哩", "th", "W", 380,
  "beef chuck 130 protein; potato 80 vegetable; coconut milk 100 creamy; massaman curry paste (with shrimp paste) 25 season;"
  "peanuts 15 garnish; onion 30 aromatic; tamarind 8 sour; palm sugar 10 sweeten; fish sauce 8 season")
D("thai-green-curry", "Thai green curry chicken", "泰式青咖喱鸡", "kaeng khiao wan|green curry|綠咖哩雞", "th", "W", 380,
  "chicken thigh 130 protein; coconut milk 150 creamy; green curry paste (with shrimp paste) 25 season;"
  "Thai eggplant 40 vegetable; bamboo shoots 20 vegetable; Thai basil 5 aromatic; fish sauce 10 season;"
  "palm sugar 6 sweeten; kaffir lime leaves 2 aromatic",
  rec="uk-cofid:19-465")
D("thai-red-curry-duck", "Thai red curry duck", "泰式红咖喱鸭", "kaeng phet pet|red curry duck|紅咖哩鴨", "th", "W", 380,
  "roast duck 130 protein; coconut milk 150 creamy; red curry paste (with shrimp paste) 25 season; pineapple 30 vegetable;"
  "cherry tomatoes 20 vegetable; Thai basil 5 aromatic; fish sauce 10 season; palm sugar 6 sweeten;"
  "kaffir lime leaves 2 aromatic")
D("larb", "Larb gai", "泰式肉末沙拉", "laab|larb moo|minced meat salad", "th", "W", 220,
  "minced chicken 130 protein; lime juice 15 sour; fish sauce 12 season; toasted rice powder 8 thicken;"
  "shallots 20 aromatic; mint 5 garnish; coriander 5 garnish; dried chilli flakes 3 heat; spring onion 10 garnish")
D("sinigang", "Sinigang na baboy", "菲律宾酸汤", "sinigang|pork sinigang|tamarind soup", "fi", "S", 500,
  "pork ribs 120 protein; tamarind 30 sour; water 250 liquid; radish 40 vegetable; water spinach 30 vegetable;"
  "long beans 25 vegetable; tomato 30 vegetable; onion 20 aromatic; fish sauce 10 season; taro 30 thicken")
D("sisig", "Pork sisig", "菲律宾铁板猪肉", "sisig|sizzling sisig", "fi", "W", 250,
  "pork belly 120 protein; pork ears 40 protein; chicken liver 20 protein; onion 30 aromatic; calamansi 10 sour;"
  "soy sauce 8 season; bird's eye chilli 4 heat; eggs 25 protein; mayonnaise 10 creamy")
D("pancit-canton", "Pancit canton", "菲律宾炒面", "pancit|pansit canton|filipino stir-fried noodles", "fi", "N", 380,
  "wheat egg noodles 180 staple; chicken 40 protein; prawns 30 protein; pork 30 protein; cabbage 40 vegetable;"
  "carrot 20 vegetable; soy sauce 12 season; oyster sauce 10 season; garlic 6 aromatic; calamansi 5 sour;"
  "chicken stock 40 liquid")

# ---------------------------------------------------------------- Soups
D("bak-kut-teh", "Bak kut teh", "肉骨茶", "bkt|peppery pork rib soup|teochew bak kut teh|herbal bak kut teh", "ch", "S", 560,
  "pork ribs 200 protein; pork bone broth 300 liquid; garlic 20 aromatic; white pepper 3 heat; salt 2 season;"
  "dark soy sauce 10 season; chilli padi 3 heat; you tiao 25 garnish")
D("pig-organ-soup", "Pig's organ soup", "猪杂汤", "pig organ soup|豬雜湯|ter kiah png", "ch", "S", 500,
  "pork stock 300 liquid; pork intestines 40 protein; pork liver 30 protein; pork stomach 30 protein;"
  "pork balls 30 protein; salted vegetables 30 vegetable; tomato 20 vegetable; tofu 20 protein; white pepper 1 heat")
D("hot-and-sour-soup", "Hot and sour soup", "酸辣汤", "酸辣湯|suan la tang", "ch", "S", 320,
  "chicken stock 220 liquid; tofu 25 protein; pork strips 20 protein; eggs 15 protein; wood ear fungus 8 vegetable;"
  "bamboo shoots 10 vegetable; black vinegar 10 sour; white pepper 1 heat; corn starch 6 thicken; light soy sauce 5 season",
  rec="usda-fndds:2707136")
D("wonton-soup", "Wonton soup", "云吞汤", "wanton soup|餛飩湯|雲吞湯", "ch", "S", 350,
  "chicken stock 250 liquid; wonton wrappers 25 staple; minced pork 35 protein; prawns 15 protein;"
  "choy sum 20 vegetable; spring onion 3 garnish; sesame oil 2 flavour-oil; white pepper 1 season",
  rec="usda-fndds:2709160")
D("miso-soup", "Miso soup", "味噌汤", "misoshiru|味噌汁|味噌湯", "ja", "S", 200,
  "dashi (bonito) 170 liquid; miso 15 season; tofu 20 protein; wakame 2 vegetable; spring onion 3 garnish",
  rec="usda-fndds:2707455")
D("tonjiru", "Tonjiru", "日式猪肉味噌汤", "butajiru|豚汁|pork miso soup", "ja", "S", 300,
  "pork belly 30 protein; dashi 180 liquid; miso 18 season; daikon 30 vegetable; carrot 15 vegetable;"
  "burdock 10 vegetable; konnyaku 10 staple; spring onion 5 garnish",
  rec="japan-mext:18028")
D("mutton-soup", "Mutton soup", "羊肉汤", "sup kambing|soup kambing", "in", "S", 450,
  "mutton ribs 120 protein; mutton stock 280 liquid; shallots 15 aromatic; garlic 8 aromatic; ginger 8 aromatic;"
  "cinnamon and star anise 3 aromatic; black pepper 2 heat; fried shallots 5 garnish; coriander 3 garnish")
D("sup-tulang", "Sup tulang", "红汤骨头", "sup tulang merah|mutton bone marrow soup|red bone soup", "ma", "S", 450,
  "mutton bones with marrow 200 protein; tomato puree 60 sour; chilli paste 20 heat; tomato ketchup 30 sweeten;"
  "sugar 15 sweeten; ginger 8 aromatic; garlic 8 aromatic; onion 20 aromatic; water 100 liquid")
D("soto-ayam", "Soto ayam", "索多鸡汤", "mee soto|soto|鸡肉索多|soto ayam lontong", "id", "S", 540,
  "chicken stock 250 liquid; shredded chicken 60 protein; rice vermicelli 80 staple; compressed rice cakes 50 staple;"
  "bean sprouts 20 vegetable; hard-boiled egg 25 protein; potato croquette (begedil) 30 vegetable;"
  "shallots 15 aromatic; garlic 8 aromatic; turmeric 2 season; galangal 5 aromatic; sweet soy chilli (sambal kicap) 10 heat")
D("bakso", "Bakso", "印尼肉丸汤", "baso|mee bakso|bakso soup", "id", "S", 500,
  "beef meatballs 120 protein; beef broth 250 liquid; yellow noodles 60 staple; rice vermicelli 30 staple;"
  "bok choy 20 vegetable; fried shallots 5 garnish; celery 3 garnish; garlic 6 aromatic; sweet soy sauce (kecap manis) 6 sweeten")
D("pho-bo", "Pho bo", "越南牛肉河粉", "pho|phở bò|beef pho|越南河粉", "vi", "S", 650,
  "flat rice noodles 180 staple; beef brisket 50 protein; rare beef slices 40 protein; beef bone broth 330 liquid;"
  "fish sauce 10 season; star anise 1 aromatic; cinnamon 1 aromatic; onion 15 aromatic; ginger 8 aromatic;"
  "bean sprouts 20 vegetable; Thai basil 5 garnish; lime 5 sour",
  rec="usda-fndds:2707124")
D("bun-bo-hue", "Bun bo hue", "顺化牛肉粉", "bún bò huế|hue beef noodle soup", "vi", "S", 650,
  "round rice noodles 180 staple; beef shank 60 protein; pork hock 40 protein; pork blood cake 20 protein;"
  "beef and pork broth 300 liquid; lemongrass 15 aromatic; shrimp paste (mắm ruốc) 8 season; chilli oil 10 heat;"
  "fish sauce 8 season; bean sprouts 20 vegetable; lime 5 sour")
D("tom-yum-goong", "Tom yum goong", "冬阴功汤", "tom yam|tom yum soup|冬陰功|tom yum prawn", "th", "S", 400,
  "prawns 100 protein; chicken stock 220 liquid; lemongrass 10 aromatic; galangal 8 aromatic; kaffir lime leaves 2 aromatic;"
  "straw mushrooms 30 vegetable; lime juice 15 sour; fish sauce 10 season; Thai chilli paste (nam prik pao) 15 heat;"
  "evaporated milk 15 creamy; coriander 3 garnish")
D("tom-kha-gai", "Tom kha gai", "泰式椰汁鸡汤", "tom kha|chicken galangal coconut soup", "th", "S", 400,
  "chicken breast 90 protein; coconut milk 150 creamy; chicken stock 100 liquid; galangal 10 aromatic;"
  "lemongrass 10 aromatic; kaffir lime leaves 2 aromatic; mushrooms 25 vegetable; lime juice 10 sour;"
  "fish sauce 10 season; bird's eye chilli 3 heat")
D("kimchi-jjigae", "Kimchi jjigae", "泡菜汤", "kimchi stew|김치찌개|泡菜锅", "ko", "S", 450,
  "kimchi 120 vegetable; pork belly 60 protein; tofu 80 protein; anchovy stock 150 liquid; gochugaru 5 heat;"
  "gochujang 10 heat; garlic 6 aromatic; onion 20 aromatic; spring onion 5 garnish; sesame oil 4 flavour-oil")
D("sundubu-jjigae", "Sundubu jjigae", "韩式嫩豆腐汤", "soft tofu stew|순두부찌개|sundubu", "ko", "S", 450,
  "silken tofu 180 protein; clams 40 protein; pork mince 30 protein; egg 50 protein; anchovy stock 120 liquid;"
  "gochugaru 8 heat; garlic 6 aromatic; onion 15 aromatic; sesame oil 5 flavour-oil; spring onion 5 garnish")
D("budae-jjigae", "Budae jjigae", "部队锅", "army stew|부대찌개|部隊鍋", "ko", "S", 600,
  "luncheon meat 60 protein; sausages 50 protein; instant ramen noodles 60 staple; kimchi 60 vegetable;"
  "tofu 50 protein; baked beans 30 protein; anchovy stock 220 liquid; gochujang 15 heat; gochugaru 5 heat;"
  "processed cheese 20 creamy; spring onion 10 garnish; garlic 6 aromatic")
D("samgyetang", "Samgyetang", "韩式参鸡汤", "ginseng chicken soup|삼계탕|蔘雞湯", "ko", "S", 700,
  "spring chicken 350 protein; glutinous rice 50 staple; ginseng 10 aromatic; jujubes 10 sweeten; garlic 15 aromatic;"
  "chestnuts 15 vegetable; water 240 liquid; salt 2 season; spring onion 5 garnish")
D("itek-tim", "Itek tim", "咸菜鸭汤", "kiam chye ark|鹹菜鴨湯|salted vegetable duck soup", "pe", "S", 500,
  "duck 150 protein; salted mustard greens 60 vegetable; tomato 40 vegetable; preserved plums 10 sour;"
  "tamarind 5 sour; brandy 5 flavour-oil; water 220 liquid; white pepper 1 season; ginger 5 aromatic")
D("bakwan-kepiting", "Bakwan kepiting", "蟹肉丸汤", "crab meatball soup|bakwan kepiting soup", "pe", "S", 450,
  "minced pork 70 protein; crab meat 30 protein; prawns 20 protein; bamboo shoots 30 vegetable; jicama 20 vegetable;"
  "pork bone broth 250 liquid; eggs 10 bind; garlic 6 aromatic; fried garlic 4 garnish; white pepper 1 season")
D("chicken-corn-soup", "Chicken corn soup", "鸡肉玉米羹", "chicken sweetcorn soup|雞肉粟米羹|corn soup", "ch", "S", 300,
  "chicken stock 180 liquid; creamed corn 60 vegetable; shredded chicken 30 protein; eggs 20 protein;"
  "corn starch 6 thicken; sesame oil 2 flavour-oil; white pepper 1 season; spring onion 3 garnish")
D("crab-meat-thick-soup", "Crab meat thick soup", "蟹肉羹", "fish maw soup|鱼鳔羹|蟹肉魚鰾羹|crab meat fish maw soup", "ch", "S", 300,
  "chicken stock 180 liquid; crab meat 30 protein; fish maw 15 protein; eggs 20 protein; shiitake mushrooms 15 vegetable;"
  "bamboo shoots 15 vegetable; corn starch 10 thicken; black vinegar 5 sour; oyster sauce 6 season; sesame oil 2 flavour-oil")
D("herbal-chicken-soup", "Herbal chicken soup", "药材鸡汤", "藥材雞湯|black chicken herbal soup|ba zhen chicken soup", "ch", "S", 500,
  "chicken thigh with bone 180 protein; water 280 liquid; dang gui 3 aromatic; goji berries 5 sweeten;"
  "red dates 10 sweeten; dang shen 5 aromatic; Shaoxing wine 10 flavour-oil; ginger 5 aromatic; salt 2 season")
D("abc-soup", "ABC soup", "罗宋汤", "abc soup chinese|pork rib vegetable soup|羅宋湯", "ch", "S", 450,
  "pork ribs 100 protein; potato 60 vegetable; carrot 50 vegetable; tomato 50 vegetable; onion 30 aromatic;"
  "corn 40 vegetable; water 200 liquid; salt 2 season; white pepper 1 season")
D("old-cucumber-soup", "Old cucumber soup", "老黄瓜汤", "lao huang gua tang|老黃瓜湯|pork rib old cucumber soup", "ch", "S", 450,
  "old cucumber 120 vegetable; pork ribs 100 protein; red dates 10 sweeten; dried scallops 8 flavour-oil;"
  "dried cuttlefish 10 flavour-oil; water 220 liquid; salt 2 season")
D("watercress-soup", "Watercress pork rib soup", "西洋菜汤", "sai yeung choy tong|西洋菜湯|watercress soup", "ch", "S", 450,
  "watercress 100 vegetable; pork ribs 100 protein; red dates 10 sweeten; dried longan 5 sweeten;"
  "carrot 30 vegetable; water 220 liquid; salt 2 season")
D("cream-of-mushroom-soup", "Cream of mushroom soup", "奶油蘑菇汤", "mushroom soup|奶油蘑菇湯|cream mushroom soup", "we", "S", 280,
  "button mushrooms 80 vegetable; chicken stock 120 liquid; cream 40 creamy; butter 12 fat; wheat flour 10 thicken;"
  "onion 20 aromatic; garlic 4 aromatic; black pepper 1 season",
  rec="usda-fndds:2710107")

# ---------------------------------------------------------------- Breakfast
D("kaya-toast-set", "Kaya toast set", "咖椰吐司套餐", "kaya toast|kaya butter toast|roti kaya|咖椰土司", "ch", "B", 200,
  "white bread 60 staple; kaya (coconut egg jam) 25 sweeten; butter 12 fat; soft-boiled eggs 100 protein;"
  "light soy sauce 5 season; white pepper 1 season")
D("roti-prata", "Roti prata", "印度煎饼", "roti canai|prata|plain prata|印度薄饼", "in", "B", 230,
  "wheat flour 100 staple; ghee 15 fat; water 30 liquid; sweetened condensed milk 5 sweeten; salt 1 season;"
  "fish curry gravy 80 liquid")

D("murtabak", "Murtabak", "穆塔巴", "mutton murtabak|martabak|murtabak kambing", "in", "B", 380,
  "wheat flour 120 staple; ghee 20 fat; minced mutton 80 protein; eggs 50 protein; onion 40 aromatic;"
  "meat curry powder 4 season; pickled onions 20 sour; curry gravy 50 liquid")
D("thosai", "Thosai", "印度薄饼脆饼", "dosa|dosai|plain thosai|ghee thosai", "in", "B", 150,
  "parboiled rice 70 staple; urad dal 25 protein; fenugreek seeds 1 aromatic; ghee 10 fat; water 40 liquid;"
  "salt 1 season",
  rec="usda-fndds:2708347")
D("masala-dosa", "Masala dosa", "马沙拉印度薄饼", "masala thosai|potato dosa", "in", "B", 250,
  "parboiled rice 70 staple; urad dal 25 protein; potato 80 vegetable; onion 20 aromatic; ghee 12 fat;"
  "mustard seeds 2 aromatic; curry leaves 1 aromatic; turmeric 1 season; green chilli 3 heat; water 30 liquid",
  rec="usda-fndds:2709129")
D("idli", "Idli", "印度蒸米糕", "idly|idli sambar", "in", "B", 150,
  "parboiled rice 60 staple; urad dal 25 protein; water 60 liquid; salt 1 season; ghee 4 fat",
  rec="usda-fndds:2708346")
D("appam", "Appam with coconut milk", "印度椰浆米饼", "appom|hoppers|apom", "in", "B", 200,
  "rice flour 70 staple; coconut milk 60 creamy; sugar 15 sweeten; yeast 2 bind;"
  "water 50 liquid; salt 1 season")
D("you-tiao", "You tiao", "油条", "you char kway|chinese dough fritters|油條|cakoi", "ch", "B", 70,
  "wheat flour 40 staple; water 15 liquid; baking soda 1 season; salt 1 season; vegetable oil 12 fat",
  rec="taiwan-fda:R3000101")
D("chwee-kueh", "Chwee kueh", "水粿", "water rice cake|水粿仔|chwee kway", "ch", "B", 230,
  "rice flour cakes 150 staple; preserved radish (chai poh) 40 season; lard 15 fat; garlic 8 aromatic;"
  "sesame seeds 2 garnish; chilli sauce 10 heat; dark soy sauce 5 sweeten")
D("chai-tow-kway", "Fried carrot cake", "菜头粿", "chai tow kway|chye tow kway|carrot cake|炒菜头粿|菜頭粿", "ch", "B", 300,
  "radish cake 180 staple; eggs 50 protein; preserved radish (chai poh) 15 season; garlic 8 aromatic; lard 15 fat;"
  "fish sauce 5 season; spring onion 5 garnish; sweet dark soy sauce 15 sweeten; chilli paste 8 heat")
D("lo-bak-go", "Turnip cake", "萝卜糕", "lo bak go|radish cake dim sum|蘿蔔糕|pan-fried turnip cake", "ch", "K", 150,
  "white radish 70 vegetable; rice flour 30 staple; Chinese sausage 10 protein; dried shrimp 6 flavour-oil;"
  "dried shiitake 5 vegetable; water 25 liquid; vegetable oil 8 fat; white pepper 1 season")
D("cheong-fun", "Chee cheong fun", "猪肠粉", "cheong fun|rice noodle rolls|豬腸粉|prawn cheong fun", "ch", "B", 220,
  "rice noodle sheets 150 staple; prawns 30 protein; sweet sauce 15 sweeten; light soy sauce 8 season;"
  "sesame seeds 2 garnish; shallot oil 6 flavour-oil; chilli sauce 8 heat")

D("chilli-ban-mian", "Dry chilli ban mian", "干捞辣椒板面", "chilli ban mian|chilli pan mee|辣椒板面", "ch", "N", 330,
  "wheat noodles 180 staple; minced pork 50 protein; poached egg 50 protein; dried anchovies (ikan bilis) 12 protein;"
  "dried chilli sambal 15 heat; light soy sauce 8 season; fried shallots 5 garnish; sweet potato leaves 20 vegetable")
D("congee-chicken-feet", "Peanut chicken feet congee", "花生鸡脚粥", "chicken feet porridge|花生雞腳粥", "ch", "B", 450,
  "jasmine rice 60 staple; water 300 liquid; chicken feet 60 protein; peanuts 20 protein; ginger 5 aromatic;"
  "salt 2 season; spring onion 3 garnish")
D("big-breakfast", "Big breakfast", "西式早餐拼盘", "full breakfast|english breakfast|all-day breakfast", "we", "B", 450,
  "scrambled eggs 100 protein; pork sausages 60 protein; bacon 40 protein; hash brown 60 staple; toast 50 staple;"
  "baked beans 60 protein; butter 10 fat; grilled tomato 40 vegetable; mushrooms 30 vegetable")
D("eggs-benedict", "Eggs benedict", "班尼迪克蛋", "eggs benny|egg benedict|班尼迪克蛋早餐", "we", "B", 300,
  "English muffin 60 staple; poached eggs 100 protein; ham 40 protein; butter 30 fat; egg yolk 20 bind;"
  "lemon juice 5 sour; spinach 30 vegetable; paprika 0.5 garnish")
D("pancakes", "Pancakes with maple syrup", "松饼", "buttermilk pancakes|pancake stack|美式煎饼", "we", "B", 260,
  "wheat flour 70 staple; milk 80 creamy; eggs 30 bind; butter 15 fat; sugar 10 sweeten; baking powder 3 bind;"
  "maple syrup 40 sweeten")
D("french-toast-hk", "Hong Kong French toast", "港式西多士", "西多士|hk french toast|peanut butter french toast", "ch", "B", 200,
  "white bread 80 staple; eggs 50 bind; peanut butter 20 creamy; butter 15 fat; golden syrup 20 sweeten;"
  "vegetable oil 15 fat")
D("avocado-toast-egg", "Avocado toast with poached egg", "牛油果吐司配水波蛋", "avo toast|avocado toast", "we", "B", 230,
  "sourdough bread 70 staple; avocado 80 vegetable; poached egg 50 protein; lemon juice 5 sour; chilli flakes 1 heat;"
  "olive oil 5 fat; feta cheese 15 creamy; salt 1 season")
D("croissant", "Butter croissant", "牛角包", "croissant|可颂|可頌|牛角面包", "we", "B", 60,
  "wheat flour 30 staple; butter 15 fat; milk 8 creamy; sugar 3 sweeten; eggs 4 bind; yeast 1 bind",
  rec="usda-fndds:2707678")
D("quiche-lorraine", "Quiche lorraine", "法式咸派", "quiche|bacon quiche|洛林咸派", "we", "B", 150,
  "shortcrust pastry (wheat flour) 40 staple; butter 20 fat; eggs 40 protein; cream 30 creamy; bacon 20 protein;"
  "gruyere cheese 15 creamy; onion 10 aromatic; nutmeg 0.5 season",
  rec="uk-cofid:12-952")
D("pork-floss-bun", "Pork floss bun", "肉松面包", "meat floss bun|肉鬆麵包|chicken floss bun", "ch", "B", 90,
  "bread dough (wheat flour) 50 staple; pork floss 15 protein; mayonnaise 10 creamy; butter 6 fat; sugar 6 sweeten;"
  "eggs 5 bind",
  rec="taiwan-fda:Q1000501")
D("scallion-pancake", "Scallion pancake", "葱油饼", "cong you bing|蔥油餅|spring onion pancake", "ch", "B", 120,
  "wheat flour 60 staple; spring onion 15 vegetable; lard 12 fat; water 30 liquid; salt 1 season; sesame oil 3 flavour-oil",
  rec="taiwan-fda:R2700101")

# ---------------------------------------------------------------- Dim sum, snacks and kueh
D("xiao-long-bao", "Xiao long bao", "小笼包", "xlb|soup dumplings|小籠包|shanghai soup dumplings", "ch", "K", 160,
  "wheat flour wrappers 60 staple; minced pork 60 protein; pork skin aspic 20 liquid; ginger 4 aromatic;"
  "spring onion 4 aromatic; Shaoxing wine 3 flavour-oil; light soy sauce 4 season; sesame oil 2 flavour-oil;"
  "black vinegar 8 sour",
  rec="taiwan-fda:R2301101")
D("siu-mai", "Siu mai", "烧卖", "shumai|siew mai|燒賣|pork and prawn dumplings", "ch", "K", 100,
  "wonton wrappers 20 staple; minced pork 45 protein; prawns 20 protein; shiitake mushrooms 8 vegetable;"
  "potato starch 3 thicken; light soy sauce 3 season; sesame oil 1 flavour-oil; fish roe 2 garnish",
  rec="taiwan-fda:R2900101")
D("har-gow", "Har gow", "虾饺", "ha gao|shrimp dumplings|蝦餃|crystal prawn dumplings", "ch", "K", 100,
  "wheat starch wrapper 35 staple; tapioca starch 10 staple; prawns 45 protein; bamboo shoots 8 vegetable;"
  "lard 4 fat; sesame oil 1 flavour-oil")
D("char-siu-bao", "Char siu bao", "叉烧包", "char siew pau|bbq pork bun|叉燒包|cha siu bao", "ch", "K", 120,
  "bun dough (wheat flour) 75 staple; char siu 30 protein; oyster sauce 5 season; sugar 5 sweeten; shallots 3 aromatic;"
  "corn starch 2 thicken",
  rec="taiwan-fda:R2300101")
D("big-pau", "Big pau", "大包", "tua pau|da bao|大肉包|pork bun", "ch", "K", 190,
  "bun dough (wheat flour) 110 staple; minced pork 45 protein; hard-boiled egg 15 protein; Chinese sausage 8 protein;"
  "shiitake mushrooms 5 vegetable; onion 8 aromatic",
  rec="taiwan-fda:R2300901")
D("liu-sha-bao", "Salted egg custard bun", "流沙包", "liu sha bao|lava custard bun|流沙奶黄包", "ch", "K", 120,
  "bun dough (wheat flour) 70 staple; salted egg yolks 15 protein; butter 12 fat; custard powder 5 thicken;"
  "milk powder 8 creamy; sugar 10 sweeten")
D("lo-mai-gai", "Lo mai gai", "糯米鸡", "glutinous rice chicken|糯米雞|lotus leaf rice", "ch", "K", 200,
  "glutinous rice 120 staple; chicken thigh 40 protein; Chinese sausage 10 protein; shiitake mushrooms 8 vegetable;"
  "salted egg yolk 8 protein; oyster sauce 6 season; dark soy sauce 5 season; lard 5 fat")
D("chicken-feet-dim-sum", "Braised chicken feet", "凤爪", "phoenix claws|鳳爪|dim sum chicken feet|豉汁凤爪", "ch", "K", 120,
  "chicken feet 100 protein; fermented black beans 5 season; oyster sauce 5 season; garlic 4 aromatic;"
  "red chilli 2 heat; sugar 3 sweeten; vegetable oil 5 fat")
D("pork-ribs-black-bean", "Steamed pork ribs with black bean", "豉汁排骨", "dim sum spare ribs|豉汁蒸排骨|black bean ribs", "ch", "K", 130,
  "pork ribs 100 protein; fermented black beans 6 season; garlic 6 aromatic; corn starch 4 thicken;"
  "light soy sauce 4 season; sugar 2 sweeten; red chilli 2 heat; vegetable oil 4 fat")
D("fried-spring-rolls", "Fried spring rolls", "炸春卷", "chun juan|spring rolls|春卷|春捲", "ch", "K", 120,
  "spring roll wrappers 30 staple; minced pork 30 protein; cabbage 25 vegetable; carrot 10 vegetable;"
  "shiitake mushrooms 5 vegetable; glass noodles 8 staple; vegetable oil 12 fat; light soy sauce 3 season",
  rec="japan-mext:18056")
D("fried-wanton", "Fried wanton", "炸云吞", "fried wontons|炸雲吞|crispy wanton", "ch", "K", 100,
  "wonton wrappers 35 staple; minced pork 30 protein; prawns 15 protein; vegetable oil 15 fat; light soy sauce 2 season;"
  "sesame oil 1 flavour-oil; sweet chilli sauce 5 sweeten",
  rec="usda-fndds:2708705")
D("guo-tie", "Pan-fried pork dumplings", "锅贴", "guo tie|pot stickers|gyoza|鍋貼|餃子", "ch", "K", 150,
  "dumpling wrappers 55 staple; minced pork 55 protein; cabbage 20 vegetable; Chinese chives 8 vegetable;"
  "ginger 3 aromatic; light soy sauce 4 season; sesame oil 2 flavour-oil; vegetable oil 6 fat",
  rec="taiwan-fda:R2201401")
D("shui-jiao", "Boiled pork dumplings", "水饺", "shui jiao|jiaozi|水餃|chinese dumplings", "ch", "K", 200,
  "dumpling wrappers 80 staple; minced pork 70 protein; napa cabbage 30 vegetable; Chinese chives 8 vegetable;"
  "ginger 3 aromatic; light soy sauce 5 season; sesame oil 2 flavour-oil; black vinegar 5 sour",
  rec="taiwan-fda:R2200801")
D("summer-rolls", "Vietnamese summer rolls", "越南春卷", "gỏi cuốn|fresh spring rolls|rice paper rolls|越南米纸卷", "vi", "K", 180,
  "rice paper 25 staple; prawns 30 protein; pork belly 20 protein; rice vermicelli 40 staple; lettuce 25 vegetable;"
  "mint 4 garnish; Thai basil 3 garnish; peanut hoisin dip 30 sweeten",
  rec="usda-fndds:2708704")
D("cha-gio", "Vietnamese fried spring rolls", "越南炸春卷", "chả giò|nem rán|vietnamese egg rolls", "vi", "K", 150,
  "rice paper 25 staple; minced pork 50 protein; prawns 15 protein; taro 15 vegetable; carrot 10 vegetable;"
  "wood ear fungus 5 vegetable; glass noodles 8 staple; fish sauce 4 season; vegetable oil 15 fat")
D("popiah", "Popiah", "薄饼", "fresh spring roll|薄餅|poh piah|lumpia basah", "ch", "K", 260,
  "popiah skin 40 staple; braised jicama 120 vegetable; prawns 20 protein; Chinese sausage 10 protein;"
  "shredded omelette 20 protein; lettuce 10 vegetable; bean sprouts 15 vegetable; sweet sauce 10 sweeten;"
  "minced garlic 5 aromatic; chilli paste 5 heat; crushed peanuts 8 garnish")
D("kueh-pie-tee", "Kueh pie tee", "小金杯", "pie tee|top hats|kuih pie tee", "pe", "K", 145,
  "pie tee shells 40 staple; jicama 50 vegetable; prawns 20 protein; shredded omelette 10 protein;"
  "carrot 10 vegetable; chilli sauce 8 heat; coriander 2 garnish; garlic 4 aromatic")
D("rojak", "Rojak", "罗惹", "chinese rojak|fruit rojak|囉惹|rojak buah", "ch", "K", 265,
  "pineapple 40 vegetable; cucumber 40 vegetable; jicama 40 vegetable; you tiao 20 staple; tau pok 20 protein;"
  "black prawn paste (hae ko) 25 season; sugar 10 sweeten; lime 5 sour; crushed peanuts 15 garnish;"
  "chilli paste 8 heat; torch ginger flower 2 aromatic")
D("indian-rojak", "Indian rojak", "印度罗惹", "pasembur|mamak rojak|rojak india", "in", "K", 385,
  "flour fritters 80 staple; prawn fritters 50 protein; hard-boiled eggs 50 protein; fried tofu 40 protein;"
  "fried potato 40 vegetable; cucumber 30 vegetable; onion 15 aromatic; sweet potato chilli sauce 80 sweeten")
D("satay", "Chicken satay", "沙爹", "satay|sate ayam|沙嗲|chicken sate", "ma", "K", 210,
  "chicken thigh 140 protein; turmeric 2 season; lemongrass 6 aromatic; shallots 8 aromatic; sugar 8 sweeten;"
  "vegetable oil 6 fat; peanut sauce 40 creamy",
  rec="uk-cofid:19-323")
D("bbq-chicken-wings", "Barbecued chicken wings", "烧鸡翅", "bbq chicken wings|燒雞翅|chicken wings hawker", "ch", "K", 255,
  "chicken wings 220 protein; honey 10 sweeten; dark soy sauce 8 season; garlic 5 aromatic; oyster sauce 8 season;"
  "lime 4 sour",
  rec="uk-cofid:19-652")
D("otah", "Otah", "乌达", "otak-otak|otak|烏打", "pe", "K", 105,
  "mackerel fish paste 60 protein; coconut milk 15 creamy; eggs 10 bind; chilli paste 8 heat; shallots 5 aromatic;"
  "lemongrass 3 aromatic; kaffir lime leaves 1 aromatic; turmeric 1 season; sugar 2 sweeten")
D("ngoh-hiang", "Ngoh hiang", "五香", "lor bak|ngo hiang|五香卷|卤肉卷", "ch", "K", 215,
  "minced pork 80 protein; prawns 30 protein; water chestnut 25 vegetable; beancurd skin 15 coat; onion 15 aromatic;"
  "five-spice powder 2 season; eggs 15 bind; potato starch 8 thicken; vegetable oil 15 fat; sweet sauce 10 sweeten")
D("curry-puff", "Curry puff", "咖喱角", "karipap|epok-epok|咖哩角|curry pok", "ma", "K", 130,
  "wheat flour 40 staple; butter 12 fat; potato 30 vegetable; chicken 15 protein; hard-boiled egg 10 protein;"
  "curry powder 3 season; onion 8 aromatic; vegetable oil 12 fat")
D("mutton-samosa", "Mutton samosa", "羊肉咖喱角", "samosa|lamb samosa|meat samosa", "in", "K", 100,
  "wheat flour 35 staple; minced mutton 30 protein; potato 10 vegetable; green peas 5 vegetable; onion 8 aromatic;"
  "garam masala 2 season; ghee 5 fat; vegetable oil 10 fat",
  rec="uk-cofid:19-597")
D("prawn-vadai", "Prawn vadai", "虾饼", "udang vadai|prawn fritters|vadai udang", "in", "K", 100,
  "yellow split peas 45 protein; prawns 20 protein; onion 15 aromatic; green chilli 3 heat; curry leaves 1 aromatic;"
  "fennel 1 aromatic; vegetable oil 12 fat")
D("bak-chang", "Bak chang", "肉粽", "hokkien rice dumpling|zongzi|粽子|bak zhang|meat rice dumpling", "ch", "K", 210,
  "glutinous rice 120 staple; pork belly 35 protein; salted egg yolk 15 protein; dried shiitake 8 vegetable;"
  "chestnuts 15 vegetable; dried shrimp 5 flavour-oil; shallots 5 aromatic; dark soy sauce 5 season;"
  "five-spice powder 1 season",
  rec="taiwan-fda:R0400101")
D("nonya-chang", "Nonya chang", "娘惹粽", "nyonya rice dumpling|nonya dumpling|bak chang nyonya", "pe", "K", 180,
  "glutinous rice 110 staple; minced pork 35 protein; candied winter melon 15 sweeten; coriander seeds 2 aromatic;"
  "shallots 8 aromatic; butterfly pea flower 1 garnish; sugar 4 sweeten; vegetable oil 5 fat")
D("yam-cake", "Yam cake", "芋头糕", "orh kueh|芋頭糕|taro cake|芋粿", "ch", "K", 150,
  "taro 60 vegetable; rice flour 30 staple; water 30 liquid; dried shrimp 8 flavour-oil; shallots 6 aromatic;"
  "vegetable oil 8 fat; spring onion 3 garnish; red chilli 5 heat",
  rec="taiwan-fda:Q0100301")
D("fried-fish-skin", "Fried fish skin", "炸鱼皮", "fish skin chips|salted egg fish skin|酥炸鱼皮", "ch", "K", 60,
  "fish skin 35 protein; vegetable oil 15 fat; salted egg yolk 8 protein; curry leaves 1 aromatic; salt 1 season")
D("okonomiyaki", "Okonomiyaki", "大阪烧", "japanese savoury pancake|お好み焼き|御好燒", "ja", "K", 300,
  "wheat flour 50 staple; cabbage 110 vegetable; eggs 50 protein; pork belly 40 protein; dashi 30 liquid;"
  "okonomiyaki sauce 15 sweeten; mayonnaise 10 creamy; bonito flakes 2 garnish; aonori 1 garnish",
  rec="japan-mext:18053")
D("takoyaki", "Takoyaki", "章鱼烧", "octopus balls|たこ焼き|章魚燒", "ja", "K", 180,
  "wheat flour 40 staple; dashi 70 liquid; eggs 25 bind; octopus 25 protein; spring onion 5 vegetable;"
  "pickled ginger 3 garnish; takoyaki sauce 10 sweeten; mayonnaise 8 creamy; bonito flakes 2 garnish")
D("yakitori", "Yakitori", "日式烤鸡串", "焼き鳥|chicken skewers japanese|烤雞串", "ja", "K", 150,
  "chicken thigh 110 protein; spring onion 15 vegetable; tare (soy, mirin, sugar) 20 sweeten; salt 1 season;"
  "shichimi 1 heat")
D("korokke", "Korokke", "日式可乐饼", "japanese croquette|コロッケ|potato croquette|可樂餅", "ja", "K", 100,
  "potato 55 vegetable; minced beef 12 protein; onion 8 aromatic; panko breadcrumbs 8 coat; wheat flour 4 coat;"
  "eggs 5 bind; vegetable oil 8 fat",
  rec="japan-mext:18018")
D("salmon-nigiri", "Salmon nigiri", "三文鱼握寿司", "salmon sushi|サーモン握り|鮭魚握壽司|sake nigiri", "ja", "K", 120,
  "sushi rice 75 staple; rice vinegar 5 sour; salmon 35 protein; wasabi 1 heat; soy sauce 4 season",
  rec="usda-fndds:2708969")
D("california-roll", "California roll", "加州卷", "california maki|カリフォルニアロール|加州捲", "ja", "K", 180,
  "sushi rice 100 staple; rice vinegar 6 sour; crab stick 25 protein; avocado 20 vegetable; cucumber 15 vegetable;"
  "mayonnaise 6 creamy; flying fish roe 5 protein; nori 3 vegetable",
  rec="usda-fndds:2708961")
D("salmon-onigiri", "Salmon onigiri", "三文鱼饭团", "onigiri|おにぎり|rice ball|鮭魚飯糰", "ja", "K", 120,
  "short-grain rice 95 staple; grilled salmon flakes 15 protein; nori 2 vegetable; salt 1 season; sesame seeds 1 garnish")
D("chawanmushi", "Chawanmushi", "日式茶碗蒸", "茶碗蒸し|japanese steamed egg custard|茶碗蒸", "ja", "K", 150,
  "eggs 50 protein; dashi 80 liquid; chicken thigh 10 protein; prawns 8 protein; shiitake mushrooms 4 vegetable;"
  "kamaboko 5 protein; soy sauce 3 season; mirin 2 sweeten")
D("kimbap", "Kimbap", "韩式紫菜包饭", "gimbap|김밥|korean seaweed rice roll", "ko", "K", 250,
  "short-grain rice 140 staple; nori 3 vegetable; egg 30 protein; ham 20 protein; crab stick 15 protein;"
  "pickled radish 15 sour; spinach 15 vegetable; carrot 10 vegetable; sesame oil 4 flavour-oil")
D("tteokbokki", "Tteokbokki", "韩式炒年糕", "topokki|떡볶이|spicy rice cakes|辣炒年糕", "ko", "K", 300,
  "rice cakes (tteok) 180 staple; fish cakes 40 protein; anchovy stock 40 liquid; gochujang 20 heat; gochugaru 4 heat;"
  "sugar 10 sweeten; spring onion 10 vegetable",
  rec="usda-fndds:2708957")
D("haemul-pajeon", "Seafood pancake", "韩式海鲜煎饼", "haemul pajeon|해물파전|korean pancake|海鮮煎餅", "ko", "K", 250,
  "wheat flour 60 staple; eggs 30 bind; squid 30 protein; prawns 25 protein; spring onion 50 vegetable;"
  "water 40 liquid; vegetable oil 15 fat; soy dipping sauce 10 season")
D("tod-man-pla", "Thai fish cakes", "泰式鱼饼", "tod mun pla|thai fishcake|泰式魚餅", "th", "K", 150,
  "fish paste 90 protein; red curry paste (with shrimp paste) 10 season; long beans 15 vegetable;"
  "kaffir lime leaves 1 aromatic; eggs 10 bind; fish sauce 4 season; vegetable oil 12 fat; sweet chilli sauce 10 sweeten")
D("som-tam", "Som tam", "泰式青木瓜沙拉", "papaya salad|ส้มตำ|青木瓜沙律", "th", "K", 250,
  "green papaya 150 vegetable; dried shrimp 8 flavour-oil; fish sauce 12 season; lime juice 15 sour;"
  "palm sugar 10 sweeten; garlic 5 aromatic; bird's eye chilli 4 heat; cherry tomatoes 25 vegetable;"
  "long beans 15 vegetable; peanuts 10 garnish")
D("banh-mi", "Banh mi", "越南法包", "bánh mì|vietnamese baguette|越南法式三明治", "vi", "K", 280,
  "baguette 90 staple; grilled pork 50 protein; pork pate 20 protein; mayonnaise 15 creamy;"
  "pickled carrot and daikon 40 sour; cucumber 20 vegetable; coriander 4 garnish; fish sauce 4 season;"
  "red chilli 3 heat; Maggi seasoning 3 season")
D("banh-xeo", "Banh xeo", "越南煎饼", "bánh xèo|vietnamese sizzling crepe|越南煎餅", "vi", "K", 300,
  "rice flour 60 staple; coconut milk 40 creamy; turmeric 1 season; pork belly 40 protein; prawns 35 protein;"
  "bean sprouts 40 vegetable; onion 15 aromatic; lettuce 30 vegetable; fish sauce dip (nuoc cham) 25 season;"
  "vegetable oil 15 fat")
D("roti-john", "Roti john", "罗地乔", "roti jon|omelette sandwich", "ma", "K", 325,
  "baguette 120 staple; minced mutton 60 protein; eggs 75 protein; onion 30 aromatic; chilli sauce 15 heat;"
  "mayonnaise 15 creamy; tomato ketchup 10 sweeten")
D("martabak-manis", "Martabak manis", "印尼甜煎饼", "terang bulan|apam balik tebal|sweet martabak", "id", "D", 200,
  "wheat flour 70 staple; eggs 20 bind; milk 40 creamy; sugar 15 sweeten; butter 20 fat; sweetened condensed milk 15 sweeten;"
  "chocolate sprinkles 10 garnish; crushed peanuts 10 garnish; baking soda 1 bind")
D("min-jiang-kueh", "Min jiang kueh", "面煎粿", "apam balik|peanut pancake|曼煎粿|min chiang kueh", "ch", "K", 130,
  "wheat flour 50 staple; eggs 10 bind; sugar 15 sweeten; crushed peanuts 25 garnish; margarine 10 fat;"
  "water 25 liquid; yeast 1 bind")
D("pisang-goreng", "Pisang goreng", "炸香蕉", "banana fritters|goreng pisang|炸香蕉饼", "ma", "K", 150,
  "banana 90 vegetable; rice flour 20 staple; wheat flour 10 staple; eggs 5 bind; sugar 5 sweeten;"
  "vegetable oil 15 fat; salt 1 season")
D("begedil", "Begedil", "马来炸薯饼", "bergedil|perkedel|potato patties", "ma", "K", 100,
  "potato 70 vegetable; minced beef 10 protein; eggs 10 bind; shallots 5 aromatic; spring onion 2 garnish;"
  "vegetable oil 8 fat")

# ---------------------------------------------------------------- Western café and fast food
D("fish-and-chips", "Fish and chips", "炸鱼薯条", "fish & chips|炸魚薯條|battered fish and chips", "we", "R", 400,
  "white fish fillet 150 protein; wheat flour 30 coat; beer batter 30 coat; vegetable oil 25 fat;"
  "potato chips 150 staple; tartar sauce 20 creamy; lemon 5 sour")
D("chicken-chop", "Chicken chop", "西式鸡扒", "chicken chop with black pepper sauce|grilled chicken chop|鸡扒", "we", "R", 450,
  "chicken thigh 180 protein; black pepper sauce 50 season; french fries 100 staple; coleslaw 60 vegetable;"
  "baked beans 40 protein; butter 10 fat; garlic 5 aromatic")
D("spaghetti-bolognese", "Spaghetti bolognese", "肉酱意大利面", "spag bol|bolognese|肉醬意粉|spaghetti with meat sauce", "we", "N", 400,
  "spaghetti 200 staple; beef mince 80 protein; tomato passata 70 sour; onion 20 aromatic; carrot 15 vegetable;"
  "garlic 5 aromatic; olive oil 8 fat; parmesan 10 creamy; red wine 10 flavour-oil",
  rec="uk-cofid:19-628")
D("spaghetti-carbonara", "Spaghetti carbonara", "培根蛋酱意大利面", "carbonara|奶油培根意粉|cream carbonara", "we", "N", 380,
  "spaghetti 200 staple; bacon 50 protein; egg yolks 30 bind; cream 50 creamy; parmesan 20 creamy;"
  "garlic 5 aromatic; black pepper 1 heat; olive oil 8 fat")
D("aglio-olio", "Prawn aglio olio", "蒜香辣椒意大利面", "aglio e olio|aglio olio with prawns|蒜蓉橄榄油意粉", "we", "N", 340,
  "spaghetti 200 staple; prawns 70 protein; garlic 15 aromatic; olive oil 25 fat; chilli flakes 2 heat;"
  "parsley 3 garnish; parmesan 10 creamy; chicken stock 20 liquid")
D("lasagne", "Beef lasagne", "千层面", "lasagna|千層麵|meat lasagne", "we", "N", 350,
  "lasagne sheets 80 staple; beef mince 80 protein; tomato passata 70 sour; bechamel (milk, butter, flour) 70 creamy;"
  "mozzarella 30 creamy; parmesan 10 creamy; onion 15 aromatic; garlic 5 aromatic",
  rec="usda-fndds:2708753")
D("mac-and-cheese", "Macaroni and cheese", "芝士通心粉", "mac and cheese|mac n cheese|芝士焗通心粉", "we", "N", 280,
  "macaroni 150 staple; cheddar cheese 50 creamy; milk 50 creamy; butter 12 fat; wheat flour 8 thicken;"
  "mustard powder 1 season; breadcrumbs 10 coat",
  rec="usda-fndds:2708811")
D("chicken-risotto", "Chicken mushroom risotto", "鸡肉蘑菇烩饭", "risotto|mushroom risotto|chicken risotto", "we", "R", 380,
  "arborio rice 80 staple; chicken stock 150 liquid; chicken breast 70 protein; mushrooms 40 vegetable;"
  "butter 12 fat; parmesan 15 creamy; onion 15 aromatic; white wine 15 flavour-oil; garlic 4 aromatic",
  rec="uk-cofid:19-566")
D("cheeseburger", "Cheeseburger", "芝士汉堡", "cheese burger|芝士漢堡|beef burger", "we", "K", 220,
  "burger bun 70 staple; beef patty 100 protein; cheddar cheese 20 creamy; lettuce 10 vegetable; tomato 15 vegetable;"
  "pickles 8 sour; onion 8 aromatic; tomato ketchup 10 sweeten; mustard 5 season",
  rec="usda-fndds:2706888")
D("club-sandwich", "Club sandwich", "总汇三明治", "clubhouse sandwich|總匯三明治", "we", "K", 280,
  "white bread 90 staple; chicken breast 50 protein; bacon 25 protein; ham 20 protein; eggs 30 protein;"
  "lettuce 15 vegetable; tomato 25 vegetable; mayonnaise 15 creamy; cheddar cheese 15 creamy",
  rec="usda-fndds:2706997")
D("chicken-caesar-salad", "Chicken caesar salad", "鸡肉凯撒沙拉", "caesar salad|凱撒沙律|grilled chicken caesar", "we", "K", 300,
  "romaine lettuce 120 vegetable; grilled chicken breast 90 protein; caesar dressing (anchovy, egg) 35 creamy;"
  "parmesan 15 creamy; croutons 20 staple; bacon 15 protein; lemon juice 5 sour")
D("fried-chicken", "Fried chicken", "炸鸡", "crispy fried chicken|southern fried chicken|炸雞", "we", "K", 200,
  "chicken pieces 150 protein; wheat flour 20 coat; buttermilk 15 creamy; paprika 1 season; salt 2 season;"
  "vegetable oil 15 fat",
  rec="usda-fndds:2705949")
D("chicken-nuggets", "Chicken nuggets", "鸡块", "nuggets|chicken mcnuggets|雞塊", "we", "K", 110,
  "minced chicken 65 protein; wheat flour 12 coat; breadcrumbs 10 coat; vegetable oil 12 fat; salt 1 season;"
  "egg white 5 bind",
  rec="usda-fndds:2706093")
D("pepperoni-pizza", "Pepperoni pizza", "意大利辣香肠披萨", "pepperoni pizza slice|意式腊肠披萨", "we", "K", 220,
  "pizza dough 110 staple; tomato sauce 30 sour; mozzarella 45 creamy; pepperoni 25 protein; olive oil 5 fat;"
  "oregano 1 season",
  rec="usda-fndds:2708638")
D("hawaiian-pizza", "Hawaiian pizza", "夏威夷披萨", "ham and pineapple pizza|夏威夷披薩", "we", "K", 230,
  "pizza dough 110 staple; tomato sauce 30 sour; mozzarella 40 creamy; ham 25 protein; pineapple 25 vegetable;"
  "olive oil 4 fat",
  rec="uk-cofid:11-1013")
D("doner-kebab", "Doner kebab wrap", "土耳其烤肉卷", "doner kebab|kebab wrap|shawarma|沙威玛", "ot", "K", 300,
  "pita bread 80 staple; lamb doner meat 100 protein; lettuce 25 vegetable; tomato 25 vegetable; onion 15 aromatic;"
  "yoghurt garlic sauce 30 creamy; chilli sauce 10 heat; cucumber 15 vegetable",
  rec="uk-cofid:19-526")
D("shepherds-pie", "Shepherd's pie", "牧羊人派", "cottage pie|shepherds pie|農舍派", "we", "R", 350,
  "lamb mince 90 protein; mashed potato 160 staple; butter 12 fat; milk 20 creamy; onion 20 aromatic;"
  "carrot 20 vegetable; green peas 15 vegetable; beef stock 30 liquid; Worcestershire sauce 5 season",
  rec="usda-fndds:2706594")
D("chicken-pie", "Chicken pot pie", "鸡肉派", "chicken pie|雞批|chicken and mushroom pie", "we", "K", 250,
  "puff pastry 70 staple; chicken thigh 60 protein; cream 30 creamy; chicken stock 30 liquid; butter 10 fat;"
  "wheat flour 8 thicken; carrot 15 vegetable; green peas 10 vegetable; onion 15 aromatic; egg wash 5 bind")
D("tiramisu", "Tiramisu", "提拉米苏", "提拉米蘇|tira mi su", "we", "D", 120,
  "mascarpone 45 creamy; ladyfinger biscuits 25 staple; eggs 20 bind; sugar 12 sweeten; espresso 15 liquid;"
  "cocoa powder 2 garnish; marsala wine 3 flavour-oil",
  rec="usda-fndds:2705702")
D("cheesecake", "Baked cheesecake", "芝士蛋糕", "new york cheesecake|乳酪蛋糕|芝士餅", "we", "D", 120,
  "cream cheese 60 creamy; digestive biscuits 20 staple; butter 10 fat; sugar 15 sweeten; eggs 15 bind;"
  "sour cream 10 creamy",
  rec="usda-fndds:2707861")
D("brownie", "Chocolate brownie", "布朗尼", "brownies|chocolate fudge brownie|布朗尼蛋糕", "we", "D", 70,
  "dark chocolate 18 sweeten; butter 15 fat; sugar 18 sweeten; eggs 10 bind; wheat flour 10 staple; cocoa powder 3 sweeten",
  rec="usda-fndds:2707904")
D("creme-brulee", "Creme brulee", "焦糖布丁", "crème brûlée|法式焦糖炖蛋", "we", "D", 130,
  "cream 80 creamy; egg yolks 25 bind; sugar 20 sweeten; vanilla 1 aromatic; milk 10 creamy",
  rec="usda-fndds:2705684")
D("waffles-ice-cream", "Waffles with ice cream", "华夫饼冰淇淋", "waffle and ice cream|窩夫雪糕|belgian waffle", "we", "D", 220,
  "wheat flour 60 staple; milk 50 creamy; eggs 25 bind; butter 15 fat; sugar 10 sweeten; vanilla ice cream 60 creamy;"
  "maple syrup 15 sweeten")
D("scones", "Scones with jam and cream", "司康饼配果酱奶油", "scone|司康|scones with clotted cream", "we", "D", 120,
  "wheat flour 50 staple; butter 15 fat; milk 20 creamy; sugar 6 sweeten; eggs 5 bind; strawberry jam 15 sweeten;"
  "clotted cream 15 creamy")

# ---------------------------------------------------------------- Desserts and kueh
D("cendol", "Cendol", "煎蕊", "chendol|珍多|chendul", "ma", "D", 300,
  "pandan rice flour jelly 50 staple; coconut milk 80 creamy; palm sugar syrup (gula melaka) 40 sweeten;"
  "red beans 30 protein; shaved ice 100 liquid; salt 1 season")
D("ice-kacang", "Ice kacang", "红豆冰", "ais kacang|air batu campur|abc|紅豆冰", "ma", "D", 350,
  "shaved ice 180 liquid; red beans 30 protein; sweet corn 25 vegetable; attap chee 15 sweeten; grass jelly 20 thicken;"
  "rose syrup 20 sweeten; sarsi syrup 15 sweeten; evaporated milk 20 creamy; sweetened condensed milk 20 sweeten")
D("bubur-cha-cha", "Bubur cha cha", "摩摩喳喳", "bubor cha cha|bo bo cha cha|mo mo cha cha", "ma", "D", 280,
  "coconut milk 100 creamy; sweet potato 50 vegetable; taro 40 vegetable; sago pearls 15 staple; sugar 20 sweeten;"
  "pandan leaves 2 aromatic; water 50 liquid; salt 1 season")
D("pulut-hitam", "Pulut hitam", "黑糯米粥", "black glutinous rice porridge|bubur pulut hitam|黑糯米", "ma", "D", 280,
  "black glutinous rice 50 staple; water 150 liquid; coconut milk 40 creamy; palm sugar (gula melaka) 25 sweeten;"
  "pandan leaves 2 aromatic; salt 1 season")
D("sago-gula-melaka", "Sago gula melaka", "椰糖西米", "sago pudding|gula melaka sago|西米布丁", "ma", "D", 200,
  "sago pearls 50 staple; water 50 liquid; coconut milk 50 creamy; palm sugar syrup (gula melaka) 40 sweeten;"
  "pandan leaves 2 aromatic; salt 1 season")
D("tau-huay", "Tau huay", "豆花", "douhua|beancurd dessert|豆腐花|tau hway", "ch", "D", 250,
  "soybeans 30 protein; water 170 liquid; gypsum (calcium sulphate) 1 bind; sugar syrup 45 sweeten;"
  "pandan leaves 2 aromatic")
D("tau-suan", "Tau suan", "豆爽", "split mung bean soup|綠豆爽|tau suan with you tiao", "ch", "D", 300,
  "split mung beans 50 protein; water 180 liquid; sugar 30 sweeten; sweet potato starch 12 thicken; pandan leaves 2 aromatic;"
  "you tiao 20 garnish")
D("orh-nee", "Orh nee", "芋泥", "teochew yam paste|yam paste dessert|芋泥白果", "ch", "D", 180,
  "taro 120 vegetable; lard 20 fat; sugar 20 sweeten; shallot oil 5 flavour-oil; ginkgo nuts 10 garnish;"
  "coconut milk 10 creamy")
D("red-bean-soup", "Red bean soup", "红豆汤", "hong dou tang|紅豆湯|red bean dessert", "ch", "D", 300,
  "red beans 50 protein; water 200 liquid; rock sugar 30 sweeten; dried tangerine peel 1 aromatic; sago pearls 10 staple;"
  "coconut milk 10 creamy")
D("mango-pomelo-sago", "Mango pomelo sago", "杨枝甘露", "yang zhi gan lu|楊枝甘露|mango sago", "ch", "D", 300,
  "mango 120 vegetable; pomelo 30 vegetable; sago pearls 20 staple; evaporated milk 50 creamy; coconut milk 40 creamy;"
  "sugar syrup 25 sweeten; water 20 liquid")
D("tang-yuan", "Tang yuan in ginger syrup", "汤圆", "glutinous rice balls|湯圓|tangyuan|ginger soup tang yuan", "ch", "D", 300,
  "glutinous rice flour 60 staple; black sesame paste 20 sweeten; lard 8 fat; sugar 25 sweeten; ginger 10 aromatic;"
  "pandan leaves 2 aromatic; water 170 liquid")
D("peanut-soup", "Peanut soup", "花生汤", "花生湯|peanut dessert soup", "ch", "D", 290,
  "peanuts 50 protein; water 215 liquid; rock sugar 25 sweeten; pandan leaves 2 aromatic",
  rec="taiwan-fda:Q2300101")
D("chng-tng", "Chng tng", "清汤", "cheng tng|清湯|teochew sweet soup", "ch", "D", 300,
  "water 200 liquid; dried longan 10 sweeten; white fungus 5 vegetable; barley 15 staple; lotus seeds 10 protein;"
  "ginkgo nuts 8 protein; persimmon strips 8 sweeten; rock sugar 25 sweeten; sweet potato starch noodles 10 staple")
D("kueh-salat", "Kueh salat", "沙拉糕", "seri muka|kuih seri muka|kueh serimuka", "pe", "D", 100,
  "glutinous rice 40 staple; coconut milk 25 creamy; eggs 15 bind; sugar 12 sweeten; pandan juice 8 aromatic;"
  "salt 1 season")
D("ondeh-ondeh", "Ondeh ondeh", "椰丝糯米球", "onde-onde|klepon|kuih buah melaka", "pe", "D", 80,
  "glutinous rice flour 35 staple; palm sugar (gula melaka) 15 sweeten; grated coconut 15 garnish; pandan juice 12 aromatic;"
  "salt 0.5 season")
D("kueh-lapis", "Kueh lapis", "九层糕", "kuih lapis|nine-layer kueh|千层糕|kue lapis", "pe", "D", 100,
  "rice flour 25 staple; tapioca starch 20 staple; coconut milk 35 creamy; sugar 18 sweeten; pandan juice 2 aromatic")
D("kueh-dadar", "Kueh dadar", "椰丝卷", "kuih dadar|kueh ketayap|coconut pandan crepe", "pe", "D", 90,
  "wheat flour 25 staple; eggs 12 bind; coconut milk 20 creamy; pandan juice 8 aromatic; grated coconut 15 garnish;"
  "palm sugar (gula melaka) 12 sweeten")
D("ang-ku-kueh", "Ang ku kueh", "红龟粿", "red tortoise cake|紅龜粿|ang koo kueh", "ch", "D", 80,
  "glutinous rice flour 30 staple; sweet potato 15 vegetable; mung bean paste 25 sweeten; sugar 6 sweeten;"
  "vegetable oil 3 fat")
D("bingka-ubi", "Kueh bingka ubi", "木薯糕", "bingka ubi|tapioca cake|kuih bingka", "pe", "D", 100,
  "grated tapioca 50 staple; coconut milk 25 creamy; eggs 10 bind; sugar 15 sweeten; butter 4 fat; pandan leaves 1 aromatic")
D("pulut-inti", "Pulut inti", "椰丝糯米", "kuih pulut inti|glutinous rice with coconut", "ma", "D", 100,
  "glutinous rice 55 staple; coconut milk 15 creamy; grated coconut 15 garnish; palm sugar (gula melaka) 12 sweeten;"
  "butterfly pea flower 1 garnish")
D("kueh-tutu", "Kueh tutu", "嘟嘟糕", "tutu kueh|kueh tutu peanut|putu piring", "ch", "D", 80,
  "rice flour 40 staple; ground peanuts 15 sweeten; sugar 10 sweeten; grated coconut 10 garnish; pandan leaves 1 aromatic")
D("pineapple-tart", "Pineapple tarts", "黄梨挞", "nastar|pineapple tart|黃梨撻|凤梨挞", "pe", "D", 60,
  "wheat flour 25 staple; butter 15 fat; egg yolk 5 bind; pineapple jam 15 sweeten; sugar 2 sweeten")
D("love-letters", "Love letters", "蛋卷", "kuih kapit|kueh belanda|love letter biscuits", "pe", "D", 40,
  "rice flour 12 staple; coconut milk 12 creamy; eggs 8 bind; sugar 7 sweeten; sesame seeds 1 garnish")
D("egg-tart", "Egg tart", "蛋挞", "dan tat|蛋撻|hong kong egg tart", "ch", "D", 125,
  "wheat flour 40 staple; butter 20 fat; eggs 35 protein; sugar 15 sweeten; evaporated milk 15 creamy",
  rec="taiwan-fda:Q0700301")
D("portuguese-egg-tart", "Portuguese egg tart", "葡式蛋挞", "pastel de nata|葡撻|portuguese tart", "we", "D", 125,
  "wheat flour 35 staple; butter 20 fat; egg yolks 20 bind; cream 30 creamy; milk 10 creamy; sugar 12 sweeten",
  rec="taiwan-fda:Q0700401")
D("pandan-chiffon", "Pandan chiffon cake", "班兰戚风蛋糕", "pandan cake|班蘭蛋糕|pandan chiffon", "pe", "D", 80,
  "eggs 30 bind; cake flour 15 staple; sugar 15 sweeten; coconut milk 12 creamy; vegetable oil 8 fat;"
  "pandan juice 5 aromatic; cream of tartar 0.5 bind")
D("butter-cake", "Butter cake", "牛油蛋糕", "pound cake|牛油糕|sugee cake", "we", "D", 80,
  "butter 22 fat; sugar 18 sweeten; eggs 18 bind; wheat flour 20 staple; evaporated milk 5 creamy")
D("mooncake", "Lotus paste mooncake", "莲蓉月饼", "mooncake|月餅|baked mooncake|蓮蓉月餅", "ch", "D", 90,
  "lotus seed paste 50 sweeten; salted egg yolk 10 protein; wheat flour 20 staple; golden syrup 8 sweeten;"
  "vegetable oil 4 fat; alkaline water 0.5 season")
D("mango-sticky-rice", "Mango sticky rice", "芒果糯米饭", "khao niao mamuang|芒果糯米飯|mango glutinous rice", "th", "D", 280,
  "glutinous rice 110 staple; coconut milk 50 creamy; sugar 20 sweeten; mango 100 vegetable; salt 1 season;"
  "mung beans 3 garnish")
D("bingsu", "Bingsu", "韩式雪花冰", "bingsoo|빙수|patbingsu|korean shaved ice", "ko", "D", 350,
  "shaved milk ice 220 creamy; sweet red beans 50 sweeten; sweetened condensed milk 30 sweeten; rice cakes (injeolmi) 25 staple;"
  "roasted soybean powder 10 garnish; fruit 20 vegetable")
D("halo-halo", "Halo-halo", "菲律宾刨冰", "halo halo|filipino shaved ice", "fi", "D", 350,
  "shaved ice 150 liquid; evaporated milk 40 creamy; sweet beans 30 protein; ube jam 25 sweeten; leche flan 25 protein;"
  "jackfruit 20 vegetable; nata de coco 20 sweeten; sago pearls 15 staple; ube ice cream 30 creamy")
D("durian-pengat", "Durian pengat", "榴莲椰浆", "pengat durian|durian dessert", "pe", "D", 200,
  "durian flesh 80 vegetable; coconut milk 80 creamy; palm sugar (gula melaka) 25 sweeten; pandan leaves 2 aromatic;"
  "salt 1 season")
D("ice-cream-sandwich", "Ice cream sandwich", "面包雪糕", "ice cream bread|roti ice cream|雪糕面包|potong", "ch", "D", 120,
  "rainbow bread 40 staple; ice cream block 75 creamy; sugar 3 sweeten; vanilla 1 aromatic")

# ---------------------------------------------------------------- Drinks
D("teh-tarik", "Teh tarik", "拉茶", "pulled tea|teh tarek|印度拉茶", "in", "D", 255,
  "black tea 180 liquid; sweetened condensed milk 40 sweeten; evaporated milk 30 creamy; sugar 5 sweeten")
D("kopi", "Kopi", "南洋咖啡", "kopi susu|nanyang coffee|kopitiam coffee", "ch", "D", 250,
  "brewed robusta coffee 200 liquid; sweetened condensed milk 35 sweeten; sugar 5 sweeten; evaporated milk 10 creamy")

D("hk-milk-tea", "Hong Kong milk tea", "港式奶茶", "silk stocking milk tea|港式絲襪奶茶|hk milk tea", "ch", "D", 250,
  "black tea 190 liquid; evaporated milk 45 creamy; sugar 12 sweeten; sweetened condensed milk 5 sweeten")
D("milo-dinosaur", "Milo dinosaur", "美禄恐龙", "milo dino|美祿恐龍|iced milo", "ch", "D", 345,
  "malted chocolate powder (Milo) 50 sweeten; sweetened condensed milk 25 sweeten; water 150 liquid; ice 120 liquid")
D("bandung", "Bandung", "玫瑰露", "air bandung|sirap bandung|rose milk", "ma", "D", 300,
  "rose syrup 40 sweeten; evaporated milk 60 creamy; water 100 liquid; ice 100 liquid")
D("thai-milk-tea", "Thai milk tea", "泰式奶茶", "cha yen|thai iced tea|泰奶", "th", "D", 350,
  "Thai tea 200 liquid; sweetened condensed milk 40 sweeten; evaporated milk 30 creamy; sugar 15 sweeten; ice 65 liquid")
D("bubble-tea", "Bubble milk tea", "珍珠奶茶", "boba milk tea|pearl milk tea|波霸奶茶|bubble tea", "ch", "D", 500,
  "black tea 330 liquid; tapioca pearls 90 staple; non-dairy creamer 40 creamy; sugar syrup 40 sweeten",
  rec="taiwan-fda:O0702101")
D("viet-iced-coffee", "Vietnamese iced coffee", "越南冰咖啡", "cà phê sữa đá|ca phe sua da|越南滴漏咖啡", "vi", "D", 250,
  "drip coffee 100 liquid; sweetened condensed milk 40 sweeten; ice 110 liquid; sugar 5 sweeten")
D("mango-lassi", "Mango lassi", "芒果拉昔", "lassi|sweet lassi|芒果酸奶", "in", "D", 300,
  "yoghurt 150 creamy; mango pulp 100 vegetable; milk 30 creamy; sugar 15 sweeten; cardamom 0.5 aromatic")
D("soy-milk", "Soya bean milk", "豆浆", "soy milk|豆漿|tau huay chwee|soya milk", "ch", "D", 297,
  "soybeans 40 protein; water 230 liquid; sugar 25 sweeten; pandan leaves 2 aromatic",
  rec="taiwan-fda:R5000101")
D("grass-jelly-drink", "Grass jelly drink", "仙草蜜", "chin chow drink|cincau|仙草|leong fun", "ch", "D", 300,
  "grass jelly 100 thicken; water 165 liquid; sugar syrup 30 sweeten; honey 5 sweeten",
  rec="taiwan-fda:O0200201")
D("winter-melon-tea", "Winter melon tea", "冬瓜茶", "winter melon drink|dong gua cha|冬瓜汁", "ch", "D", 300,
  "winter melon 60 vegetable; water 200 liquid; brown sugar 30 sweeten; rock sugar 10 sweeten",
  rec="taiwan-fda:O0702801")
D("chrysanthemum-tea", "Chrysanthemum tea", "菊花茶", "kek huay|chrysanthemum drink|菊花水", "ch", "D", 300,
  "dried chrysanthemum 5 aromatic; water 265 liquid; rock sugar 25 sweeten; goji berries 5 garnish",
  rec="taiwan-fda:O0702601")

# ---------------------------------------------------------------- More noodles, zi char and festive dishes
D("tonkotsu-ramen", "Tonkotsu ramen", "豚骨拉面", "ramen|tonkotsu|豚骨ラーメン|豚骨拉麵", "ja", "N", 620,
  "ramen noodles 180 staple; pork bone broth 330 liquid; chashu pork 50 protein; marinated soft-boiled egg 50 protein;"
  "bamboo shoots (menma) 15 vegetable; spring onion 8 garnish; nori 2 vegetable; garlic oil 6 flavour-oil;"
  "soy tare 15 season; bean sprouts 20 vegetable",
  rec="usda-fndds:2709158")
D("niku-udon", "Niku udon", "日式牛肉乌冬面", "beef udon|肉うどん|udon|牛肉烏冬", "ja", "N", 620,
  "udon noodles 250 staple; dashi 280 liquid; beef slices 60 protein; onion 20 aromatic; soy sauce 15 season;"
  "mirin 12 sweeten; sugar 5 sweeten; spring onion 5 garnish; kamaboko 15 protein")
D("tempura-soba", "Tempura soba", "天妇罗荞麦面", "soba|天ぷらそば|zaru soba|蕎麥麵", "ja", "N", 530,
  "buckwheat noodles 200 staple; dashi (bonito) 250 liquid; prawn tempura 50 protein; soy sauce 15 season;"
  "mirin 12 sweeten; spring onion 5 garnish; shichimi 1 heat")
D("yakisoba", "Yakisoba", "日式炒面", "焼きそば|japanese fried noodles|日式炒麵", "ja", "N", 380,
  "steamed wheat noodles 200 staple; pork belly 50 protein; cabbage 60 vegetable; carrot 15 vegetable; onion 20 aromatic;"
  "yakisoba sauce 25 sweeten; vegetable oil 10 fat; aonori 1 garnish; pickled ginger 5 garnish")
D("pad-thai", "Pad thai", "泰式炒河粉", "phat thai|pad thai gai|泰式炒金边粉|ผัดไทย", "th", "N", 400,
  "rice noodles (sen lek) 180 staple; chicken 50 protein; prawns 30 protein; eggs 40 protein; firm tofu 20 protein;"
  "bean sprouts 30 vegetable; Chinese chives 10 vegetable; tamarind paste 15 sour; fish sauce 10 season;"
  "palm sugar 12 sweeten; dried shrimp 6 flavour-oil; crushed peanuts 12 garnish",
  rec="usda-fndds:2708806")
D("pad-see-ew", "Pad see ew", "泰式酱油炒河粉", "phat si-io|pad siew|泰式黑酱油炒粉", "th", "N", 400,
  "wide rice noodles 200 staple; chicken 60 protein; eggs 40 protein; Chinese broccoli 50 vegetable;"
  "dark soy sauce 12 season; oyster sauce 10 season; fish sauce 5 season; sugar 5 sweeten; garlic 6 aromatic;"
  "vegetable oil 15 fat")
D("boat-noodles", "Thai boat noodles", "泰式船面", "kuay teow reua|船麵|boat noodle soup", "th", "N", 440,
  "rice noodles 120 staple; beef slices 40 protein; beef balls 30 protein; pork blood 15 liquid; beef broth 180 liquid;"
  "dark soy sauce 8 season; fish sauce 6 season; morning glory 20 vegetable; bean sprouts 20 vegetable;"
  "star anise 1 aromatic; fried garlic 4 garnish; Thai basil 3 garnish")
D("bun-cha", "Bun cha", "越南烤肉米线", "bún chả|hanoi grilled pork noodles", "vi", "N", 430,
  "rice vermicelli 150 staple; grilled pork patties 70 protein; grilled pork belly 50 protein;"
  "fish sauce dip (nuoc cham) 80 season; lettuce 30 vegetable; mint 5 garnish; pickled green papaya 30 sour;"
  "garlic 5 aromatic; sugar 8 sweeten; bird's eye chilli 3 heat")
D("hainanese-beef-noodles", "Hainanese beef noodles", "海南牛肉粿条", "beef kway teow soup|牛肉粿條|hainanese beef noodle soup", "ch", "N", 560,
  "flat rice noodles 180 staple; beef slices 50 protein; beef tripe 30 protein; beef balls 40 protein;"
  "beef broth 220 liquid; salted vegetables 15 vegetable; Chinese celery 5 garnish; peanuts 8 garnish;"
  "chilli sauce 10 heat; star anise 1 aromatic; fried shallots 4 garnish")
D("ipoh-hor-fun", "Ipoh shredded chicken hor fun", "怡保鸡丝河粉", "ipoh hor fun|chicken hor fun|怡保河粉|鸡丝河粉", "ch", "N", 520,
  "flat rice noodles 200 staple; shredded chicken 60 protein; prawns 30 protein; chicken and prawn broth 180 liquid;"
  "bean sprouts 20 vegetable; Chinese chives 8 vegetable; shallot oil 8 flavour-oil; spring onion 3 garnish;"
  "light soy sauce 6 season")
D("fish-head-bee-hoon", "Fried fish head bee hoon soup", "鱼头米粉", "fish head bee hoon|milky fish soup|炸鱼头米粉|鱼头米粉汤", "ch", "N", 610,
  "rice vermicelli 150 staple; fried fish head pieces 120 protein; fish stock 240 liquid; evaporated milk 30 creamy;"
  "tomato 25 vegetable; salted vegetables 20 vegetable; ginger 6 aromatic; Shaoxing wine 6 flavour-oil;"
  "spring onion 3 garnish; potato starch 10 coat")
D("satay-bee-hoon", "Satay bee hoon", "沙爹米粉", "satay mee hoon|沙嗲米粉", "ch", "N", 470,
  "rice vermicelli 160 staple; peanut satay sauce 120 creamy; cockles 20 protein; pork slices 30 protein;"
  "cuttlefish 20 protein; prawns 20 protein; water spinach 40 vegetable; tau pok 20 protein; pork liver 15 protein;"
  "dried chilli 5 heat")
D("thunder-tea-rice", "Hakka thunder tea rice", "客家擂茶饭", "lei cha|擂茶|lei cha fan", "ch", "R", 450,
  "brown rice 200 staple; green tea and herb soup 150 liquid; dried shrimp 8 flavour-oil; long beans 20 vegetable;"
  "preserved radish (chai poh) 15 season; tofu 20 protein; Chinese chives 15 vegetable; peanuts 15 garnish;"
  "sesame seeds 5 garnish; garlic 5 aromatic")
D("abacus-seeds", "Hakka abacus seeds", "客家算盘子", "suan pan zi|算盤子|yam abacus", "ch", "W", 250,
  "taro and tapioca dumplings 150 staple; minced pork 30 protein; dried shrimp 8 flavour-oil; dried squid 8 protein;"
  "shiitake mushrooms 10 vegetable; wood ear fungus 8 vegetable; garlic 6 aromatic; oyster sauce 8 season;"
  "vegetable oil 12 fat")
D("peking-duck", "Peking duck", "北京烤鸭", "beijing roast duck|北京烤鴨|peking duck pancakes", "ch", "W", 200,
  "roast duck with skin 100 protein; Mandarin pancakes 50 staple; hoisin sauce 15 sweeten; cucumber 20 vegetable;"
  "spring onion 10 vegetable; maltose 5 sweeten")
D("mala-xiang-guo", "Mala xiang guo", "麻辣香锅", "mala|mala stir-fry|麻辣香鍋|mala dry pot", "ch", "W", 450,
  "luncheon meat 40 protein; fish balls 40 protein; sliced pork 40 protein; instant noodles 50 staple;"
  "lotus root 40 vegetable; potato 40 vegetable; enoki mushrooms 40 vegetable; tofu skin 30 protein;"
  "mala paste 30 heat; Sichuan peppercorn 3 heat; garlic 10 aromatic; vegetable oil 35 fat")
D("suan-cai-yu", "Pickled cabbage fish", "酸菜鱼", "suan cai yu|sour vegetable fish|酸菜魚", "ch", "S", 600,
  "fish fillet 150 protein; pickled mustard greens 80 vegetable; fish stock 280 liquid; egg white 10 bind;"
  "corn starch 8 coat; Sichuan peppercorn 3 heat; dried chilli 5 heat; garlic 10 aromatic; ginger 8 aromatic;"
  "vegetable oil 20 fat; glass noodles 30 staple")
D("three-cup-chicken", "Three cup chicken", "三杯鸡", "san bei ji|三杯雞", "ch", "W", 260,
  "chicken thigh 180 protein; sesame oil 15 flavour-oil; soy sauce 15 season; rice wine 15 flavour-oil;"
  "Thai basil 8 aromatic; garlic 15 aromatic; ginger 10 aromatic; rock sugar 5 sweeten; red chilli 3 heat")
D("popcorn-chicken", "Taiwanese popcorn chicken", "盐酥鸡", "yan su ji|鹽酥雞|taiwanese fried chicken bites", "ch", "K", 180,
  "chicken thigh 130 protein; sweet potato starch 20 coat; soy sauce 8 season; garlic 6 aromatic;"
  "five-spice powder 1 season; white pepper 1 season; Thai basil 3 garnish; vegetable oil 15 fat")
D("bak-kwa", "Bak kwa", "肉干", "barbecued pork jerky|肉乾|long yoke|rou gan", "ch", "K", 60,
  "minced pork 45 protein; sugar 10 sweeten; fish sauce 2 season; light soy sauce 2 season; rice wine 1 flavour-oil;"
  "five-spice powder 0.5 season",
  rec="taiwan-fda:R5200201")
D("yusheng", "Yu sheng", "鱼生", "lo hei|prosperity toss|魚生|yee sang", "ch", "K", 250,
  "raw salmon 40 protein; shredded white radish 50 vegetable; shredded carrot 40 vegetable; pickled ginger 15 sour;"
  "pomelo 20 vegetable; fried crackers 20 staple; plum sauce 30 sweeten; sesame oil 5 flavour-oil;"
  "crushed peanuts 15 garnish; five-spice powder 1 season; lime 5 sour")

# ---------------------------------------------------------------- Build
def load_records() -> tuple[dict, dict, dict]:
    names: dict[tuple[str, str], dict] = {}
    with (BUILD / "foods.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            if row and row[0] in DISH_DATASETS:
                names[(row[0], row[1])] = json.loads(row[2])
    values: dict[tuple[str, str], dict] = {}
    with (BUILD / "values.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            if row and row[0] in DISH_DATASETS and row[2] in ("kcal", "protein") and row[3] != "":
                values.setdefault((row[0], row[1]), {})[row[2]] = float(row[3])
    credits: dict[str, str] = {}
    with (BUILD / "datasets.csv").open(encoding="utf-8", newline="") as f:
        for row in csv.reader(f):
            if row and row[0] in DISH_DATASETS:
                title, edition, licence, attribution = row[1], row[2], row[3], row[5]
                credits[row[0]] = attribution or f"{title} ({edition}), {licence}; adapted by QuinTaste."
    return names, values, credits

def record_name(dataset: str, names: dict) -> str:
    if dataset == "taiwan-fda" and names.get("zh-Hant"):
        return names["zh-Hant"]
    return names.get("en") or names.get("ja") or next(iter(names.values()))

def validate(cards: list[dict]) -> list[str]:
    errors: list[str] = []
    ids: set[str] = set()
    seen: dict[str, str] = {}
    for c in cards:
        cid = c["id"]
        if cid in ids:
            errors.append(f"{cid}: duplicate id")
        ids.add(cid)
        if not cid.replace("-", "").isalnum() or cid != cid.lower():
            errors.append(f"{cid}: id is not kebab-case")
        labels = [c["name"]["en"], c["name"]["zh"], *c["aliases"]]
        for label in labels:
            key = label.casefold().strip()
            if key in seen and seen[key] != cid:
                errors.append(f"{cid}: '{label}' already used by {seen[key]}")
            elif key in seen:
                errors.append(f"{cid}: '{label}' repeated within the card")
            seen[key] = cid
        if c["category"] not in CATEGORIES.values():
            errors.append(f"{cid}: bad category")
        if c["cuisine"] not in CUISINES.values():
            errors.append(f"{cid}: bad cuisine")
        parts = c["parts"]
        if not 4 <= len(parts) <= 12:
            errors.append(f"{cid}: {len(parts)} parts")
        for p in parts:
            if p["role"] not in ROLES:
                errors.append(f"{cid}: bad role {p['role']} on {p['name']}")
            if not p["grams"] > 0:
                errors.append(f"{cid}: grams must be positive on {p['name']}")
        total = sum(p["grams"] for p in parts)
        if not 0.75 * c["serving"] <= total <= 1.25 * c["serving"]:
            errors.append(f"{cid}: parts sum {total:g} g vs serving {c['serving']} g")
        has_rec = "record" in c
        if has_rec != ("protein" in c and "kcal" in c and "recordName" in c):
            errors.append(f"{cid}: record, recordName, protein and kcal must come together")
    return errors

def main() -> int:
    names, values, credits = load_records()
    used: dict[str, int] = {}
    problems: list[str] = []
    cards: list[dict] = []
    for raw in CARDS:
        card = {k: v for k, v in raw.items() if k != "record"}
        rec = raw["record"]
        if rec:
            dataset, _, rid = rec.partition(":")
            key = (dataset, rid)
            if key not in names:
                problems.append(f"{raw['id']}: record {rec} not found in foods.csv")
                continue
            per100 = values.get(key, {})
            if "protein" not in per100 or "kcal" not in per100:
                problems.append(f"{raw['id']}: record {rec} lacks protein or kcal in values.csv")
                continue
            serving = raw["serving"]
            card["record"] = rec
            card["recordName"] = record_name(dataset, names[key])
            card["protein"] = round(per100["protein"] * serving / 100, 1)
            card["kcal"] = round(per100["kcal"] * serving / 100)
            used[dataset] = used.get(dataset, 0) + 1
        cards.append(card)
    problems += validate(cards)
    if problems:
        for p in problems:
            print("ERROR", p, file=sys.stderr)
        return 1

    out = {
        "version": VERSION,
        "review": "drafted",
        "notes": (
            "Dish cards for Snap a dish: the usual home or hawker version of popular Singapore and Asian "
            "dishes, listing each part with its weight and role (meat, seafood, egg and the five pungent "
            "included as they are usually cooked) so the app can swap animal parts for plant ones. Parts and "
            "serving weights are drafted by QuinTaste from common recipes and hawker portions and wait for "
            "staff and cook review. Protein and energy per serving appear only where a measured dish record "
            "of the same dish exists (USDA FNDDS, UK CoFID, Taiwan FDA or the Japanese Standard Tables); they "
            "are the record's per-100 g figures scaled to the serving, and are left out when no honest record exists."
        ),
        "credits": [credits[d] for d in sorted(used)],
        "cards": cards,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"cards: {len(cards)}")
    print(f"linked: {sum(used.values())}")
    for d in sorted(used):
        print(f"  {d}: {used[d]}")
    print(f"unlinked: {len(cards) - sum(used.values())}")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
