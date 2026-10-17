# Recipe browse/category taxonomy for a Singapore plant-based home-cooking app

Research date: 17 October 2026. All "fetched" pages were retrieved on that date unless stated otherwise. **Access limits:** BBC Good Food, Allrecipes and NYT Cooking block this agent's crawler, so their live navigation could not be read directly. Kitchen Stories' web page returned HTTP 410. Samsung Food, Rasa Malaysia and Eat Your Books returned HTTP 403. For these sites, only App Store copy or secondary sources were available, and those findings are labelled as such.

## 1. What top-level categories and facets do leading recipe apps/sites expose?

### Takeaway
No two leaders use the same top-level axis:
- **Western mass-market sites (Tasty)** mix meal type, diet, ingredient and editorial "moment" collections.
- **The plant-based leader (Forks Over Knives)** browses almost entirely by **dish type**: Breakfasts, Pasta & Noodles, Soups & Stews, Desserts and so on.
- **East Asian leaders (Xiachufang, DELISH KITCHEN, Kurashiru)** browse by **dish form** (rice dishes, noodles, soups) and **ingredient**, and build a meal from main dish + side dish + soup. Cuisine, time and diet usually appear as secondary filters, not top-level browse.

### Cited Findings
- **Tasty (web nav, fetched).** The Recipes menu has five groups:
  - **Popular:** "Weeknight Dinners", "Work Lunches", "5 Ingredient Meals", "Holiday Cooking", "Global Taco Remix"
  - **Right Now:** "Breakfasts to Delight", "Family Dinners", "Plant-Based Meals", "Date Night"
  - **Ingredients:** Chicken, Pasta, Salmon, Potato, Beef
  - **Diet:** Healthy, Vegetarian, Low Carb, High Protein, Vegan
  - **Meals:** Breakfast, Lunch, Dinner, Desserts, Snacks

  A separate "Appliance Cooking" group lists Instant Pot, Air Fryer and Microwave, and a "Meal Plans" group lists Easy Meal Prep and "$40 A Week" — [tasty.co](https://tasty.co/)
- **Forks Over Knives (plant-based; web nav, fetched).** The Recipes menu is dish-type only: "Menus & Collections", "Amazing Grains", "Baked & Stuffed", "Breakfasts", "Burgers & Wraps", "Desserts", "Pasta & Noodles", "Salads & Sides", "Sauces & Condiments", "Snacks & Appetizers", "Soups & Stews" and "Forks Flex Recipes". The page has no cuisine, occasion or time filters — [forksoverknives.com/recipes](https://www.forksoverknives.com/recipes/)
- **Xiachufang 下厨房 (/category/, fetched).** Nine groups, mostly by ingredient:
  - 热门专题 (popular topics): 特色食品 (speciality foods), 特殊场合 (special occasions), 菜式 (dish styles), 功效 (health benefits), 人群 (who it's for)
  - 烘焙甜品饮料: baking, desserts, drinks
  - **汤粥主食** (soups, congee, staples): 汤羹, 饭, 饼, 粥, 饺子, 馒头, 三明治, 馄饨, 包子, 汤, 面条
  - 口味特色: 烹调方法 (cooking method), 口味 (flavour), 器具 (equipment), 异国风味 (foreign cuisines). Cuisine sits here as a sub-facet, not at top level.
  - 蛋奶豆制品: 蛋类 (eggs), 奶制品 (dairy), 豆制品 (soy products)
  - Further ingredient groups for meat, vegetables and fruit, and seafood

  Source: [xiachufang.com/category](https://www.xiachufang.com/category/)
- **Xiachufang+ mini-program.** A review describes its "菜谱分类" (recipe categories) as 热门分类 (popular), 菜式 (dish style) and 场景 (scenario) — [ifanr](https://www.ifanr.com/minapp/779781)
- **DELISH KITCHEN (/categories, fetched).** Three groups:
  - **材料一覧 (by ingredient):** meat, vegetable, seafood and other おかず (dishes)
  - **料理一覧 (by dish), 23 types**, including お菓子 (sweets), 汁物・シチュー (soups and stews), 卵料理 (egg dishes), ごはんもの (rice dishes), サラダ (salads), 麺類 (noodles), 野菜料理 (vegetable dishes), 鍋料理 (hot pots), 豆腐料理 (tofu dishes), 飲み物 (drinks), 点心 (dim sum), 漬物 (pickles), 粉物 (batter/flour dishes), 調味料 (seasonings) and 中華料理 (Chinese)
  - **シーン・目的別 (by scene/purpose):** 簡単おうちごはん (easy home meals), お弁当のおかず (lunch-box dishes), 料理の基本 (cooking basics), 献立 (meal plans)

  Source: [delishkitchen.tv/categories](https://delishkitchen.tv/categories)
- **Kurashiru (App Store JP, v16.138.0, October 2026).** Users build breakfast/lunch/dinner menus by tapping 「主菜・副菜・汁物」 (main dish, side dish, soup). Cuisine is a filter: 和食・洋食・中華・韓国・エスニック (Japanese, Western, Chinese, Korean, ethnic). There are 10-minute 時短 (time-saving) recipes, and search by 食材 (ingredient) or 料理名 (dish name) — [App Store JP](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258)
- **Kurashiru (web).** Search entry points are 食材から探す (by ingredient), 料理名から探す (by dish name) and 目的・シーンから探す (by purpose/scene) — [kurashiru.com](https://www.kurashiru.com/categories)
- **Cookpad UK (fetched).**
  - Search-first, with no category list.
  - Shows trending keyword links ("healthy breakfast", "japanese", "slow cooker", "chocolate cake"…).
  - Premium lists: "Top Cooksnapped Recipes" and "Top Viewed Recipes".

  Source: [cookpad.com/uk](https://cookpad.com/uk)
- **Samsung Food (App Store copy only).** Search by ingredient, or narrow by "meal type, cook time, cuisine, or 14 different diets" — [App Store](https://apps.apple.com/us/app/-/id1133637674)
- **NYT Cooking (App Store copy only; site blocks this crawler).** Search 20,000+ recipes "by diet, cuisine, meal type and more", plus editor-curated collections — [App Store](https://apps.apple.com/au/app/nyt-cooking-quick-tasty-meals/id911422904). A low-authority review site gives example filters (main course, weekday meal, vegetarian/gluten-free/vegan); these are unverified — [appshunter](https://appshunter.io/editorials/1583856686)
- **Kitchen Stories (App Store copy, November 2025).** Recipes "for any diet and occasion, from one-pot dinners and quick snacks to salads and desserts". Ingredient-based search and diet personalisation are premium — [appgoblin listing](https://appgoblin.info/apps/771068291). The web page returned HTTP 410 on 17 October 2026.
- **BBC Good Food (regional Middle East site only; UK site blocked).** Recipe menu headings are "Inspire me", "Dishes", "Cuisines", "Healthy", "Family & Kids" and "Occasions" — [bbcgoodfoodme.com](https://www.bbcgoodfoodme.com/special-guides/bbc-good-food-middle-east-christmas-collection-2016/)
- **Comparable UK retailer, Marks & Spencer.** Recipe facets are Cuisine, Dishes and drinks, Ingredient, Meal and Occasions — [marksandspencer.com](https://www.marksandspencer.com/c/food-and-wine/cooking/recipes/)

### Inferences
- The axes recur across leaders:
  - **Meal type:** Tasty, FairPrice, NYT
  - **Dish form:** Forks Over Knives, DELISH KITCHEN, Xiachufang, WoonHeng
  - **Ingredient:** all of them
  - **Diet:** Tasty, Samsung Food, NYT
  - **Cuisine:** usually a filter
  - **Time/effort:** Tasty, Kurashiru, FairPrice
  - **Occasion:** Tasty, BBC Good Food, FairPrice
- In an all-plant-based catalogue, diet stops being a useful top-level split, as Forks Over Knives shows. Dish form becomes the natural primary axis, and diet narrows to sub-facets (vegan vs vegetarian, allium-free, gluten-free).
- East Asian apps organise around **dish role in a meal** (main/side/soup) and **dish form** (rice, noodles, soup) more than Western "course" labels such as "Mains".

### Gaps
- Live BBC Good Food, Allrecipes and NYT Cooking navigation could not be read because those sites block this agent. Kitchen Stories' current category names are also unverified.
- No first-party help-centre documentation was found for NYT Cooking, Samsung Food or Kitchen Stories filter labels.

## 2. What do Singapore/Asian sources use?

### Takeaway
Singapore sources mix meal type, dish form, occasion and ingredient in one browse layer:
- FairPrice puts Breakfast, Lunch/Dinner, Soup, Snacks, Desserts and Drinks together under "Meals".
- Festival categories are common: CNY, Hari Raya, Deepavali and Christmas.
- Noodles, rice, soups, kueh/desserts and hawker dishes recur.

Cuisine or heritage labels (Nyonya, Eurasian, Chinese, Malay, Indian) appear as collections rather than a formal facet. The HPB/HealthHub library has no taxonomy at all. "Zi char" was not found as a category label in any source checked.

### Cited Findings
- **FairPrice recipes (web, fetched).** "Browse Recipes" groups:
  - **Quick Meals:** "Under 15 mins", "Under 30 mins", "One Pot Meal"
  - **Main Ingredient:** Chicken, Salmon, Beef, Pork, Vegetables, Seafood, Abalone, Rice
  - **Meals:** "Drinks", "Cocktails", "Breakfast", "Lunch/Dinner", "Soup", "Snacks", "Desserts"
  - **Occasions:** "Chinese New Year", "Thanksgiving", "National Day", "Christmas", "Hari Raya", "Deepavali", "Drinks Fiesta"
  - **Healthy Lifestyles:** "Immunity Booster"
  - **Celebrity Chefs**

  The page has no cuisine or diet facets — [fairprice.com.sg/recipes](https://www.fairprice.com.sg/recipes)
- **HealthHub Nutrition Hub (HPB).** The recipe library has only tabs ("All recipes", "Written", "Video") and a search box, with no meal, cuisine or diet facets. Example recipes include Laksa Fried Rice and Braised Chicken Bee Hoon — [healthhub.sg](https://www.healthhub.sg/programmes/nutrition-hub/healthy-recipes)
- **NHG Health cookbook *I can't believe it tastes so good!*** Per a search summary, it includes sections titled Breakfast, Snacks and Desserts, with 100 recipes "inspired by Chinese, Malay, Indian, Western and other cuisines" — [nhghealth.com.sg PDF](https://www.nhghealth.com.sg/media/public/content/e2bcf8af4f194aef9d659a978f6f0d63). It is unconfirmed which of the two NHG PDFs carries this.
- **Noob Cook (Singapore home-cooking blog, fetched).** Sidebar sections are "Chinese Recipes", "Japanese Cooking", "Lunch Box Ideas", "How-To", "Ingredients" and "Drinks", plus "Search by Ingredient". The /recipe-index/ and /recipes/ pages return 404 — [noobcook.com](https://www.noobcook.com/)
- **Singaporean Malaysian Recipes (fetched).**
  - Top navigation includes "Desserts and Drinks" and "Festive Recipes".
  - The festive submenu lists Deepavali, Christmas, Chinese New Year, Ramadan, Eid and Easter.
  - Homepage collections include "Top Eurasian", "Top Nyonya", "Top Noodle" and "Top Hawker Centre" recipes.

  Source: [singaporeanmalaysianrecipes.com](https://www.singaporeanmalaysianrecipes.com/)
- **WoonHeng (Malaysian-born vegan creator, fetched).**
  - Recipes menu: "Curry", "Dumplings", "Noodles", "Rice", "Stir Fry", "Appetizers", "Tofu", "Gluten-Free".
  - The category selector adds "Sauces", "Savory", "Sichuan" and "Sweets".
  - There is no breakfast or festive category.

  Source: [woonheng.com/recipes](https://woonheng.com/recipes/)
- **WoonHeng's book *The Vegan Asian Kitchen*** includes plant-based Hainanese "chicken" rice and nasi lemak — [booksaboutfood.com](https://booksaboutfood.com/bookreview/the-vegan-asian-kitchen/)
- **Kueh as its own genre.** *The Way of Kueh* (Christopher Tan, Epigram Books, 2025) covers "kueh families and genres" with 100+ recipes — [Seabreeze Books](https://www.seabreezebooks.com.sg/products/the-way-of-kueh-savouring-saving-singapores-heritage-desserts)
- **Singapore Cooking** (Terry & Christopher Tan) spans fried rice, laksa, soups and kueh dadar. No chapter list was retrieved — [Eat Your Books](https://www.eatyourbooks.com/library/9198/singapore-cooking)
- **Vegetarian festival relevant to Singapore.** The Nine Emperor Gods Festival (lunar 9th month, days 1–9) is "the largest Chinese religious festival in Singapore". Temples may post a 斋戒 (zhaijie, abstinence) sign requiring a strict vegetarian diet. Traditional fare excludes the five pungent vegetables, 五辛 (wu xin: garlic, onions, leeks, chives, shallots) — [Culturepaedia, SCCC](https://culturepaedia.singaporeccc.org.sg/social-practices/the-nine-emperor-gods-festival-in-singapore/). The 2026 festival runs to 18 October (Malaysian report) — [The Star](https://www.thestar.com.my/news/nation/2026/10/11/meat-free-fare-at-festival-food-fair)
- **CNY vegetarian dishes.** Chap chye is a "must-have" for some Singapore families at Lunar New Year — [Language Council](https://languagecouncils.sg/mandarin/ch/learning-resources/singaporean-mandarin-database/terms/chap-chye). A first-day-of-CNY vegetarian lo han chai custom is described anecdotally — [singaporeanmalaysianrecipes.com](https://www.singaporeanmalaysianrecipes.com/lo-han-chai-buddhas-delight/)
- **Vegetarian hawker staples** include vegetarian chicken rice, thunder tea rice, chwee kueh and vegan laksa — [Time Out Singapore](https://www.timeout.com/singapore/restaurants/the-best-vegetarian-local-food-in-singapore); [Michelin Guide](https://guide.michelin.com/vn/en/article/travel/a-singapore-hawker-guide-for-vegetarians)

### Inferences
- Breakfast, Soup, Snacks, Desserts and Drinks as top-level SG labels have direct precedent in FairPrice's "Meals" group. Noodles and Rice have precedent in WoonHeng, Xiachufang and DELISH KITCHEN.
- For a vegetarian/vegan audience, festival occasions should include Nine Emperor Gods/9th-month and first-day-of-CNY vegetarian eating, beyond FairPrice's generic list. Mid-Autumn and Vesak are plausible additions but were not observed in the sources checked.
- "Hawker favourites at home" is a distinct, locally recognised collection: see Singaporean Malaysian Recipes' "Top Hawker Centre Recipes".

### Gaps
- FairPrice app (as opposed to web) categories were not inspected.
- No Singapore-based vegan recipe site with a category menu was found. The search returned restaurant guides instead.
- "Zi char" and "Mid-Autumn" categories were not found in any source checked.
- Malaysian/Singapore cookbook tables of contents (chapter names) could not be retrieved.

## 3. UX evidence: how many categories, time-of-day defaults, single-select chips vs multi-facet filters

### Takeaway
- **Count:** keep the visible primary set small and put the most-used first. Horizontal toolbars and carousels lose items beyond the first few screens: Baymard puts the toolbar limit at about 6–8 filter types, and NN/g found most people stop after 3–4 carousel pages.
- **Selection model:** let users pick several values within a filter, but tested filters, not navigation categories. Use one category level for navigation and multi-select filters inside the sheet.
- **Promotion:** surfacing the most important filters on the list page helps, especially on mobile.
- **Time-of-day defaults:** no user-study evidence was found. Treat them as a hypothesis, best expressed as a dismissible promoted row rather than an auto-selected chip.

### Cited Findings
- **Baymard: multi-select filters.**
  - 15% of benchmarked sites don't allow multiple values within a filter.
  - Test participants were "far less likely to use filters" when options were mutually exclusive.
  - Recommended logic: AND between filter types, OR within a type, shown as checkboxes.
  - Sound categorisation is a prerequisite for good filtering.

  Source: [Baymard](https://baymard.com/blog/allow-applying-of-multiple-filter-values)
- **Baymard: promoting filters.**
  - 61% of sites don't promote filters.
  - Most test participants' first action on a list was to look for filters.
  - Promoted filters save mobile users "one trip to the separate filtering interface".
  - Promoted filters must also stay in their original position.

  Source: [Baymard](https://baymard.com/blog/promoting-product-filters)
- **Baymard: horizontal filter toolbars.** They hide the options inside each filter type and are unsuitable for more than 6–8 filter types — [Baymard](https://baymard.com/blog/horizontal-filtering-sorting-design)
- **NN/g: mobile carousels.**
  - "Most people stop after viewing 3–4 different pages."
  - Make the last item reachable in 3–4 swipes.
  - Peeking or cut-off items are a strong "more" cue; dots are weak.
  - Put the most interesting items first.

  Source: [NN/g](https://www.nngroup.com/articles/mobile-carousels/)
- **NN/g: filters vs facets.** Faceted navigation needs metadata for every facet across current and future content, and more options add interaction cost. Filters help only if they match dimensions users care about; Food.com's format tabs are the counter-example — [NN/g](https://www.nngroup.com/articles/filters-vs-facets/)
- **Time-aware recommenders are evaluated mostly offline.**
  - SVM time-of-day model, 2024 — [IJEECS](https://ijeecs.iaescore.com/index.php/IJEECS/article/view/35618)
  - Allrecipes-based time-aware hybrid model — [Oulu repository](https://oulurepo.oulu.fi/handle/10024/31845)
- **Day of week matters.** A 2012 user study found temporal factors such as day of the week affect how users rate dinner recipe recommendations — [LIFESTYLE 2012](https://ceur-ws.org/Vol-891/LIFESTYLE2012_paper2.pdf)
- **Context is under-studied.** A review notes that which context variables matter most is still not understood — [Trattner & Elsweiler, arXiv](https://arxiv.org/pdf/1711.02760)
- **Practice examples of time-based browsing:**
  - Tasty runs an editorial "Right Now" group that includes "Breakfasts to Delight" — [tasty.co](https://tasty.co/)
  - Kurashiru frames menus by 朝昼晩 (breakfast/lunch/dinner) — [App Store JP](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258)
  - Cookpad's trending keywords include "healthy breakfast" — [cookpad.com/uk](https://cookpad.com/uk)

### Inferences
- **Visible chips.** About 6–8 primary chips plus "All" fits Baymard's 6–8 toolbar limit and NN/g's 3–4-swipe guidance at 375 pt width, if the chips are short words with a peeking final chip. Order the chips by expected use.
- **Single-select primary chips.** These are navigation ("what kind of dish"). Multi-select belongs in the Filters sheet (time, method, cuisine, occasion, diet sub-facets), following Baymard's OR-within/AND-between logic. A recipe can carry more than one category tag, so laksa appears under both Noodles and Soups. That avoids forcing artificial exclusivity.
- **Time of day.** Morning "Breakfast ideas" should be a promoted collection row or a reordering of the chips, never a silently pre-selected filter. It is unvalidated and should be A/B tested.

### Gaps
- No recipe-app-specific usability study was found on the optimal number of category chips or on time-of-day defaults. The evidence comes from e-commerce (Baymard) and general mobile research (NN/g).
- Baymard's overcategorisation article could not be retrieved (paywall shell).

## 4. How Asian (Singapore/Chinese) households structure meals, and what it implies

### Takeaway
Chinese home meals follow the **fan–cai** structure: a grain staple (rice, noodles, buns) plus shared dishes (vegetables, tofu, etc.) and often a soup ("三菜一汤", three dishes and a soup). Singapore's economy rice (rice + 2–4 dishes) mirrors this. One-dish meals, especially noodles and fried rice, are also common. Singaporeans now eat out about 9 times a week, so home cooking competes with hawker meals. Western "Mains/Sides" labels therefore fit poorly: users need "dishes to go with rice", "one-dish meals (rice/noodles)" and "soups".

### Cited Findings
- **K.C. Chang's fan–cai principle.** A normal Chinese meal is grains/starch (fan) plus vegetable and/or other dishes (cai) — [Wikipedia, History of Chinese cuisine](https://en.wikipedia.org/wiki/History_of_Chinese_cuisine). His essay "Food in Chinese Culture" places rice, breads, pancakes and noodles in fan — [Asia Society](https://asiasociety.org/node/1129)
- **Dishes exist to accompany rice.** Dunlop describes cai as "everything else" whose purpose is to accompany the staple grain: "xia fan", sending the rice down — [Asian Review of Books](https://asianreviewofbooks.com/invitation-to-a-banquet-the-story-of-chinese-food-by-fuchsia-dunlop/)
- **Economy rice in Singapore** evolved into steamed rice with two to four homestyle dishes chosen from a display — [Culturepaedia, SCCC](https://culturepaedia.singaporeccc.org.sg/popular-culture/singaporean-chinese-hawker-food-history-and-evolution/)
- **三菜一汤 / 四菜一汤** (three or four dishes and a soup) is a common home or set-dinner pattern (anecdotal and popular sources) — [Clément Renaud](https://clementrenaud.com/writings/2015/08/10/What-does-the-typical-meal-in-China-consist-of/); [Toutiao](https://www.toutiao.com/zixun/7534154366522132514)
- **Shared-table anecdote.** Each person has a rice bowl, with 3–4 shared dishes plus a hot soup — [AAPI discussion, Academy of Nutrition and Dietetics community](https://community.eatrightpro.org/aapi/members-only/aapi-discussion/style-eating-habits-discussion)
- **Japanese parallel.** The Japanese 一汁三菜 (one soup, three dishes) is rice + soup + main + 2 sides — [nippon.com](https://www.nippon.com/cn/guide-to-japan/gu020011/). Kurashiru's menu builder uses 主菜・副菜・汁物 (main, side, soup) — [App Store JP](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258)
- **Singapore eating out (NNS 2025, released 3 October 2026).** "7 in 10 residents ate out once a day (up from 6 in 10 in 2019)". Residents ate out 9 times a week, up from 8 — [MOH](https://www.moh.gov.sg/newsroom/national-health-surveys-show-singaporeans-are-embracing-healthier-lifestyles--with-a-need-to-improve-our-diet-quality-/)
- **Festive banquets vs everyday meals.** Shared dishes are framed as communal mainly at festive banquets; everyday meals are less formal — [Olivová 2021, Masaryk Univ.](https://muni.cz/en/research/publications/1812741)

### Inferences
- **Dish role over Western course.** The primary taxonomy should reflect dish role in an Asian meal:
  - staple/one-dish (rice meals, noodles)
  - dishes eaten with rice (stir-fries, braises, curries, tofu, greens)
  - soups
  - snacks/kueh, desserts/tong sui, drinks
- **Breakfast deserves a chip.** It is a culturally distinct SG set (kaya toast, congee/porridge, chwee kueh, prata-style items). FairPrice and the NHG cookbook both isolate it.
- **Plan for weeknight dinners and weekends.** Heavy weekday eating out suggests home cooking concentrates in weeknight dinners and weekends. This supports time and one-pot filters, and a "build a meal (rice + dish + soup)" collection later. This is an inference; no SG home-cooking timing data was found.

### Gaps
- No Singapore-specific study was found documenting home-meal composition (e.g. share of rice+dishes vs one-dish meals) or which meals are cooked at home. The NIE thesis on Singaporean Chinese family mealtimes focuses on conversation, not dish structure — [NIE repository](https://repository.nie.edu.sg/handle/10497/18557?mode=full).
- Malay and Indian Singaporean home-meal structures were not researched; their rice-plus-lauk and rice-plus-curries patterns are assumed similar but unverified.

## 5. Recommended taxonomy: 6–9 primary chips plus secondary facets

### Takeaway
Use **one single-select row of 8 chips: "All" plus 7 dish-role categories.** Order: All · Breakfast · Noodles · Rice meals · With rice · Soups · Snacks & kueh · Desserts & drinks.

Put **multi-select facets** in Filters:
- Time
- Method/effort
- Cuisine/heritage
- Occasion/festival
- Diet sub-facets: Vegan, Allium-free / no wu xin, Egg-free, Gluten-free
- Main ingredient

Tag recipes with one or more categories. Treat time-of-day as a promoted row, not a default filter.

### Cited Findings
Precedents for each recommended element:

**Primary chips**

| Chip | Precedent | Sources |
|---|---|---|
| Breakfast | FairPrice "Breakfast"; Tasty "Breakfast"; NHG cookbook Breakfast section | [FairPrice](https://www.fairprice.com.sg/recipes); [Tasty](https://tasty.co/); [NHG](https://www.nhghealth.com.sg/media/public/content/e2bcf8af4f194aef9d659a978f6f0d63) |
| Noodles | WoonHeng "Noodles"; DELISH KITCHEN 麺類; Xiachufang 面条; Forks Over Knives "Pasta & Noodles"; Singaporean Malaysian Recipes "Top Noodle Recipes" | [WoonHeng](https://woonheng.com/recipes/); [DELISH KITCHEN](https://delishkitchen.tv/categories); [Xiachufang](https://www.xiachufang.com/category/); [FOK](https://www.forksoverknives.com/recipes/); [SMR](https://www.singaporeanmalaysianrecipes.com/) |
| Rice meals (fried rice, nasi lemak, thunder tea rice, chicken-rice style) | WoonHeng "Rice"; DELISH KITCHEN ごはんもの; Xiachufang 饭/粥; FairPrice "Rice" | [WoonHeng](https://woonheng.com/recipes/); [DELISH KITCHEN](https://delishkitchen.tv/categories); [Xiachufang](https://www.xiachufang.com/category/); [FairPrice](https://www.fairprice.com.sg/recipes) |
| With rice (dishes: stir-fries, braises, curries, tofu, greens) | Fan–cai principle; economy rice; Kurashiru 主菜/副菜; WoonHeng "Stir Fry", "Curry", "Tofu" | [Wikipedia](https://en.wikipedia.org/wiki/History_of_Chinese_cuisine); [SCCC](https://culturepaedia.singaporeccc.org.sg/popular-culture/singaporean-chinese-hawker-food-history-and-evolution/); [Kurashiru](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258); [WoonHeng](https://woonheng.com/recipes/) |
| Soups | FairPrice "Soup"; DELISH KITCHEN 汁物・シチュー; Xiachufang 汤/汤羹; FOK "Soups & Stews" | [FairPrice](https://www.fairprice.com.sg/recipes); [DELISH KITCHEN](https://delishkitchen.tv/categories); [Xiachufang](https://www.xiachufang.com/category/); [FOK](https://www.forksoverknives.com/recipes/) |
| Snacks & kueh (savoury kueh, dumplings, appetisers) | FairPrice/Tasty "Snacks"; FOK "Snacks & Appetizers"; WoonHeng "Dumplings"/"Appetizers"; *The Way of Kueh* | [FairPrice](https://www.fairprice.com.sg/recipes); [Tasty](https://tasty.co/); [FOK](https://www.forksoverknives.com/recipes/); [WoonHeng](https://woonheng.com/recipes/); [Seabreeze](https://www.seabreezebooks.com.sg/products/the-way-of-kueh-savouring-saving-singapores-heritage-desserts) |
| Desserts & drinks (tong sui, sweet kueh, drinks) | FairPrice "Desserts"/"Drinks"; Singaporean Malaysian Recipes "Desserts and Drinks"; Xiachufang 烘焙甜品饮料 (baking, desserts, drinks) | [FairPrice](https://www.fairprice.com.sg/recipes); [SMR](https://www.singaporeanmalaysianrecipes.com/); [Xiachufang](https://www.xiachufang.com/category/) |

**Secondary facets**

| Facet | Precedent | Sources |
|---|---|---|
| Time: ≤15 / ≤30 / ≤60 min | FairPrice "Under 15 mins"/"Under 30 mins"; Kurashiru 10分以内 | [FairPrice](https://www.fairprice.com.sg/recipes); [Kurashiru](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258) |
| Method/effort: One-pot, Air fryer, Rice cooker, No-cook, 5 ingredients | FairPrice "One Pot Meal"; Tasty "Appliance Cooking" and "5 Ingredient Meals"; Xiachufang 器具 (equipment) | [FairPrice](https://www.fairprice.com.sg/recipes); [Tasty](https://tasty.co/); [Xiachufang](https://www.xiachufang.com/category/) |
| Cuisine/heritage: Chinese, Malay, Indian, Peranakan, Eurasian, Japanese/Korean, Thai, Western | NHG cookbook; Singaporean Malaysian Recipes (Nyonya, Eurasian); Kurashiru genre filter | [NHG](https://www.nhghealth.com.sg/media/public/content/e2bcf8af4f194aef9d659a978f6f0d63); [SMR](https://www.singaporeanmalaysianrecipes.com/); [Kurashiru](https://apps.apple.com/jp/app/%E3%82%AF%E3%83%A9%E3%82%B7%E3%83%AB-%E6%AF%8E%E6%97%A5%E3%81%AE%E7%8C%AE%E7%AB%8B%E3%81%AB-%E3%83%AC%E3%82%B7%E3%83%94%E5%8B%95%E7%94%BB%E3%81%A7%E6%96%99%E7%90%86%E3%81%8C%E3%81%8A%E3%81%84%E3%81%97%E3%81%8F%E4%BD%9C%E3%82%8C%E3%82%8B/id1059134258) |
| Occasion/festival: CNY, Hari Raya, Deepavali, Christmas, National Day, Nine Emperor Gods/9th month, Lunch box | FairPrice "Occasions"; Singaporean Malaysian Recipes "Festive Recipes"; Nine Emperor Gods vegetarian practice; Noob Cook "Lunch Box Ideas"; DELISH KITCHEN お弁当のおかず (lunch-box dishes) | [FairPrice](https://www.fairprice.com.sg/recipes); [SMR](https://www.singaporeanmalaysianrecipes.com/); [SCCC](https://culturepaedia.singaporeccc.org.sg/social-practices/the-nine-emperor-gods-festival-in-singapore/); [Noob Cook](https://www.noobcook.com/); [DELISH KITCHEN](https://delishkitchen.tv/categories) |
| Diet sub-facets: Vegan only, Allium-free / no wu xin, Egg-free, Gluten-free | Wu xin exclusion; WoonHeng "Gluten-Free"; Samsung Food's 14 diets | [SCCC](https://culturepaedia.singaporeccc.org.sg/social-practices/the-nine-emperor-gods-festival-in-singapore/); [WoonHeng](https://woonheng.com/recipes/); [Samsung Food](https://apps.apple.com/us/app/-/id1133637674) |
| Main ingredient: Tofu & soy, Mushrooms, Eggs, Greens, Tempeh | FairPrice "Main Ingredient"; Xiachufang 蛋奶豆制品 (eggs, dairy, soy); DELISH KITCHEN 豆腐料理 (tofu dishes); WoonHeng "Tofu" | [FairPrice](https://www.fairprice.com.sg/recipes); [Xiachufang](https://www.xiachufang.com/category/); [DELISH KITCHEN](https://delishkitchen.tv/categories); [WoonHeng](https://woonheng.com/recipes/) |

**Collections (editorial rows, not chips)**
- "Hawker favourites at home" — [SMR "Top Hawker Centre Recipes"](https://www.singaporeanmalaysianrecipes.com/)
- Time-based "Right now" row, e.g. breakfast in the morning — [Tasty "Right Now"](https://tasty.co/)
- "Weeknight dinners" — [Tasty](https://tasty.co/)

**Selection model**
- Single-select primary chips; multi-select facets with OR within a type and AND across types — [Baymard](https://baymard.com/blog/allow-applying-of-multiple-filter-values)
- Promote 1–2 high-use facets, such as "≤30 min" and "One-pot", next to the Filters button — [Baymard](https://baymard.com/blog/promoting-product-filters)

### Inferences
**Why this set**

| Option | Assessment |
|---|---|
| **Recommended set** | Matches the fan–cai meal logic. Covers every recurring SG label (Breakfast, Noodles, Rice, Soup, Snacks, Desserts, Drinks). Stays at 7 categories + All, within the 6–8 toolbar guidance. |
| "Mains" | A Western course label that does not map to rice-plus-dishes eating. Replacing it with "With rice" (alt labels: "Dishes", "Lauk & sides") needs copy testing. |
| Lunch/Dinner as chips | Not recommended. FairPrice merges them ("Lunch/Dinner"), and in SG home cooking the same dishes serve both. |
| Cuisine, time and occasion as chips | Rejected. They cut across every dish role, and Baymard notes multi-value needs within those types, so they belong in Filters. |

**Multi-tag rule.** A recipe may carry up to two categories, e.g. laksa = Noodles + Soups and nasi lemak = Rice meals + Breakfast. Chip counts and empty states should be computed after tagging.

**Festival facet.** Show festival values seasonally in Filters or as a temporary collection row: CNY in Jan–Feb, Hari Raya by the lunar calendar, Deepavali in Oct–Nov, Nine Emperor Gods in the 9th lunar month. Keep them out of the permanent chip row.

**Allium-free.** For this audience, allium-free / no wu xin is a culturally specific diet value with real demand (Nine Emperor Gods; Buddhist practice). It should be a first-class diet facet. The app already uses "Allium-free" in Explore.

**Local schema note.** In the current app, `src/data/recipes.ts` stores mixed values in one `cuisine` field: "Bowls" (dish type), "Local" (heritage) and "Asian" (cuisine) (`C:\Users\huien\QT\quintaste\src\data\recipes.ts`, lines 7, 31, 55). Adopting this taxonomy implies splitting it into:
- `categories` (dish role, 1–2 values)
- `cuisine`
- `occasions`
- `methods`
- `minutes` (existing)

**If 8 chips is too many at 320 pt:** merge "Snacks & kueh" and "Desserts & drinks" into "Kueh, snacks & sweets", or move Drinks into Filters, giving 6 + All.

### Gaps
- No direct user research on SG users' mental model for "With rice" vs "Dishes" vs "Mains". This needs a card sort or first-click test.
- No evidence on whether time-of-day chip reordering improves engagement; it should be A/B tested.
- The Mid-Autumn, Vesak and first-day-CNY-vegetarian occasions are culturally plausible but had no recipe-site category precedent in the sources checked.
