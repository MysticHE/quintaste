> Current 17 October update: `20261017-reviewed-diet37` deployed/live verified; 174 mapped browse locations, 173 covers/120 hours; 1 cover/54 hours/3387 unavailable prices remain. [Current checklist](current-catalogue-readiness-2026-10-17.md), [verification/source report](catalogue-enrichment-2026-10-17ag.md). Full source coverage and physical-device/capacity acceptance remain open. Historical paused checkpoint below is superseded.

# Reviewed catalogue checkpoint — 17 October 2026

**Deployed for owner review: `20261017-branch-hours9`. Further research is paused at the owner’s request. Overall coverage is not complete.**

[Open the live app](https://quintaste.srv1902914.hstgr.cloud). Tap the main photo card for location details; use Menu for dishes. The photo-led cards, simple dish rows and separate location details are live.

## Reviewed and deployed coverage

| Field | Coverage |
| --- | --- |
| Browse locations with reviewed menu data | 174 / 174 |
| Published menu IDs | 175, including one preserved alias |
| Enhanced covers | 54 / 174 |
| Source-backed opening hours | 88 / 174 |
| Menu, cover and hours all available | 43 / 174 |
| Remaining cover gaps | 120 |
| Remaining hours gaps | 86 |

“All three available” describes field coverage, not proof that every possible dish or price is known. Source dates and unresolved holds remain. The 150 Green alias represents two reviewed source snapshots of the same exact branch: one browse card, both original menu IDs preserved. It does not create a duplicate card.

The latest release adds covers for egg.plant Marina Bay, Tofu G Waterway Point, Tofu G Suntec City, Merle & Co, Daehwa and Baomaker. It adds operator/landlord-backed hours for Boneless Kitchen, Merle & Co and egg.plant. Earlier reviewed batches remain included.

## Verification and storage

Live checks passed all 175 menu fingerprints, 174 unique browse entries, 54 cover metadata records, 88 schedules and all 45 asset hashes. Seven affected card/location flows and three menu flows passed, with no browser errors or provider calls. Narrow dark and wide light layouts reuse image caches on back navigation. Postal/module tests pass in three API load orders. The clean export and package preserve the concurrent Cook cleanup. TypeScript and scoped lint passed for the unchanged source baseline; no application source changes were introduced by this data release.

Web bundle bytes match the tested export. Android/iOS manifests and bundles pass transport, current-code and scope checks; physical-device appearance remains unverified. App and preview are healthy. Admin and PostgreSQL were not changed. Reviewed menu JSON and cover assets are deployed in the VPS application images; no PostgreSQL menu-table migration was performed.

The first 20 summary records were 15,076 bytes; one live request took 53.2 ms (not a benchmark). All 45 cover assets total 5,996,219 bytes and load only when needed. Existing bounded caches, pagination, account isolation, cancellation/deduplication and conditional revalidation remain. VPS snapshot: 25 GB available, 75% used; app memory 136.5 MiB.

Google ledger remains 2,419 / 2,500 (81 left), SHA256 `c7321dafaad0473583139494ca899501578892c5b71105429d3cd4dceb4f311a`. Live counters remain 100 text / 8 nearby / 19 details / 545 photos. Original 44-file recovery backup remains preserved. Source attribution and rights remain attached to enhancements; enhancement itself does not establish a new licence.

## Paused work and unresolved evidence

Eight SHU branch references and two generated enhancements are saved privately, but have not been integrated or deployed. The generation already in flight finished before the checkpoint. Resume from `.local/coverage-2026-10-17g/pause-checkpoint.json`; do not re-download or regenerate the completed references. Seven branches share the same food-spread composition; HQ uses a different platter. Woodlands 354A remains excluded from this mapping.

The broader research holds remain: 2,527 held food observations, 109 zero-food research branches, 1,828 unnamed candidate IDs and 8 coordinate holds. Exact screenshot photos for Makan Vegan and Soon Lai remain unrecovered. Kind Kones unit mismatch and other conflicting hours remain unconfirmed.

Deployment used the latest `cook-cleanup2` baseline. The stale `branch-hours8` promotion was rejected by the live-base guard before mutation; `branch-hours9` was rebuilt and promoted successfully. Rollback: `/docker/quintaste/deployment-backups/20261017-branch-hours9`.

## Branch checklist

Every row below has reviewed menu data and a location detail page. “Available” means deployed; “Missing” preserves an unresolved gap. Full menu, photo and hours source URLs/check dates are in [the JSON checklist](../../data/menu-research/review-checkpoint-2026-10-17.json).

| Branch and location | Cover | Hours | All three | Menu checked |
| --- | --- | --- | --- | --- |
| 150 Green Vegetarian — 150 Bukit Batok Street 11 #01-224, Singapore 650150 | Missing | Missing | No | 2026-10-16 |
| 99 Vegetarian — 638A Jurong West Street 61 #01-22 Stall 10, Pioneer Mall, Singapore 641638 | Missing | Missing | No | 2026-10-16 |
| Ahimsa Sanctuary — 76 Neil Road, Singapore 088840 | Missing | [Available](https://www.ahimsacommunityysg.com/) | No | 2026-10-15 |
| An Açaí Affair (Yishun Northpoint) — 1 Northpoint Drive #B2-149 (South Wing), Singapore 768019 | Missing | [Available](https://www.anacaiaffair.com/yishun-northpoint) | No | 2026-10-16 |
| Ananda Bhavan (58 Serangoon Road) — 58 Serangoon Road, Little India Conservation Area, Singapore 217964 | Missing | [Available](https://www.anandabhavan.com/outlet) | No | 2026-10-15 |
| Ananda Bhavan (95 Syed Alwi Road) — 95 Syed Alwi Road, Singapore 207670 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhCGeBdXhySSkWybeupsAnzk!2e10!4m2!3m1!1s0x31da19c7cfdd5e35:0x2aac24c681d9097d) | [Available](https://www.anandabhavan.com/outlet) | Yes | 2026-10-15 |
| Annalakshmi Cafe — 6A Shenton Way #03-26 Downtown Gallery, Singapore 068815 | Missing | [Available](https://www.annalakshmi.sg/cafe) | No | 2026-10-15 |
| Any1 Choco — 114 Telok Ayer Street, Singapore 068583 | Missing | [Available](https://anyonechoco.com/shops/telok-ayer-street-singapore/) | No | 2026-10-16 |
| Ascend Vegetarian — 18 Cross Street #B1-12, K4, Singapore 048423 | Missing | [Available](https://www.18cross.sg/ascend-signature) | No | 2026-10-16 |
| Bao Su Zhai — 1 Sengkang Square #04-11 Stall 23, Compass One, Singapore 545078 | Missing | Missing | No | 2026-10-16 |
| Baomaker — 447 Ang Mo Kio Avenue 10 #01-1675, Singapore 560447 | [Available](https://baomaker.com/) | Missing | No | 2026-10-15 |
| Bodhi Deli — 190 Middle Road #03-26, Fortune Centre, Singapore 188979 | Missing | Missing | No | 2026-10-15 |
| Botanict — Blk 352 Clementi Avenue 2 #01-123, Singapore 120352 | Missing | Missing | No | 2026-10-15 |
| Co+Nut+Ink — 2 Haji Lane #01-01, Singapore 189195 | Missing | [Available](https://conutink.com/find-us/) | No | 2026-10-16 |
| Co+Nut+Ink — 310 Orchard Road #01-K2, Singapore 238864 | Missing | [Available](https://conutink.com/find-us/) | No | 2026-10-16 |
| Cookie Coffee Cafe Bar — 190 Middle Road #01-28B Fortune Centre, Singapore 188979 | Missing | Missing | No | 2026-10-16 |
| Cultivate Cafe (Maxwell Reserve) — Maxwell Reserve Singapore, Autograph Collection, 2 Cook Street, Singapore 078857 | Missing | [Available](https://cultivatecafe.sg/) | No | 2026-10-15 |
| D'Life — 277 Orchard Road #B2-04A/05 Singapore,, 238858, Singapore | [Available](https://dlife.getz.co/?StoreID=5f6ae0b4-a479-4131-a288-14bc7e3d5992&Service=PickUp&lang=EN) | Missing | No | 2026-10-15 |
| D'Life — 428 Jurong West Ave 1 #01-256, 640428, Singapore | [Available](https://dlife.getz.co/?StoreID=eec50bad-d2aa-4c7d-a9c8-6aaef1ed32ad&Service=PickUp&lang=EN) | Missing | No | 2026-10-15 |
| D'Life (Tengah Drive) — 126B TENGAH DRIVE #01-319, PLANTATION VILLAGE S(692126) | Missing | Missing | No | 2026-10-15 |
| D'Life Signature — 133 New Bridge Road #02-37, Chinatown Point, Singapore 059413 | Missing | Missing | No | 2026-10-15 |
| Daehwa Vegetarian Restaurant — 1 Fusionopolis Place, #01-35, Galaxis, Singapore 138522 | [Available](https://daehwavegetarian.com/) | [Available](https://daehwavegetarian.com/) | Yes | 2026-10-15 |
| Daily Green (Bedok) — 217 Bedok North Street 1 #01-77 Food Loft®, Singapore 460217 | Missing | [Available](https://www.dailygreen.sg/locations) | No | 2026-10-15 |
| Daily Green (Hougang Mall) — 90 Hougang Ave 10 #04-11 Hougang Mall Foodies’ Garden®, Singapore 538766 | Missing | [Available](https://www.dailygreen.sg/locations) | No | 2026-10-15 |
| Delcie’s Desserts and Cakes — 34 Whampoa West #01-83, Singapore330034 | [Available](https://delcies.com/products?items_per_page=all) | [Available](https://delcies.com/contact-us) | Yes | 2026-10-16 |
| Divine Realm Vegetarian (Hougang Avenue 8) — 501 Hougang Avenue 8 #01-630, Singapore 530501 | Missing | Missing | No | 2026-10-15 |
| Divine Vegetarian Family Restaurant (Hougang Avenue 7) — Blk 356 #01-803 Hougang Ave 7, Singapore 530356 | Missing | Missing | No | 2026-10-15 |
| Eco Sen Vegetarian Food 缘森素食 — 66 Lorong 4 Toa Payoh, Singapore 310066 | Missing | Missing | No | 2026-10-16 |
| Eco-Harmony Cafe — 106 Aljunied Crescent #01-205, Singapore 380106 | Missing | [Available](https://www.eco-harmony.net/cafe) | No | 2026-10-16 |
| egg.plant - Marina Bay Link Mall — 8A Marina Boulevard #B2-33 Marina Bay Link Mall, Singapore 018984 | [Available](https://bythebay.com.sg/directory) | [Available](https://bythebay.com.sg/directory) | Yes | 2026-10-16 |
| elemen — 1 Woodlands Height #01-02, Koufu Headquarters, Singapore 737859 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhAejubK0dmbyEqs0RCc1uhS!2e10!4m2!3m1!1s0x31da131cee072ec5:0x437d8125b3621705) | [Available](https://www.elemengroup.com.sg/locations) | Yes | 2026-10-15 |
| elemen — 10 Paya Lebar Road #03-13, PLQ Mall, Singapore 409057 | [Available](https://www.elemengroup.com.sg/locations) | [Available](https://www.elemengroup.com.sg/locations) | Yes | 2026-10-15 |
| elemen — 9 Raffles Boulevard #01-75/75A/76, Millenia Walk, Singapore 039596 | [Available](https://www.elemengroup.com.sg/locations) | [Available](https://www.elemengroup.com.sg/locations) | Yes | 2026-10-15 |
| Fennel by Komala Vilas — 413 River Valley Road, Singapore 248311 | Missing | [Available](https://komalavilas.com.sg/contact/) | No | 2026-10-16 |
| Fire Flies Vegetarian — 101 Upper Cross Street B1-06 Stall 10, People's Park Centre, Singapore 058357 | Missing | Missing | No | 2026-10-16 |
| Flavours By Saute — 107 North Bridge Road, #B1-30 Funan, Singapore 179105 | Missing | [Available](https://www.saute.com.sg/flavours-menu) | No | 2026-10-15 |
| Fo You Yuan Vegetarian Restaurant — 369 Jalan Besar, Singapore 208997 | Missing | [Available](https://foyouyuan.com.sg/) | No | 2026-10-15 |
| Gan Taste Vegetarian — 20 Lorong 7 Toa Payoh #01-758, Singapore 310020 | Missing | Missing | No | 2026-10-16 |
| Genesis Vegan Restaurant (Havelock II) — 2 Havelock Road, #B1-01 Havelock II, Singapore 059763 | Missing | Missing | No | 2026-10-15 |
| Gokul-Raas Vegetarian — 19 Upper Dickson Road, Singapore 207478 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhD8frvlIoGN6DWGSBP5LZOD!2e10!4m2!3m1!1s0x31da19b89335e4b1:0x91cbe15e27acebee) | [Available](https://www.gokulraasvegetarian.com.sg/faq.php) | Yes | 2026-10-15 |
| Green Harmony Vegetarian 素和轩 — 443 Ang Mo Kio Avenue 10, #01-1221, Singapore 560443 | Missing | Missing | No | 2026-10-16 |
| Green On Earth — 386 Upper Bukit Timah Road, The Rail Mall, Singapore 678043 | Missing | [Available](https://railmall.com.sg/our-stores/?type=dining) | No | 2026-10-15 |
| Greendot — 1 Jelebu Rd, Bukit Panjang Plaza, 677743, Singapore | [Available](https://orders.greendot.sg/?StoreID=e651dea9-726c-4921-bbe0-e1cbb9abaf6d&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 1 Jurong West Central 2 Jurong Point JP 1 #01-43/44/45, 648886, Singapore | [Available](https://orders.greendot.sg/?StoreID=5252756f-953c-4270-90c7-05ce23f97896&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 1 Raffles Place, #03-23/24, 048616, Singapore | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIHM0ogKEICAgID8qua6Dg!2e10!4m2!3m1!1s0x31da190eb03510e1:0xfff273aefca243de) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 1 Vista Exchange Green, #02-04, The Star Vista 138617, Singapore | [Available](https://orders.greendot.sg/?StoreID=f39c03dc-5939-438d-b91e-df0677037d8c&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 10 Tampines Central 1, Tampines 1, #B1-K8, 529536, Singapore | [Available](https://orders.greendot.sg/?StoreID=aab91d55-dec1-4f37-b3d9-679099c43136&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 3 Gateway Dr, #01-06 Westgate, 608532, Singapore | [Available](https://orders.greendot.sg/?StoreID=4b9717ab-a5dc-432c-8cd5-20627535147a&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 311 New Upper Changi Road B2-31, Bedok Mall, 467360, Singapore | [Available](https://orders.greendot.sg/?StoreID=b33dedbe-40e7-40c8-a110-b4bb4239c938&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 33 Sengkang West Avenue #B1-01 The Seletar Mall, 797653, Singapore | [Available](https://orders.greendot.sg/?StoreID=191ae5df-d765-4e6d-8261-b35209534a04&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 60 Paya Lebar Road Paya Lebar Square #02-15/16/17, 409051, Singapore | [Available](https://orders.greendot.sg/?StoreID=e116e7c4-3ea8-46c0-a794-077e09797d97&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 8 Marina View, Tower 1, #02-02, 018960, Singapore | [Available](https://orders.greendot.sg/?StoreID=47a71ad4-01ef-487c-be94-f66c9f8e0ba3&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 9 Bishan Pl, #B1-24 24A, 579837, Singapore | [Available](https://orders.greendot.sg/?StoreID=3d67bdd1-f091-4960-b693-5af3a1f2ab5b&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot — 930 Yishun Ave 2, Northpoint City  North Wing, #B2-09/11, 769098, Singapore | [Available](https://orders.greendot.sg/?StoreID=f8e46fd5-d7a7-4173-b102-20e44d859073&Service=PickUp&lang=EN) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greendot Plus — 78 Aiport Blvd, #B1-297 Jewel Changi Airport, 819666, Singapore | [Available](https://commons.wikimedia.org/wiki/File:At_Jewel_Changi,_Singapore_2023_78.jpg) | [Available](https://restaurant.momos.io/greendot-c29da/locations) | Yes | 2026-10-15 |
| Greenland Vegetarian — 789 & 791 Upper Serangoon Road, Singapore 534659 | Missing | Missing | No | 2026-10-15 |
| Happy Vegetarian Food - Hougang — 106 Hougang Avenue 1 #01-1239, Singapore 530106 | Missing | Missing | No | 2026-10-16 |
| Harmony Hut — 157A Serangoon North Avenue 1 #01-01, Singapore 551157 | Missing | Missing | No | 2026-10-16 |
| JO-YI CAFE — 136 Bedok North Avenue 3 #01-148, Singapore 460136 | [Available](https://www.jo-yi.com/menu) | [Available](https://www.jo-yi.com/menu) | Yes | 2026-10-15 |
| Joie by DOZO (Orchard Central) — 181 Orchard Road, #12-01 Orchard Central, Singapore 238896 | [Available](https://www.joierestaurant.com.sg/) | [Available](https://www.joierestaurant.com.sg/contact-us) | Yes | 2026-10-15 |
| Ju Fu Yuan Vegetarian — 262 Serangoon Central Drive #01-91, Singapore550262 | Missing | Missing | No | 2026-10-16 |
| Ju Fu Yuan Vegetarian Delight — 162 Ang Mo Kio Avenue 4 #01-14, Singapore 560162 | Missing | Missing | No | 2026-10-16 |
| Ju Fu Yuan Vegetarian Delight — 7 Eunos Crescent #01-2655, Singapore 400007 | Missing | Missing | No | 2026-10-16 |
| Kailash Parbat — 1 Changi Business Park Crescent #01-10/12/13 Plaza8, Singapore 486025 | Missing | [Available](https://www.kailashparbat.com.sg/contact) | No | 2026-10-15 |
| Kailash Parbat — 3 Belilios Road #01-03 Hilton Garden Inn, Singapore 219924 | Missing | [Available](https://www.kailashparbat.com.sg/contact) | No | 2026-10-15 |
| Kailash Parbat — 42 Imbia Road #01-01, Singapore 099701 | Missing | [Available](https://www.kailashparbat.com.sg/contact) | No | 2026-10-15 |
| Kailash Parbat — 93 Syed Alwi Road, Singapore 207669 | Missing | [Available](https://www.kailashparbat.com.sg/contact) | No | 2026-10-15 |
| Kale by Kang Su (The Adelphi) — 1 Coleman Street #02-20 The Adelphi, Singapore 179803 | Missing | Missing | No | 2026-10-16 |
| Kang Su Vegetarian — 14 Scotts Road #05-98 Far East Plaza, Singapore 228213 | Missing | Missing | No | 2026-10-15 |
| Ki Su Shoujin Omakase — 60 Tras Street #01-01, Singapore 078999 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhBzlZoHTe2-ny2ec4L2lElD!2e10!4m2!3m1!1s0x31da19b7ab67073b:0x26fee61d42092048) | [Available](https://www.kisu.com.sg/contact) | Yes | 2026-10-15 |
| Kind Kones — 583 Orchard Road #B1-27 & K1, Forum Shopping Mall, Singapore 238884 | Missing | Missing | No | 2026-10-16 |
| Kind Sprout SG — Singapore 793461 | Missing | Missing | No | 2026-10-16 |
| KMSPKS Dining Hall — 88 Bright Hill Road, Venerable Hong Choon Memorial Hall Level 2, Singapore 574117 | Missing | [Available](https://kmspks.org/services/vegetarian-food/) | No | 2026-10-16 |
| Kunthaville — 18 Veerasamy Road, Singapore 207326 | Missing | [Available](https://www.chope.co/singapore-restaurants/restaurant/kunthaville) | No | 2026-10-16 |
| Leaf Corner — 11 Irving Place #02-01, Singapore 369551 | [Available](https://leafcorner.sg/contactus) | Missing | No | 2026-10-15 |
| Leaf Corner — 5 Jalan Legundi, Sembawang Garden Arcade, Singapore 759269 | [Available](https://leafcorner.sg/contactus) | Missing | No | 2026-10-15 |
| Leaf Corner — 60 Jurong West Street 91 #01-09, Nanyang Community Club, Singapore 649040 | [Available](https://leafcorner.sg/contactus) | Missing | No | 2026-10-15 |
| Li Wei Vegetarian — 151 Serangoon North Avenue2 #01-41, Singapore550151 | Missing | Missing | No | 2026-10-16 |
| Lian Xin Vegetarian Restaurant — Basement, Buddha Tooth Relic Temple, 288 South Bridge Road, Singapore 058840 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIHM0ogKEICAgICZ6aOY3AE!2e10!4m2!3m1!1s0x31da1972ce2acdf9:0x42f841232447efb4) | [Available](https://www.buddhatoothrelictemple.org.sg/lianxin/contact) | Yes | 2026-10-15 |
| Lilac Oak — 71 Oxley Rise #01-01, Singapore 238698 | [Available](https://www.lilacoak.com/) | [Available](https://www.lilacoak.com/our-location) | Yes | 2026-10-15 |
| Lin Lin Vegetarian Delight — 412 Bedok North Avenue 2, inside SinFoodie Coffeeshop, Singapore 460412 | Missing | Missing | No | 2026-10-15 |
| LingZhi Greens — 390 Orchard Road, #B1-04/05, Palais Renaissance, Singapore 238871 | Missing | [Available](https://www.lingzhi.com.sg/en/home) | No | 2026-10-15 |
| Living Wholesome Vegetarian — 190 Middle Road #01-23, Fortune Centre, Singapore 188979 | Missing | [Available](https://livingwholesome.sg/) | No | 2026-10-15 |
| Living Wholesome Vegetarian — 2A Jalan Seh Chuan #01-060, Singapore 599213 | Missing | [Available](https://livingwholesome.sg/) | No | 2026-10-16 |
| Lotus Vegetarian — 201 Balestier Road, Level 2, Holiday Inn Express and Suites Singapore Novena, Singapore 329926 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhAIocnHh7m0wywml5aHuA7l!2e10!4m2!3m1!1s0x31da19f6d267b0c3:0x864f7b1e2a9985ed) | [Available](https://lotusvegetarian.oddle.me/en_SG/stores) | Yes | 2026-10-15 |
| Mani Iyer Vegetarian Cuisine — 215 Ang Mo Kio Avenue 1, Singapore 560215 | Missing | Missing | No | 2026-10-16 |
| Merle & Co — 1 Lentor Central #01-36, Lentor Modern Mall, Singapore 788887 | [Available](https://www.merleandco.com/) | [Available](https://tableagent.com/singapore/merle-co/) | Yes | 2026-10-15 |
| Metta Cafe — Simei — 32 Simei Street 1, Level 1 Metta Building, Singapore 529950 | Missing | [Available](https://www.metta.org.sg/youth-employment-support/#mettacafe) | No | 2026-10-15 |
| Mini Green Lok Lok — 210 Lorong 8 Toa Payoh, #01-74, Singapore 310210 | Missing | Missing | No | 2026-10-16 |
| MOD Cafe — 1A Kuo Chuan Avenue, Singapore 426888 | Missing | Missing | No | 2026-10-16 |
| Moon Chay Vegetarian — 190 Middle Road #02-27/28 Fortune Centre, Singapore 188979 | [Available](https://moonchayvegetarian.com/) | [Available](https://moonchayvegetarian.com/) | Yes | 2026-10-15 |
| Mother Earth Classic — 530 Balestier Road #01-06, 329857, Singapore | Missing | Missing | No | 2026-10-15 |
| Mother Earth Vegetarian Restaurant — 511 Upper Jurong Road #01-04, 638366, Singapore | Missing | Missing | No | 2026-10-15 |
| MTR Singapore — 438 & 438/A Serangoon Road, Singapore 218133 | [Available](https://www.mtrsingapore.com/) | [Available](https://www.mtrsingapore.com/) | Yes | 2026-10-15 |
| NALAN — 13 Stamford Road #B2-54 Capitol Singapore, Singapore 178905 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhDhAwhfDDnic6_bJfik_Qv7!2e10!4m2!3m1!1s0x1004040108a9d731:0x8906e349f60fe159) | [Available](https://www.nalan.com.sg/veg-restaurant-event-catering-singapore) | Yes | 2026-10-15 |
| NALAN — 82 Serangoon Road, Singapore 217987 | Missing | [Available](https://www.nalan.com.sg/veg-restaurant-event-catering-singapore) | No | 2026-10-15 |
| Nature Cafe — 321 Alexandra Road #02-27, Singapore 159971 | Missing | [Available](https://www.naturecafe.com.sg/menu/) | No | 2026-10-15 |
| Nature Cafe — SMU Li Ka Shing Library, 70 Stamford Road #01-22, Singapore 178901 | Missing | [Available](https://www.naturecafe.com.sg/menu/) | No | 2026-10-15 |
| Nature Vegetarian Delights — 171 Sengkang East Drive, #01-12 Rivervale Shores, Singapore 540171 | [Available](https://www.naturevegedelights.com.sg/our-restaurants/) | [Available](https://www.naturevegedelights.com.sg/contact-us/) | Yes | 2026-10-15 |
| Nature Vegetarian Delights — 296A Bukit Batok Street 22, #01-62, Skyline II @ Bukit Batok, Singapore 651296 | [Available](https://www.naturevegedelights.com.sg/our-restaurants/) | [Available](https://www.naturevegedelights.com.sg/contact-us/) | Yes | 2026-10-15 |
| New Fut Kai Vegetarian Restaurant — 282 Jalan Besar, #01-00, Singapore 208945 | Missing | [Available](https://www.newfutkai.com.sg/contact/) | No | 2026-10-15 |
| New Green Pasture Cafe — 190 Middle Road #04-22 Fortune Centre, Singapore 188979 | Missing | Missing | No | 2026-10-16 |
| nomVnom Bistro — 6 Eu Tong Sen Street #03-105/106/107, Clarke Quay Central, Singapore 059817 | [Available](https://www.nomvnom.com/gallery) | [Available](https://www.nomvnom.com/home) | Yes | 2026-10-15 |
| OMG! Decadent Donuts Singapore — 38 Margaret Drive #01-08 Margaret Market, Singapore 141038 | Missing | Missing | No | 2026-10-16 |
| Original Greens — 360 Balestier Road #04-07/K2 Shaw Plaza, Singapore 329783 | Missing | Missing | No | 2026-10-15 |
| Original Sin — 43 Jalan Merah Saga #01-62, Singapore278115 | [Available](https://www.originalsin.sg/menu) | Missing | No | 2026-10-16 |
| Peace Vegetarian — 18 Tai Seng Street #B1-02, Singapore 539775 | Missing | Missing | No | 2026-10-16 |
| Red Apple Vegetarian — 835 Tampines Street 83 #01-02, Singapore 520835 | Missing | Missing | No | 2026-10-16 |
| Ren Yi Vegetarian — Block 820 Tampines Street 81, Singapore 520820 | Missing | Missing | No | 2026-10-16 |
| Rya Bakehouse — 11 Cavan Road #01-03 Cavan Suites, Singapore 209848 | Missing | [Available](https://ryabakehouse.com/) | No | 2026-10-16 |
| Sangeetha Bhavan — 79 Rangoon Road, Singapore218366 | Missing | Missing | No | 2026-10-16 |
| Saute Saranghae — 10 Tampines Central 1, #05-08/09 Tampines 1, Singapore 529536 | Missing | [Available](https://www.saute.com.sg/saute-saranghae-menu) | No | 2026-10-15 |
| Saute Sushi — 60 Paya Lebar Road, #B1-19 Paya Lebar Square, Singapore 409051 | Missing | [Available](https://www.saute.com.sg/saute-sushi-menu) | No | 2026-10-15 |
| Saute-san — 180 Kitchener Road, #03-23/24 City Square Mall, Singapore 208539 | Missing | [Available](https://www.saute.com.sg/saute-san-menu) | No | 2026-10-15 |
| SHU Vegetarian — 259 Jalan Kayu, Singapore 799488 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian — 354A Woodlands Avenue 1 #01-01, Singapore 731354 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Ang Mo Kio Avenue 10) — 554 Ang Mo Kio Ave 10, #01-2040 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Chang Cheng HQ) — 27 Woodlands Link #01-01, Chang Cheng HQ (Chang Cheng Mee Wah Coffeeshop), Singapore 738732 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Clementi West Street 2) — 722 Clementi West Street 2 #01-150 (Wan Fu Eating House), Singapore 120722 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Jurong West Street 41) — 498 Jurong West Street 41 #01-462, Singapore 640498 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Loyang Point) — 259 Pasir Ris Street 21 #02-30, Loyang Point, Singapore 510259 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Margaret Drive) — 40 Margaret Drive #01-05, Singapore 140040 | Missing | Missing | No | 2026-10-15 |
| SHU Vegetarian 蔬方斋 (Yishun Ring Road) — 239 Yishun Ring Road #01-1150, Singapore 760239 | Missing | Missing | No | 2026-10-15 |
| Slow Bakes — 30A Yishun Central 1, Tzu Chi Humanistic Youth Centre, Singapore 768796 | Missing | [Available](https://hyc.tzuchi.org.sg/spaces/dining/) | No | 2026-10-16 |
| So Green Vegetarian — 445 Bedok North Street1 #01-02, Djitsun Mall, Singapore469661 | Missing | Missing | No | 2026-10-16 |
| Sproutz Downtown — 15 Central Boulevard #B1-05 Downtown MRT Station, Singapore 018969 | [Available](https://www.sproutzdowntown.com/) | [Available](https://www.sproutzdowntown.com/) | Yes | 2026-10-15 |
| Su Xiang Vegetarian — 18 Raffles Quay, Lau Pa Sat Stall 46, Singapore 048582 | Missing | Missing | No | 2026-10-16 |
| Sufood (Raffles City) — 252 North Bridge Road, #02-19 to 21 Raffles City Shopping Centre, Singapore 179103 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIHM0ogKEICAgIC2wezFSw!2e10!4m2!3m1!1s0x31da19a42f64bf17:0x296d842cd889864c) | Missing | No | 2026-10-15 |
| Supreme Vege — 12 Queen Street, Hotel Royal @ Queens #02-03, Singapore 188553 | [Available](https://www.supremevege.sg/) | Missing | No | 2026-10-15 |
| Suyuan Vegetarian — 208B New Upper Changi Road #01-07, Singapore462208 | Missing | Missing | No | 2026-10-16 |
| Swaad — 3 Shenton Way #01-04 Shenton House, Singapore 068805 | Missing | [Available](https://swaadgovinda.com/locations) | No | 2026-10-16 |
| Swaad — 70 Desker Road, Singapore 209593 | Missing | [Available](https://swaadgovinda.com/locations) | No | 2026-10-15 |
| Teenoy Thai Vegetarian — 932 Hougang Avenue 9 #01-04, Singapore 530932 | Missing | Missing | No | 2026-10-16 |
| Teng Bespoke Vegetarian Japanese Dining — 91 Bencoolen Street #01-50, Sunshine Plaza, Singapore 189652 | Missing | Missing | No | 2026-10-15 |
| The Boneless Kitchen — 1 Irving Place, #01-31, The Commerze @ Irving, Singapore 369546 | [Available](https://thebonelesskitchen.com/) | [Available](https://tableagent.com/singapore/the-boneless-kitchen-korean/) | Yes | 2026-10-15 |
| The Crowded Bowl — 500 Dover Road, Singapore Polytechnic Food Court 2, Stall 13, Singapore 139651 | Missing | Missing | No | 2026-10-16 |
| The Crowded Bowl - NTU North Spine — 76 Nanyang Drive, North Spine Plaza NS3-1-18, Singapore 637331 | Missing | Missing | No | 2026-10-16 |
| Tian Yuan Healthy Vegetarian Food Paradise — 190 Middle Road #01-16, Fortune Centre, Singapore 188979 | Missing | Missing | No | 2026-10-16 |
| TianMu Vegetarian — 504 West Coast Drive #01-230, Singapore 120504 | Missing | [Available](https://www.blockchef.com/store/tianmuvegetarian/about) | No | 2026-10-16 |
| Time’s Vege — 643 Bukit Batok Central #01-44, Singapore 650643 | Missing | Missing | No | 2026-10-15 |
| Tofu G — 3 Temasek Boulevard #B1-K5, West Wing, Suntec City Mall, Singapore 038983 | [Available](https://www.tofug.sg/suntec) | [Available](https://www.tofug.sg/suntec) | Yes | 2026-10-16 |
| Tofu G — 333A Orchard Road #02-26, Mandarin Gallery, Singapore 238897 | [Available](https://www.tofug.sg/mandaringallery) | [Available](https://www.tofug.sg/mandaringallery) | Yes | 2026-10-16 |
| Tofu G — 391 Orchard Road #B1-29, Ngee Ann City, Singapore 238873 | [Available](https://www.tofug.sg/takashimaya) | [Available](https://www.tofug.sg/takashimaya) | Yes | 2026-10-16 |
| Tofu G — 81 Clemenceau Avenue #01-19, Singapore 239917 | [Available](https://www.tofug.sg/uesquare) | [Available](https://www.tofug.sg/uesquare) | Yes | 2026-10-16 |
| Tofu G — 83 Punggol Central #01-53, Singapore 828761 | [Available](https://www.tofug.sg/waterwaypoint) | [Available](https://www.tofug.sg/waterwaypoint) | Yes | 2026-10-16 |
| Tofu G — 97 Amoy Street, Singapore 069916 | [Available](https://www.tofug.sg/97amoy) | [Available](https://www.tofug.sg/97amoy) | Yes | 2026-10-16 |
| TPY 203 Vegetarian food — 203 Toa Payoh North, Singapore 310203 | Missing | Missing | No | 2026-10-16 |
| Tracy Juice Culture — 190 Middle Road #01-34 Fortune Centre, Singapore 188979 | Missing | Missing | No | 2026-10-16 |
| True Veggie — 47 Lorong 27 Geylang, Singapore 388179 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIHM0ogKEICAgICl_57Y3wE!2e10!4m2!3m1!1s0x31da1930c3cdf025:0xadfef846757c6f4e) | Missing | No | 2026-10-15 |
| Veg-An — 11 Sam Leong Road, Trio Mall, #04-03, Singapore 207903 | Missing | [Available](https://www.veggie-an.com/) | No | 2026-10-15 |
| VeganBurg — 44 Jalan Eunos, Singapore 419502 | Missing | [Available](https://www.veganburg.com/location) | No | 2026-10-15 |
| Vege Bear Vegetarian — 212 Bidadari Park Drive #03-01, Singapore 360212 | Missing | Missing | No | 2026-10-16 |
| Vegetarian Express Cafe — 205 Hougang Street 21, #02-22, Singapore 530205 | Missing | Missing | No | 2026-10-16 |
| Vegetarian Kitchen by Daily Green — 306 Woodlands Street 31, Singapore 730306 | Missing | [Available](https://www.dailygreen.sg/locations) | No | 2026-10-15 |
| Verimix Vegetarian - Le Quest Mall — 4 Bukit Batok Street 41 #01-17 Le Quest Mall, Singapore 657991 | Missing | Missing | No | 2026-10-16 |
| Wakamama — 218 Pasir Panjang Road #02-15, ICON @ Pasir Panjang, Singapore 118579 | Missing | [Available](https://www.wakamama.sg/) | No | 2026-10-16 |
| Warung Ijo — 601 MacPherson Road #01-61 Grantral Mall Taiseng, Singapore 368242 | Missing | Missing | No | 2026-10-15 |
| Whole Earth — 76 Peck Seah Street, Singapore 079331 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhBBxNmlIpDvkHsIQdTNwZIE!2e10!4m2!3m1!1s0x31da196cd5155cd3:0x5134d6faf83c4f4a) | [Available](https://wholeearth.com.sg/) | Yes | 2026-10-15 |
| Xi Shi Fu Vegetarian — 115 Bukit Merah View #01-25, Singapore 151115 | Missing | Missing | No | 2026-10-16 |
| Xiang Yuan Vegetarian Food - Circuit Road — 80 Circuit Road #02-03, Singapore 370080 | Missing | Missing | No | 2026-10-16 |
| Xie Bi An Vegetarian 谢必安素食 — 824 Tampines Street 81, #01-38, BK Coffeeshop, Singapore 520824 | Missing | Missing | No | 2026-10-16 |
| Xin Yi Vegetarian — 442 Jurong West Avenue1 #01-758, Singapore640442 | Missing | Missing | No | 2026-10-16 |
| Xing Hua Vegetarian — 190 Middle Road #01-11, Fortune Centre, Singapore188979 | Missing | Missing | No | 2026-10-16 |
| Xing Hua Vegetarian Restaurant — 111 Somerset Road #01-K3 to K4, Singapore 238164 | Missing | Missing | No | 2026-10-16 |
| Yes Natural Bakery — 55 Lorong 27 Geylang, Singapore 388183 | Missing | [Available](https://yesnatural.sg/contact-us) | No | 2026-10-16 |
| Yes Natural Restaurant — 57 Lorong 27 Geylang, Singapore 388184 | Missing | [Available](https://yesnatural.sg/contact-us) | No | 2026-10-15 |
| Yi Ding Xuan Vegetarian — 201 Tampines Street 21 #01-201, Singapore 520201 | Missing | Missing | No | 2026-10-16 |
| Zen Cafe — 88 Bright Hill Road, Venerable Hong Choon Memorial Hall Level 1 beside Ju Yuan Fang, Singapore 574117 | Missing | [Available](https://kmspks.org/services/vegetarian-food/) | No | 2026-10-16 |
| Zhen Xiang Vegetarian — 325 Woodlands Street 32 #01-131, Singapore 730325 | [Available](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIHM0ogKEICAgIDXqq24qQE!2e10!4m2!3m1!1s0x31da13adecf92a65:0x18b5a46fffb3f1f6) | Missing | No | 2026-10-15 |
| Zhen Yi Vegetarian — 128 Ang Mo Kio Ave 3 #01-1853, Singapore 560128 | Missing | Missing | No | 2026-10-15 |
| Zi Zai Vegetarian (Bendemeer) — 23 Bendemeer Road #01-523, Bendemeer Ville, Singapore 330023 | Missing | Missing | No | 2026-10-15 |
| Zi Zai Vegetarian (Jalan Mas Puteh) — 9 Jalan Mas Puteh, Singapore 128615 | Missing | Missing | No | 2026-10-15 |
| Zi Zai Vegetarian (Tampines) — 801 Tampines Ave 4 #01-281, Tampines Polyview, Singapore 520801 | Missing | Missing | No | 2026-10-15 |
| Zi Zai Vegetarian (Yishun) — Blk 236 Yishun Ring Road #01-1000, Singapore 760236 | Missing | Missing | No | 2026-10-15 |
