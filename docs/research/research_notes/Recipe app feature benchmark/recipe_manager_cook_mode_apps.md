# Recipe-manager, recipe-organizer and cook-mode utility apps: feature benchmark (state as of 17 October 2026)

Notes on dates. Apple App Store version histories often show "Mon DD" with no year for the current year. Where I give a 2026 date for such an entry, I inferred the year from its position after a dated 2025 entry in the same history. Relative stamps such as "1d ago" were converted using the fetch date of 17 Oct 2026, so they are approximate. Several comparison articles were written by competing vendors (Swoodie, Honeydew, RecipeSage, ReciMe, Deglaze, Plan to Eat). Their claims are labelled as vendor claims.

## 1. Which apps are active, changing or discontinued (status, platforms, sync, pricing)?

### Takeaway
Most of the field shipped updates between Sept and Oct 2026. There are four status flags. **Mealime shuts down on 21 Oct 2026** and deletes all user data. **Paprika 4 is in open beta** (from 28 Sep 2026) and premium features will move to a subscription. **Mela has not updated since June 2025.** Cooklist's consumer app looks stagnant while the company repositions toward B2B "agentic commerce". Pricing in the category is moving from one-time purchases to subscriptions. Paprika, Mela, Recipe Keeper and Copy Me That (lifetime) are the remaining one-time or lifetime options.

### Cited Findings

**Status flags**
- **Mealime (DISCONTINUING).** The site banner reads "Mealime will shut down on October 21, 2026." — [Mealime](https://www.mealime.com/)
  - The closing page says Mealime "was acquired by Albertsons Companies in 2021". It also says "All personal data will be deleted when the Mealime application is shut down." No data export is mentioned. — [Mealime closing page](https://www.mealime.com/closing)
  - Paid subscriptions are being wound down, and all Pro recipes and features are now available to every user. Users are pointed to "Meals Hub" in Albertsons Companies grocery apps. — [Mealime closing page](https://www.mealime.com/closing)
  - The App Store release notes match. Version 4.21.35 (2 Sep 2026) says "Mealime is shutting down on October 21st, 2026" and makes Pro free. Version 4.21.37 (2 Oct 2026) is the last listed release. — [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)
  - A web search found no independent press coverage of the shutdown. The only sources are Mealime's own site and app. — (search, 17 Oct 2026)
- **Paprika 3 to Paprika 4 (TRANSITION).** Timeline from the developer's news page — [Paprika news](https://www.paprikaapp.com/news/):
  - Paprika 4 beta signup opened 23 Apr 2026.
  - The closed beta started 6 Jul 2026.
  - "Paprika 4 Is Now In Open Beta" for all current users on 28 Sep 2026.
  - "Afterwards, premium features will require a subscription."
  - The Alexa skill beta (30 Sep 2026) is free during the beta but will need a subscription afterwards.
  - No subscription price has been announced. A search found no coverage of user reaction.
  - Paprika 3 is still maintained. The current iOS build is 3.8.5 (16 Jul 2026), at $4.99 with 4.9★ from 54K ratings. — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868)
- **Mela (ACTIVE BUT DORMANT?).** The last iOS release is 2.6.2 (8 Jun 2025). The last Mac release is 2.6.1 (24 May 2025). That means no listed update for about 16 months as of Oct 2026. — [Mela iOS App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041); [Mela Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **Cooklist (UNCLEAR, possibly pivoting).** The page title of cooklist.com now reads "Cooklist - Agentic Commerce for Grocery." — [Cooklist](https://cooklist.com/)
  - The iOS app's latest version is 1.109.1 (dated "Jun 29"). It follows 1.109.0 (27 Apr 2025), so it is probably from 2025. — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
  - A third-party profile describes the business model as B2B SaaS, tagged "agentic commerce" and "white-label ai". This is aggregator data, not a company statement. — [Caplight](https://www.caplight.com/company/cooklist)
- **Actively shipping in Sep–Oct 2026:**
  - Crouton 2026.5, about 16 Oct 2026 — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
  - Pestle 4.0 (14 Sep 2026) and 4.0.1 (about 12 Oct 2026) — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
  - ReciMe 8.1.0 (5 Oct 2026) — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
  - Plan to Eat 4.1.0 (6 Oct 2026) and 4.1.1 (about 16 Oct 2026) — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
  - AnyList 7.1 (11 Sep 2026) — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
  - Honeydew 1.8.6 (30 Sep 2026) — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
  - Umami 3.35 (about 16 Oct 2026) — [Umami App Store](https://apps.apple.com/app/id1597523594)
  - CookBook 3.1.065 (5 Oct 2026) — [CookBook App Store (AU)](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
  - Copy Me That 4.4.3 (10 Sep 2026) — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
  - Deglaze published a landscape cooking-mode post on 1 Sep 2026 — [Deglaze blog](https://www.deglaze.app/blog/landscape-cooking-mode). A third-party tracker lists its last App Store update as 2026-03-03, which conflicts with that post. — [apppricinglab](https://apppricinglab.com/app/apple/6443578246)

**Platforms and sync**
- **Paprika:**
  - Platforms are iOS (iPhone and iPad), Android, Mac and Windows, and "each version of Paprika is sold separately." — [Paprika](https://www.paprikaapp.com/)
  - Paprika Cloud Sync is a free account that syncs recipes, grocery lists and meal plans. — [Paprika](https://www.paprikaapp.com/)
  - Data is stored locally: "No internet connection is required to view your recipes." — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868)
  - The iOS listing shows Apple Watch compatibility (watchOS 6.0+), but no Watch features are described. — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868)
  - Paprika 4 adds iOS/macOS widgets, Siri, Shortcuts, Spotlight and Alexa. — [Paprika news](https://www.paprikaapp.com/news/)
- **Mela:**
  - Runs on iOS and macOS with iCloud sync on by default.
  - On iOS 15 or macOS 12 and later, users can share a recipe library with other iCloud users.
  - Browser history and feed recipes do not sync.
  - It "collects no data and uses no third-party services."
  - — [Mela](https://mela.recipes/)
- **Crouton:** Runs on "iOS, iPadOS, macOS, visionOS & watchOS" with iCloud sync for the household. — [Crouton](https://crouton.app/)
- **Pestle:**
  - Free on iPhone and iPad, plus a Chrome extension. Sync and Households are Pro features. — [Pestle](https://pestlechef.app/)
  - Supports Handoff between iPhone and iPad. The listing requires watchOS 10.6, but no Watch features are described. — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **ReciMe:** Available on iOS, Android, web and as a Chrome extension. — [ReciMe](https://www.recime.app/)
- **Recipe Keeper:** Runs on iPhone, iPad, Android, Windows PC and Mac. It syncs across devices and works "whether online or offline." — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **AnyList:**
  - Available on iOS, Android, and Mac and web apps. — [AnyList](https://www.anylist.com/)
  - Desktop and Apple Watch access are Complete-tier features. — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
- **Umami:** Available on iOS, iPadOS and Apple Vision, plus a web app at umami.recipes. — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **CookBook (CookBook Co. Pty Ltd, Sunshine Coast, AU):** Syncs across iPhone, iPad, Mac (Apple silicon) and web. — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Copy Me That:**
  - Available on web, iOS and Android, plus a browser extension. — [RecipeSage vs CopyMeThat (competitor)](https://recipesage.com/alternatives/copymethat/)
  - "One paid membership covers all your devices." — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)

**Pricing (USD, US App Store unless noted)**
- **Paprika 3:** One-time purchase per platform.
  - iOS is $4.99 — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868).
  - From the Black Friday 2025 sale: iOS and Android list at $4.99 (sale $2.99), macOS and Windows at $29.99 (sale $14.99). — [Paprika news](https://www.paprikaapp.com/news/)
  - Paprika 4 premium will be a subscription at an undisclosed price. — [Paprika news](https://www.paprikaapp.com/news/)
- **Mela:** Free download, then a one-time Mela+ purchase: $6.99 on iOS/iPadOS ([Mela iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041)) and $14.99 on macOS with Family Sharing ([Mela Mac](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)).
- **Crouton:**
  - The App Store lists these in-app purchases: Crouton Plus $24.99, Crouton+ Early Bird $17.99, Discover Monthly $1.99, Discover Yearly $14.99, and tips from $0.99 to $7.99. — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
  - A May 2026 French review says the free tier is limited to 5 recipes and Crouton Plus is a one-time €13. It says Discover (€14.99/yr) adds family sharing, unlimited storage and AI import from photos or text. — [iPhoneSoft, 24 May 2026](https://iphonesoft.fr/2026/05/24/crouton-app-iphone-parfaite-gerer-recettes-cuisine)
  - The App Store and iPhoneSoft prices conflict. Vendor blogs quote "$2.99 one-time" or "$3.99/mo", which are inconsistent. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
- **Pestle:**
  - Free tier keeps 15 recipes. Pro is $24.99/yr with a 14-day trial. — [Pestle](https://pestlechef.app/)
  - In-app purchases: $2.99/mo, $24.99/yr, and lifetime at $39.99 or $49.99 (two lifetime prices are listed). — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **ReciMe:**
  - Free tier allows "5 recipe imports per week". Grocery list, meal plan and cookbooks are free. — [ReciMe](https://www.recime.app/)
  - ReciMe Plus in-app purchases are $29.99, $39.99 and $59.99 (unlabelled), with a 7-day trial. — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
  - A competitor says it costs $39.99/yr and that the trial requires payment details upfront. — [Plan to Eat blog, Jan 2025](https://www.plantoeat.com/blog/2025/01/recime-app-review-pros-and-cons/)
- **Recipe Keeper:**
  - Free for up to 20 recipes. Pro is a one-time purchase per platform: about $19.99 on iOS, $19.99 on Android, $29.99 on macOS, and a separate Windows purchase.
  - Family Sharing is not enabled.
  - — [RecipeSage vs Recipe Keeper (competitor, May 2026)](https://recipesage.com/alternatives/recipe-keeper/)
  - Recipe Keeper's own site lists no prices. — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **AnyList:** Free, or AnyList Complete at $9.99/yr (individual) or $14.99/yr (household). — [AnyList Complete](https://www.anylist.com/complete)
- **Plan to Eat:**
  - 14-day trial with no payment details, then a $54.99/yr membership in the app. — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
  - Direct pricing is $5.95/mo or $49/yr, and there is no free tier. — [RecipeSage vs Plan to Eat (competitor, May 2026)](https://recipesage.com/alternatives/plan-to-eat/)
- **Honeydew:**
  - "$6.99 per month or $39.99 per year"
  - Plus adds unlimited recipe storage, home sharing and an ad-free experience.
  - Other in-app purchases are listed at $9.99/week and at $19.99, $59.99 and $99.99.
  - — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Umami:**
  - Free for 30 days, then monthly, yearly or lifetime. Listed prices run from $0.99 to $59.99.
  - Viewing and exporting recipes stay available after the trial.
  - — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **CookBook:** Free tier gives 20 recipes, 20 smart imports and 2 shopping lists. Pro is $9.99/mo or $59.99/yr. — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Copy Me That:** Free up to 40 recipes. Membership costs $0.99/mo, $12.00/yr, or $65.00 lifetime. — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- **Deglaze:** A "fully featured free version" plus an auto-renewing Deglaze Pro subscription with a free trial. — [Deglaze App Store](https://apps.apple.com/us/app/-/id6443578246)
- **Cooklist:** Pro subscriptions run from $5.99 to $59.99. — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
- **Mealime:** Pro was listed at $2.99/mo and is now free ahead of the shutdown. — [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)

**Ratings snapshot (US App Store, Oct 2026)**
- ReciMe 4.8★ from 313K ratings. It claims "15 million users". — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
- AnyList 4.9★ from 81K — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
- Paprika 3 4.9★ from 54K — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868)
- Mealime 4.8★ from 54K — [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)
- Cooklist 4.7★ from 11K — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
- Plan to Eat 4.8★ from 6.1K — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
- Deglaze 4.9★ from about 3.2K (search snippet of the listing) — [Deglaze App Store](https://apps.apple.com/us/app/-/id6443578246)
- Crouton 4.8★ from about 2.9K — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- Pestle 4.7★ from 1.8K. Its site claims "Loved by over 90,000 people". — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971); [Pestle](https://pestlechef.app/)
- Honeydew 4.8★ from 1.7K — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- Copy Me That 4.6★ from 1.2K — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- Mela iOS 4.6★ from 879 — [Mela iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041)
- CookBook 4.7★ from 753 (AU store) — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- Umami 4.8★ from 473 — [Umami App Store](https://apps.apple.com/app/id1597523594)
- Recipe Keeper claims "50,000+ 5-star ratings" across stores — [Recipe Keeper](https://www.recipekeeperonline.com/)

### Inferences
- Pricing is being reset across the category. Paprika, long the "buy once" benchmark, is moving premium features to a subscription in v4. Crouton has layered a "Discover" subscription over its one-time Plus purchase. AI and social import look like the features used to justify recurring fees.
- Mealime is a cautionary example for any private-recipe product. A retailer acquisition led to a shutdown that deletes user data, with no export path documented. Export and portability are trust features in their own right.
- Mela's last update was in mid-2025, yet comparison articles still recommend it. A buyer should treat its continued development as uncertain.

### Gaps
- No subscription price for Paprika 4 has been published. I found no Reddit or press reaction to the subscription change.
- I couldn't load the Recipe Keeper App Store listing (HTTP 404) or the Plan to Eat website (HTTP 403). Their versions and Android status are not verified first-hand.
- Plan to Eat Android and web availability, and Honeydew and Deglaze Android availability, were not verified.
- Deglaze Pro pricing was not found.
- I couldn't load Google Play listings, so Android-specific ratings and update dates are missing.

## 2. Recipe import: URL, share sheet, social video, photo/OCR, AI parsing

### Takeaway
In 2025–26, AI-assisted import from social video captions (Instagram, TikTok, YouTube, Facebook) and from photos of cookbook pages or handwritten cards became table stakes. ReciMe, Honeydew, Deglaze, CookBook, Pestle, Umami and Recipe Keeper all advertise it, and Paprika adds it in v4. Long-standing web clippers (Paprika's in-app browser, Mela's live-preview browser, AnyList's extensions) remain the reference for blog import. Reliability, not coverage, is now the main complaint, especially for ReciMe.

### Cited Findings
- **Paprika 3:**
  - A built-in browser with a toolbar Download button. If parsing fails, clipboard tools let the user copy the name, ingredients, directions and photos by hand.
  - A Safari share extension and a bookmarklet.
  - File import from `.paprikarecipes`, `.yml` and other apps' formats.
  - — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
  - Imports from MacGourmet, YummySoup!, MasterCook and Living Cookbook. — [Paprika 3 App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868)
  - Paprika lacks AI import from photos or handwriting, per a vendor-written comparison. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
  - A user found that blog import "starts showing its age". — [Slickdeals thread](https://slickdeals.net/f/16213756-paprika-recipe-manager-app-40-50-off-windows-mac-android-ios)
- **Paprika 4 (beta):**
  - Photo scanning: "Choose a photo of a cookbook page or recipe card and let Paprika scan the recipe."
  - Social media import from TikTok, Instagram, Facebook and YouTube.
  - Clipboard importing, category suggestions, a duplicate finder and nutritional analysis.
  - — [Paprika news, 28 Sep 2026](https://www.paprikaapp.com/news/)
- **Mela:**
  - The in-app browser shows a live preview when it detects a recipe, and there is a share extension.
  - "Feeds" subscribe to blogs and put new recipes into an inbox rather than adding them to the collection automatically.
  - Text-recognition scanning reads recipes from books.
  - — [Mela](https://mela.recipes/)
  - Version 2.6 (13 Apr 2025) added "extracting recipes from video descriptions on YouTube, TikTok and Instagram" and "Web Recipe Search". The ML-powered importer means extracted recipes should be checked. — [Mela iOS App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041)
  - Kagi (2.3.4) and Foodle (2.6.1, beta) are available as search engines. — [Mela Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **Crouton:**
  - Imports a recipe from a copied URL. — [Crouton](https://crouton.app/)
  - Scans cookbooks "with AI and OCR" and imports plain text and images.
  - Multi-photo smart import (2025.5.1, 26 May 2025).
  - PDF import and "recipe simplification" (2025.8.1, 29 Sep 2025).
  - schema.org JSON and ZIP import, and clipboard image paste (2024.7).
  - No video, Instagram or TikTok import is mentioned.
  - — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
  - Discover adds RSS feeds for recipe websites with one-tap save. — [Club MacStories](https://club.macstories.net/posts/app-debuts-361)
- **Pestle:**
  - "Save from any website" is free. "Pestle can save recipes from anywhere, even Instagram Reels." Import from PDFs and photos is Pro. — [Pestle](https://pestlechef.app/)
  - The listing names Instagram, TikTok, Facebook and YouTube. When extraction fails, a bookmark links back to the source.
  - Version 3.0.5 (8 Nov 2025) added on-device Apple Intelligence parsing for more websites and AI-generated names for unnamed social recipes.
  - Version 4.0 (14 Sep 2026) added Markdown import.
  - — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **ReciMe:**
  - Imports from Instagram, TikTok, Facebook, Pinterest and YouTube, from screenshots and photos including handwritten recipes, and through a Chrome extension. — [ReciMe](https://www.recime.app/)
  - Also imports from Notes, Google Docs, Notion and Evernote, and runs a "smart importer" for images. — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
  - Version 5.2.8 (25 May 2026) reportedly "fixes critical import and save bugs". Newer complaints concern missing measurements and language errors. — [mwm.ai analysis](https://mwm.ai/articles/recime-v5-2-8-fixes-critical-import-and-save-bugs-in-may-2026-reversing-user-sentiment)
- **Recipe Keeper:**
  - "Search for recipes on the web, Instagram and TikTok and add them straight to your collection." "Hundreds of popular recipe websites supported."
  - Scans from the camera, from photos and from PDF files with OCR.
  - Also supports copy-paste, import from other recipe apps, and one-tap add from other users.
  - — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **AnyList:**
  - Imports from websites, blogs and email. — [AnyList](https://www.anylist.com/)
  - Uses an iOS action extension and desktop browser extensions. Complete fetches photos for imported recipes automatically. — [AnyList Complete](https://www.anylist.com/complete)
- **Plan to Eat:**
  - Imports through the browser share icon or manual entry. Camera and photo-library import arrived in 3.6.0 (20 Aug 2025). — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
  - Social import from Instagram, TikTok, Facebook, Pinterest, YouTube and Substack appears in a search snippet of the listing, but was not on the listing page I fetched. This is unverified.
  - Recipes import one at a time; bulk import is available only for MasterCook. — [RecipeSage vs Plan to Eat (competitor)](https://recipesage.com/alternatives/plan-to-eat/); [Fortune](https://fortune.com/article/best-meal-planning-apps)
- **Honeydew:**
  - Imports from YouTube, Facebook and Instagram Reels, screenshots, notes, and sites such as Epicurious, Allrecipes and Bon Appétit. Clipboard import accepts a URL or text.
  - Generates a recipe from a photo of a meal, and has a "copycat" restaurant-dish generator and a cookbook translator.
  - — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Umami:**
  - Imports through a recipe browser or a pasted URL.
  - A new scanning flow for photos and PDFs (3.3, 3 Jan 2025).
  - Share a photo (3.9) or a PDF (3.17) into the app to import it.
  - Facebook import (2.98). "Improved importing from Instagram, TikTok, and Facebook" (3.30, 16 Nov 2025). "Added more import options" (3.35, Oct 2026).
  - — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **Deglaze:**
  - Uses a share-sheet flow for TikTok, Instagram, YouTube (including Shorts), Facebook and Pinterest. Also imports websites, photos of cookbook pages or cards, and screenshots.
  - AI auto-categorizes recipes.
  - — [Deglaze how-to](https://www.deglaze.app/how-to/save-recipes-from-tiktok); [Deglaze App Store](https://apps.apple.com/us/app/-/id6443578246)
  - Deglaze claims to be the only app that analyzes the video itself. This is an unverified vendor claim. — [Deglaze vs ReciMe (vendor)](https://www.deglaze.app/blog/deglaze-vs-recime)
- **CookBook:**
  - Imports "from Instagram, TikTok, websites, Facebook, YouTube, Pinterest and links". Social import arrived in 3.0.0 (12 Jul 2025).
  - The AI scanner turns photos of handwritten cards and cookbook pages into editable recipes.
  - — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Copy Me That:**
  - Saves from websites and "most apps" as a full copy: "You're not just saving the link". 4.4.3 (10 Sep 2026) "Improved the ability to save from social media apps".
  - Detection is "optimized for English".
  - — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- **Cooklist:** Imports from TikTok and Instagram Reels (1.104.4), and fixed recipe URL import (1.103.0, 25 Nov 2024). — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
- **Mealime:** A curated recipe catalogue. The listing documents no import. — [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)

### Inferences
- Import now comes in tiers:
  1. Schema.org and web clipping. Everyone has it, and Paprika, Mela and AnyList are the mature versions.
  2. Social caption parsing. This is now standard.
  3. Photo and handwriting OCR with an LLM clean-up step. This is common in subscription apps.
  4. Video analysis beyond captions. Only Deglaze claims it, and the claim is unverified.
- Strong importers have recovery paths. Paprika has manual clipboard fields, Pestle falls back to a bookmark, and Mela uses a review inbox for feeds. These patterns let users recover when parsing fails.
- Free-tier import caps are the main monetization lever (ReciMe 5 per week, CookBook 20, Crouton 5 recipes). They are also the main source of complaints.

### Gaps
- I found no independent, quantitative accuracy test comparing import quality across apps. All quality claims are anecdotal or written by vendors.
- Whether Crouton parses video or Instagram captions is undocumented. Its listing doesn't mention it.
- No independent confirmation that ReciMe's in-app grocery ordering uses Instacart. Only a podcast topic names it. — [EmpowerHer podcast](https://empowerherwellness.buzzsprout.com/2323907/episodes/18911992-081-best-recipe-app-for-meal-planning-grocery-lists-and-saved-recipes)

## 3. Cook mode specifics: screen wake, step view, strike-through, timers, quantities in steps, landscape, Watch and Live Activities, voice

### Takeaway
The common baseline is keeping the screen awake, checking off ingredients and highlighting the current step. Differentiators in 2025–26:
- Timers detected in the step text that run as system-grade timers (AlarmKit, Live Activities, Lock Screen): Crouton, Pestle, AnyList 7.0, Mela.
- Ingredient quantities shown inside each step: Pestle's tappable green text, Crouton's tap-to-show, and Deglaze's AI inline annotations that follow scaling.
- A landscape split view with ingredients beside the steps: Deglaze, and Pestle on iPad.
- Hands-free control: voice in Pestle, hand gestures in Crouton, gestures and winks in Honeydew, Alexa in Paprika 4 and Recipe Keeper.

### Cited Findings

**Feature matrix** ("n/d" = not documented in sources consulted)

| App | Screen awake | Step focus / large type | Check off ingredients / steps | Auto-detected timers in step text | Multiple / named timers | Quantities inside steps | Landscape / iPad split | Watch / Live Activity / Lock Screen | Hands-free / voice | Sources |
|---|---|---|---|---|---|---|---|---|---|---|
| Paprika 3 | "Keep Screen On" setting; sleep re-enabled when the recipe closes | No separate mode; tap a direction to highlight it | Tap an ingredient to cross it off | Times highlighted in blue, tap to start | Timers list (add, pause, resume, cancel, edit); manual timers can be named (default = recipe name); fire with sound when the app is closed | n/d | iPad drag-and-drop is for meal planning only | Watch compatibility listed, features n/d | Paprika 4 beta: Alexa skill shows pinned recipes on Echo Show | [help](https://www.paprikaapp.com/help/ios/), [App Store](https://apps.apple.com/us/app/paprika-recipe-manager-3/id1303222868), [news](https://www.paprikaapp.com/news/) |
| Mela | "Disable Sleep" option for cook mode (2.2.1, Jan 2023) | Full-screen, larger font; all steps except the current one dimmed; multiple recipes, switch between them | Tap ingredients to check them off | n/d (timers are started inside cook mode) | Timers managed inside cook mode | n/d | n/d | Timer Live Activities (iOS 16.1+) | n/d | [site](https://mela.recipes/), [iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041), [Mac](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476) |
| Crouton | n/d | Step-by-step shows one step at a time (redesigned 2024.5); scale from step-by-step (2026.5) | n/d | Detects times in steps, tap to start; heads-up display while using other parts of the app | "Create multiple timers"; self-naming timers and AlarmKit (2025.8.1); manual timer input (2024.7) | Tap an ingredient to show its quantity | n/d | Watch Live Activities show timers, steps and doneness, plus Watch double-tap (2024.6); Lock Screen timer fixes (2024.9.1) | Hands-free mode; hand-gesture navigation (2026.5); SharePlay cooking sessions | [App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987), [site](https://crouton.app/) |
| Pestle | n/d | Big green "Start Cooking" button; iPad: ingredients on the left, each step in large text on the right | n/d | Times in steps highlighted green; tap to start a timer; timers also in the top toolbar | "As many timers as you want"; behave like system timers even when muted or in Do Not Disturb, and AI-named (3.0.5, Nov 2025) | Ingredients highlighted green inside steps; tap to show the quantity | iPad split layout | Listed in 2022 iOS 16.1 Live Activities roundups; not mentioned in the current listing | Voice "Next" and "Previous", with customizable words; Siri can answer "how much flour" (4.0); "Head Up" warns early about long waits such as marinades (4.0); SharePlay advances steps on everyone's screen | [MacStories](https://www.macstories.net/reviews/pestle-1-2-the-macstories-review/), [App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971), [site](https://pestlechef.app/), [Vodafone](https://www.vodafone.de/featured/article/ios-16-1-live-aktivitaeten-apps-168226) |
| AnyList | "Keep Screen On" option for cooking view (5.27.10, May 2024) | Cooking view | n/d | 7.0 (20 Apr 2026): "Cooking view now automatically highlights times in recipe steps" | Recipe timers (need iOS 26.2+) | n/d | n/d | Live Activities (7.0); Apple Watch shows lists (Complete) | Siri and Alexa add list items | [App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641) |
| Plan to Eat | Keeps the screen awake on recipes (4.1.0, 6 Oct 2026) | "Start Cooking" opens step-by-step instructions | n/d | n/d | Up to 5 cooking timers (4.1.0) | n/d | n/d | n/d | n/d | [App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056) |
| Deglaze | Screen stays on | Steps tab; current step highlighted in landscape | Ingredient checklist | One-tap timers that count down inside the instructions (Pro) | Running timer shown in the top row | AI "Show ingredients inline" toggle (Pro, Feb 2026) | iPhone landscape: ingredients on the left, steps on the right (free, Sep 2026) | n/d | n/d | [inline](https://www.deglaze.app/blog/stop-scrolling-while-you-cook-meet-inline-ingredients), [landscape](https://www.deglaze.app/blog/landscape-cooking-mode) |
| Honeydew | Screen stays on | n/d | n/d | Timers can be set inside recipe steps | n/d | n/d | n/d | n/d | Hands-free mode using hand gestures and winks (1.8.0, 28 May 2026) | [App Store](https://apps.apple.com/us/app/-/id6714449541) |
| Umami | n/d | "Start Cooking" opens an interactive ingredient checklist plus step-by-step directions; Liquid Glass tab bar switches ingredients/directions (3.34, 27 Jan 2026) | Ingredient checklist | n/d | n/d | n/d | n/d | No Watch app found | n/d | [App Store](https://apps.apple.com/app/id1597523594) |
| ReciMe | "Keep your phone screen unlocked while you cook" | Step-by-step | n/d | n/d (no timers documented) | n/d | n/d | n/d | n/d | n/d | [App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280), [help](https://recime.app/help/en/articles/11594896-que-es-recime) |
| CookBook | n/d | "Follow clean, readable recipe steps while you cook" | n/d | n/d | "Use cooking timers" | n/d | n/d | n/d | n/d | [App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917) |
| Copy Me That | Keeps the device from sleeping | n/d | n/d | n/d | n/d | n/d | n/d | n/d | n/d | [App Store](https://apps.apple.com/us/app/-/id956800243) |
| Recipe Keeper | n/d | No in-app cook mode documented | n/d | n/d | n/d | n/d | n/d | n/d | Alexa skill gives step-by-step instructions (English only) | [site](https://www.recipekeeperonline.com/) |
| Mealime | n/d | Step-by-step instructions | n/d | n/d | n/d | n/d | n/d | n/d | Hands-free mode: "change instruction steps without touching your phone" | [site](https://www.mealime.com/), [App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103) |

**UX details worth copying**
- **Deglaze inline ingredients (6 Feb 2026), Pro feature.** — [Deglaze](https://www.deglaze.app/blog/stop-scrolling-while-you-cook-meet-inline-ingredients)
  - A "Show ingredients inline" toggle at the top of the instructions inserts ingredient names and amounts in parentheses. Example: "Toss lemon slices (1, thinly sliced) and shallots (1, peeled and cut into thin wedges)…".
  - The annotations use a lighter font than the original text and include descriptive amounts such as "Generous drizzle".
  - When the recipe is doubled, the inline quantities update.
  - The AI can take up to 60 seconds, but steps load progressively.
  - The post says AI beats string matching on repeated ingredients, grouped phrases like "add the dry ingredients", and multiple ingredient sections.
- **Deglaze landscape (1 Sep 2026), free.** — [Deglaze](https://www.deglaze.app/blog/landscape-cooking-mode)
  - The left pane holds the title and the checked-off ingredient list. The right pane holds the steps, with the current one highlighted.
  - One top row holds back, Steps/Recipe/Notes tabs, the running timer, scale, a menu and Done.
  - In portrait, the ingredients are "a tab away".
- **Crouton:** — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
  - Timers detected in steps keep a heads-up display while the user browses other parts of the app.
  - 2025.8.1 (29 Sep 2025) added self-naming timers and AlarmKit.
  - 2026.5 (Oct 2026) added hand-gesture navigation in hands-free mode and scaling from step-by-step mode.
- **AlarmKit context:** It arrived in iOS/iPadOS 26 and puts timers and alarms on the Lock Screen and in the Dynamic Island, with customizable Live Activities and custom alert actions. — [Apple WWDC25 session 230](https://developer.apple.com/videos/play/wwdc2025/230/). Third-party developer guides found in search say AlarmKit alarms break through Focus and Silent mode. I did not verify this against Apple documentation.
- **Mela:** Dims every step except the current one and supports several recipes in cook mode with switching. — [Mela](https://mela.recipes/)
- **Paprika:** Running timers show in the lower toolbar "if there is enough space". The user should check the device isn't muted for alarms to sound. — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)

### Inferences
- The baseline that recipe-manager users expect: screen wake, ingredient check-off, step highlight, and timers detected in step text that can be tapped.
- Mid-tier: several concurrent timers that survive app backgrounding and silent mode. On iOS 26 the reference is now AlarmKit plus Live Activities (Crouton, Pestle 3.0.5, and AnyList 7.0, whose iOS 26.2 requirement points to AlarmKit, an inference).
- Leading-edge: ingredient quantities inline in each step that follow scaling, and a landscape split view.
- Hands-free control is splitting into voice (Pestle, Alexa) and camera gestures (Crouton, Honeydew).
- Step photos inside cook mode were not a promoted feature in any listing reviewed.

### Gaps
- I found no documentation of Android ongoing timer notifications or Android-specific cook-mode behaviour for Paprika, ReciMe, Recipe Keeper, AnyList, CookBook or Copy Me That.
- Whether Paprika scales or converts quantities inside the directions text is undocumented. The help guide only covers ingredients.
- Pestle's current Live Activity and Apple Watch support isn't stated in its 2026 listing. The only evidence is 2022 roundups.
- Strike-through of steps (as opposed to highlighting them) wasn't documented for any app except through step highlighting or dimming.
- No reliable source covered Mela's or Paprika's behaviour in iPad landscape cook mode.

## 4. Scaling and unit conversion

### Takeaway
Every app scales servings. The differentiators are:
- scaling by a chosen ingredient or by a custom multiplier (Crouton);
- scaling several quantities within one ingredient line (Pestle 4.0);
- scaling that updates quantities shown inside the steps (Deglaze);
- scaled amounts carrying into the grocery list without overwriting the saved recipe (Paprika, Honeydew);
- automatic unit promotion above thresholds (Pestle).

Metric/imperial conversion is common, and Paprika offers a "default" reset to the original units.

### Cited Findings
- **Paprika:** — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
  - "Scale & Convert" sits under the Ingredients heading.
  - Units convert to metric, imperial or "default", which "resets them back to their original units."
  - Scaled amounts carry over to the grocery list.
- **Crouton:**
  - "Quickly convert recipes between metric and imperial." — [Crouton](https://crouton.app/)
  - Scale by servings, by multiplier or by a selected ingredient, with custom amounts (2025.8, 14 Sep 2025).
  - Scale directly from step-by-step mode (2026.5).
  - Fraction and German timer fixes (2025.2).
  - — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- **Pestle:**
  - Scaling and metric/imperial conversion are free. — [Pestle](https://pestlechef.app/)
  - Tap the servings label to scale, with automatic unit conversion above thresholds (2.1.5, 2 Mar 2025).
  - Scale multiple quantities within one ingredient, and new units (4.0, Sep 2026).
  - — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **Deglaze:** Inline step quantities update when the recipe is doubled, and scaling and conversion "update in real time". — [Deglaze](https://www.deglaze.app/blog/stop-scrolling-while-you-cook-meet-inline-ingredients). Scaling mid-cook works in landscape. — [Deglaze](https://www.deglaze.app/blog/landscape-cooking-mode)
- **Honeydew:** "Smarter recipe scaling" (1.8.6, 30 Sep 2026) scales without changing the saved recipe. The scale carries into the grocery list, print and share. The app also switches between Imperial and Metric. — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Plan to Eat:** Decimal servings such as 2.5, and editing times and servings from one screen (4.1.1, Oct 2026). — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
- **AnyList:** Scaling is a Complete feature. — [AnyList Complete](https://www.anylist.com/complete)
- **Mela:** Scaling and US/metric conversion exist but appear only as fixes in the notes ("Ingredients scaling/conversion of tiny amounts", 1.6.2; rounding and conversion fixes, 2.2). — [Mela Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **ReciMe:** Scales to a target serving size and converts standard/metric. — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
- **Recipe Keeper:** "Adjust a recipe serving size up or down and let Recipe Keeper automatically recalculate your ingredients." — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **CookBook:** "Scale servings, convert units". — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Copy Me That:** A competitor's blog says recipe scaling and automatic merging of similar grocery items are Premium features. The Copy Me That listing itself says membership gives "access to all our features", and it does not document scaling. — [ReciMe blog (competitor; exact post among several search results)](https://www.recime.app/blog/?p=4147); [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)

### Inferences
- The design question that separates good from great: is scaling a temporary view state (Honeydew, Paprika's toggle) or a destructive edit, and does it propagate to the steps, the shopping list and shared text? Honeydew 1.8.6 states this explicitly.
- Edge cases (tiny amounts, rounding, fractions, unit promotion) keep appearing in fix notes for Mela, Crouton and Pestle. They need deliberate handling.

### Gaps
- None of the sources describe fraction display rules, such as ⅓ versus 0.33 or rounding to kitchen-friendly fractions.
- None document how scaling treats "to taste" or descriptive quantities, apart from Deglaze showing descriptive amounts inline.

## 5. Organization: collections, tags, ratings, cooked history, notes, ingredient search, pantry

### Takeaway
Organization is mature and similar across apps: categories or folders, tags, a 0–5 star rating, favourites, and full-text search that includes ingredients. Pantry tracking ranges from simple lists to barcode or loyalty-card capture:
- Paprika: expiry dates and auto-uncheck.
- Paprika 4: barcode scanning and multiple storage locations.
- Cooklist: purchases pulled in from loyalty cards.
- Honeydew: a photo of the pantry suggests recipes.

A "cooked" history or log is notably absent from the documentation.

### Cited Findings
- **Paprika:** — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
  - Recipes can sit in multiple categories, with subcategories.
  - Built-in views: Favorites, Most Recent, Top Rated, Uncategorized and Trash.
  - Star ratings from 0 to 5, a Notes field for "cooking notes" and a Nutritional Info field.
  - Search covers Name, Ingredients, Directions, Description, Notes, Source and Source URL. Several ingredients can be searched with commas ("chicken, spinach").
  - Pantry items record quantity, purchase date, expiration date and stock status, and sort by Aisle, Date Added, Expiration Date or In Stock. Pantry items are "unchecked automatically" when recipes or meal plans are added to the grocery list.
- **Paprika 4:** Advanced search, category suggestions, a duplicate finder, cookbooks, extra pantry storage locations and barcode scanning (mobile only). — [Paprika news](https://www.paprikaapp.com/news/)
- **Mela:** Categories plus "Favorite" and "Want to Cook" flags. — [Mela Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **Crouton:**
  - "Store recipes in whatever format suits you. Whether that's a website, photo or just a title". — [Crouton](https://crouton.app/)
  - Smart tags (2025.8.1), linked recipes (2024.8), folder search fixes (2025.8.3) and improved search (2024.5). — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- **Umami:** Tags (for example "Vegetarian", "Dessert", "Baking"), shared recipe books, and ratings (2.96, Dec 2024). — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **Recipe Keeper:** Course and category, photos, ratings and favourites. Search by name, ingredient or directions, and browse by course, category or rating. — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **Plan to Eat:** Search by title, ingredients, course, main ingredient, tags and rating. — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
- **Deglaze:** AI auto-categorization. Search by title, ingredient and author. — [Deglaze App Store](https://apps.apple.com/us/app/-/id6443578246). The cooking session has a Notes tab. — [Deglaze](https://www.deglaze.app/blog/landscape-cooking-mode)
- **ReciMe:** "Cookbooks" customized by meal type, cuisine and diet. — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
- **Copy Me That:** Collections and search. — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- **CookBook:** Search, tags and filters. — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Honeydew:**
  - "Pantry Mode" (1.5, 28 Aug 2025) finds recipes you can make from a photo of your pantry or ingredients.
  - Search by ingredients you have.
  - Achievement medals with the unlock date (1.8.6) are the closest thing to a cooking-progress record found.
  - — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Cooklist:**
  - Connects to grocery loyalty cards and "automatically downloads all of your food purchases into a digital pantry". It "Works with Walmart, Kroger, Safeway, Wegmans and 75 more".
  - Claims "Over 1 million recipes generated by your pantry inventory".
  - PantryScan (Feb 2025) and AI Chef (Feb 2025).
  - — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
- **AnyList:** Barcode scanning (beta 5.29, Dec 2024; out of beta 5.30, Jun 2025) and recipe folders (Complete). — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)

### Inferences
- "Want to Cook" (Mela) and favourites are the closest common equivalents to a cooking-intent queue.
- I found no "cooked on" log, cook count, or per-cook notes in any listing. A cooking history with dated private notes ("cooked 12 Mar, less salt next time") could be an open differentiator.

### Gaps
- No app was documented with per-step private notes. Only per-recipe notes were found (Paprika's Notes field, Deglaze's Notes tab).
- Cooked history or logs were not documented in any of the sources consulted. Some apps may have them without advertising them.
- I couldn't verify Paprika 3 pantry expiry notifications. The help guide doesn't mention alerts.

## 6. Shopping lists: aisle grouping, merging duplicates, pantry-aware exclusion, household sharing, delivery

### Takeaway
Aisle or category auto-sorting is universal. Duplicate merging (Paprika, CookBook, Copy Me That Premium) and pantry-aware exclusion (Paprika auto-uncheck, Cooklist's missing-only list, Honeydew's skip-ingredients) are the meaningful differences. AnyList is the household-list benchmark, with real-time shared check-off, store-specific category order, store assignment, location reminders, prices and Watch. Apple-centric apps (Mela, Crouton) delegate the list to Apple Reminders. Delivery handoff is thin and mostly retailer-tied (Cooklist store connections, ReciMe in-app ordering, Mealime "leading grocery retailers").

### Cited Findings
- **Paprika:**
  - Lists are "automatically sorted by aisle", and "Similar ingredients will also be combined" (1 egg + 2 eggs = 3 eggs). — [Paprika](https://www.paprikaapp.com/)
  - Merged items are marked ⊕, and merging can be turned off.
  - Aisles are auto-selected as you type and editable in Settings.
  - Multiple lists are supported ("My Grocery List" can be renamed but not deleted).
  - Each list exports to Reminders, with a customizable list name.
  - — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
- **AnyList:**
  - Autocomplete, and categories you can rearrange to match your store.
  - Real-time shared check-off ("Instantly share your grocery list with your partner or roommates").
  - Item notes and photos (Complete), widgets, and Siri and Alexa voice add.
  - "Add all ingredients to your list in one tap".
  - — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
  - Complete adds item prices with a running total and multi-store price comparison, store assignments with filtering, location reminders near a store, and Apple Watch check-off. — [AnyList Complete](https://www.anylist.com/complete)
  - List folders and themes. — [AnyList](https://www.anylist.com/)
  - No delivery integration appears in the listing. One user review mentions sending a list to grocers. — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
- **Mela:** Groceries are stored in Reminders.app, so the list works on Mac-only setups and through iCloud Reminders sync. — [Mela](https://mela.recipes/)
- **Crouton:** "Create shopping lists directly from your recipes", integrated with Reminders. — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- **Pestle:** Add recipe ingredients and "check off items you already have". — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **Umami:** Shared lists sorted by aisle or by recipe. — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **ReciMe:**
  - Sort "by supermarket aisle or by recipe".
  - Turn the grocery list into an in-app delivery order. The retailer isn't named.
  - — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
- **Honeydew:** Lists generated from the meal plan and sorted by store section. You choose which ingredients to skip when adding a recipe to the cart (1.7.0). Household sharing syncs plans and lists. — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Recipe Keeper:** Aisle grouping, multiple lists (for example one per store), a favourites button for regular items, and one-step add from the meal planner. — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **CookBook:** "Merges ingredients, sorts groceries by aisle and syncs your shopping list across devices". — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Copy Me That:**
  - Sort by recipe or by category. — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
  - Past complaints: default categories couldn't be deleted or renamed (2017 review), and items like "1/2 cup chopped onions" stayed as separate entries (2021 review). — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
  - A competitor says it lacks editable aisle categories. — [RecipeSage (competitor)](https://recipesage.com/alternatives/copymethat/)
- **Plan to Eat:** The list is generated from the meal plan. You can add items from a staples list, reorder categories and create store-specific lists. — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
- **Cooklist:** The list includes "only the ingredients that you are missing in your pantry". Store connections cover Walmart, Kroger, Costco and others. Its developer notes: "We don't have shopping carts available for every single store." — [Cooklist App Store](https://apps.apple.com/app/id1352600944)
- **Mealime:** "Done for you" lists auto-sorted into categories. The app is "Supported by leading grocery retailers", with no names given. — [Mealime](https://www.mealime.com/); [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)
- **Paprika 4:** Adds family sharing and direct messaging. — [Paprika news](https://www.paprikaapp.com/news/)

### Inferences
- The strongest flows have four parts: merge with a visible marker (Paprika ⊕), let users exclude what they already have (Paprika's pantry auto-uncheck, Pestle and Honeydew skip lists), keep a per-item recipe origin (sort "by recipe" in ReciMe, Umami and Copy Me That), and support shared real-time check-off (AnyList).
- Merging free-text quantities ("1/2 cup chopped onions" alongside "1 onion") is still a known weak spot.

### Gaps
- No source documented how any app merges ingredients that are the same item in different units or preparations, such as 1 onion versus ½ cup chopped onion.
- Instacart or Walmart handoff for ReciMe, AnyList and Plan to Eat could not be confirmed from primary sources.

## 7. Meal planning: calendar, drag-and-drop, leftovers, nutrition targets

### Takeaway
Plan to Eat is the planning specialist: drag-and-drop calendar, leftovers, frozen-meal tracking, daily nutrition totals and per-ingredient nutrition (Oct 2026). AnyList 6.0 (Dec 2025) added a Queue, Ideas, Templates and Pinned entries. Paprika's reusable "Menus" and Crouton's or Honeydew's auto-generated plans are the other notable patterns. Mela and Paprika use the system calendar, and Paprika 4 adds subscribable calendar feeds. Mealime's diet- and allergy-first weekly plan with an auto-generated list is being discontinued.

### Cited Findings
- **Paprika:**
  - Daily, weekly and monthly views. Drag-and-drop from the sidebar is iPad-only.
  - "Menus" are reusable groups of recipes: set the number of days to 7 for a weekly plan, then add it with a start day.
  - "Export to Calendar" exports the visible period.
  - — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
  - Paprika 4 adds calendar feeds for Apple Calendar, Google Calendar and Outlook. — [Paprika news](https://www.paprikaapp.com/news/)
- **Plan to Eat:**
  - Reschedule recipes, plan leftovers and track frozen meals. Version 4 made drag-and-drop smoother and lets you plan a full day at once.
  - Daily nutrition totals in the planner (3.6.4, Oct 2025) and per-ingredient nutrition breakdowns (4.1.1, Oct 2026).
  - — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
  - A competitor says its menu templates and its freezer/batch tracker are more developed than RecipeSage's. — [RecipeSage (competitor)](https://recipesage.com/alternatives/plan-to-eat/)
- **AnyList:** 6.0 (15 Dec 2025) was a "major meal planning update" adding a Queue, an Ideas tab, Templates, Pinned Entries and calendar search. The calendar is a Complete feature. — [AnyList App Store](https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641)
- **Mela:** "The entries are stored in the Calendar app", so people without Mela can see the plan. — [Mela](https://mela.recipes/). There is also a "next planned meal" widget. — [Mela iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041)
- **Crouton:**
  - "Assign saved recipes to each day of the week" and "Use your stored recipes to automatically generate meal plans". — [Crouton](https://crouton.app/)
  - Weekly widgets (2026.5) and a snack meal section (2024.8). — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- **Pestle:**
  - Breakfast, Lunch, Dinner and custom sections, with calendar sync. — [Pestle](https://pestlechef.app/)
  - A 14-day span. "Head Up" surfaces long waits such as marinades and overnight proofs in advance (4.0). — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **Honeydew:**
  - AI weekly planner for keto, vegan, paleo, high-protein and gluten-free diets.
  - "Plan From Your Cart" (1.8.6) and an upcoming-meals widget (1.8.0).
  - Auto calories and macros.
  - — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **ReciMe:** "Magic Meal Plan" personalized weekly recipes, and breakfast/lunch/dinner categories. — [ReciMe App Store](https://apps.apple.com/us/app/recime-recipes-meal-planner/id1593779280)
- **Recipe Keeper:** Weekly and monthly views, and sharing a plan with family. — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **CookBook:** Plans for days, weeks or months, with calorie and macro estimates. — [CookBook App Store](https://apps.apple.com/au/app/cookbook-recipe-keeper/id1073341917)
- **Deglaze:** A calendar planner with breakfast, lunch, dinner and snack labels (Pro). — [Deglaze App Store](https://apps.apple.com/us/app/-/id6443578246)
- **Mealime:**
  - Plan types (Classic, Vegetarian and others), allergies, dislikes, "over 200 personalization options", and household size (for 2 or for 4). — [Mealime](https://www.mealime.com/)
  - Nutrition for every recipe, plus Apple Health integration. — [Mealime App Store](https://apps.apple.com/us/app/mealime-meal-plans-recipes/id1079999103)
  - Shutting down 21 Oct 2026. — [Mealime closing page](https://www.mealime.com/closing)

### Inferences
- Leftovers, frozen meals and reusable templates (Plan to Eat, AnyList 6.0, Paprika Menus) are what heavy planners value most.
- Nutrition targets mostly appear as per-day totals (Plan to Eat) or AI estimates (Honeydew, ReciMe, CookBook) rather than goals the user sets.

### Gaps
- None of the sources document user-set nutrition targets (for example a daily protein goal) with progress tracking.
- Drag-and-drop on iPhone (as opposed to iPad or web) is unconfirmed for Paprika. Its help limits drag-and-drop to iPad.

## 8. Editing UX: structured vs free text, sections, step photos, version history

### Takeaway
Most apps use structured fields: separate ingredients and directions text with light markup. Paprika's conventions are the clearest documented model:
- a trailing colon makes a section header ("Sauce:");
- `[photo:Name]` places a photo inline in a step;
- `[recipe:Name]` links to another recipe;
- Markdown bold, italic and links work.

Newer apps lean on AI clean-up (Crouton's "recipe simplification", Deglaze's inline annotation) instead of manual structure. No app documented recipe version history.

### Cited Findings
- **Paprika:**
  - Ending an ingredient line with a colon creates a heading.
  - `[photo:Name]` inserts a photo in text fields, and tapping the thumbnail opens the gallery.
  - `[recipe:Name]` links to another recipe.
  - Bold uses `__` or `**`, italics `_` or `*`, and links `[title](URL)`. This works in the description, ingredients, directions, nutrition and notes fields.
  - — [Paprika iOS help](https://www.paprikaapp.com/help/ios/)
  - Multiple high-resolution images per recipe. — [Paprika](https://www.paprikaapp.com/)
- **Crouton:**
  - Ingredient formatting and faster time entry (2024.5), linked recipes (2024.8) and recipe translation (2024.6).
  - Recipe simplification (2025.8.1) and recipe creation fixes (2026.1.2).
  - Export to PDF, Markdown and plain text, plus multi-recipe export (2026.5).
  - — [Crouton App Store](https://apps.apple.com/us/app/crouton-recipe-manager/id1461650987)
- **Mela:** Recipe translation in the editor (iOS 18 and macOS 15) and links in the description field (2.0.3). — [Mela iOS](https://apps.apple.com/us/app/mela-recipe-manager/id1548466041); [Mela Mac](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **Pestle:** Markdown import and "per-step instructions" are listed in the 4.0 highlights without further detail. — [Pestle App Store](https://apps.apple.com/us/app/pestle-recipe-manager/id1574776971)
- **Umami:** Export to PDF, Markdown, HTML, plain text or Recipe JSON Schema. Share links work for people without the app. — [Umami App Store](https://apps.apple.com/app/id1597523594)
- **Plan to Eat:** Edit recipe times and servings from one screen (4.1.1). — [Plan to Eat App Store](https://apps.apple.com/us/app/plan-to-eat/id1215348056)
- **Copy Me That:** Edit recipes and add photos. "Your recipes belong to you", with export at any time. — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- **Recipe Keeper:** Builds printable or PDF cookbooks with custom fonts, colours, page sizes, cover pages, chapters, a table of contents and page numbers. — [Recipe Keeper](https://www.recipekeeperonline.com/)
- **Honeydew:** Scaling no longer changes the saved recipe (1.8.6), which separates the view state from the source of truth. — [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)

### Inferences
- Paprika's inline markup (headers, inline step photos, recipe links) is a proven, low-UI way to support ingredient sections, step photos and sub-recipes. More visual apps replace it with structured editors.
- Open export formats (Umami's JSON Schema, Crouton's Markdown or ZIP, Paprika's `.paprikarecipes`) are now part of a trust story, sharpened by Mealime's data deletion.

### Gaps
- No app was documented with recipe version history or revision restore.
- Step photo support in editors was documented only for Paprika (inline `[photo:Name]`). The others are unknown.
- I found no detailed walkthrough of the editing screens for Mela, Crouton or Pestle in the sources fetched.

## 9. Top user praise and complaints

### Takeaway
- Praise centres on reliable import and offline access (Paprika), a polished cook mode with privacy and iCloud (Crouton, Mela), and frictionless shared lists (AnyList).
- Complaints centre on subscription paywalls and import caps (ReciMe), per-platform repurchase (Paprika, Recipe Keeper), unreliable social or AI import (ReciMe), and an aging UI or blog import (Paprika 3).

### Cited Findings
- **Paprika:**
  - Recommended for mixed-device households ("the safest recommendation in 2026") and for working offline. It pays per platform and lacks AI photo import. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
  - The Sweet Setup calls it the best recipe manager for iPhone, iPad and Mac. — [The Sweet Setup](https://thesweetsetup.com/apps/best-recipe-manager-ios-mac/)
  - A Slickdeals user prefers Mela or Crouton for iCloud sync and finds Paprika's blog import "showing its age". — [Slickdeals](https://slickdeals.net/f/16213756-paprika-recipe-manager-app-40-50-off-windows-mac-android-ios)
- **Mela:**
  - Described as best-in-class web clipping, cookbook scanning, blog feeds, and Calendar and Reminders integration. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
  - MacStories Selects 2021 Best Design. — [Mela](https://mela.recipes/)
  - Carries an Editors' Choice award. — [Mela Mac App Store](https://apps.apple.com/us/app/mela-recipe-manager/id1568924476)
- **Crouton:** "gorgeous layouts, a genuinely good step-by-step cook mode", against a "smaller feature set, Apple-only, and fewer data-export paths". — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
- **ReciMe:**
  - Recurring complaints: the 5-import free cap ("it let me copy and paste like 5 recipes before it stopped me"), annual pricing quoted at $39.99–$59.99, "misleading free-to-use marketing", requests for a lifetime option, and imports that "only import the picture half the time". — [justuseapp reviews](https://justuseapp.com/en/app/1593779280/recime-importer-recettes/reviews); [Marlvel](https://marlvel.ai/apps/recime-recipes-meal-planner/reviews)
  - Praised as the best at converting TikTok and Instagram clips. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026)
  - The aggregator ratings conflict with the App Store's 4.8 from 313K. — [mwm.ai](https://mwm.ai/articles/recime-v5-2-8-fixes-critical-import-and-save-bugs-in-may-2026-reversing-user-sentiment)
- **Recipe Keeper:** Called the strongest cross-platform all-rounder with a usable free tier. — [Swoodie (vendor)](https://swoodie.app/blog/paprika-vs-mela-vs-crouton-vs-swoodie-2026). Its per-platform purchase without Family Sharing is described as a friction point. — [RecipeSage (competitor)](https://recipesage.com/alternatives/recipe-keeper/)
- **Copy Me That:** Praised as "by far the most complete recipe/shopping list/meal planner out there" (2021) and for having no pop-ups (2023). Complaints are about categories and list merging (above). — [Copy Me That App Store](https://apps.apple.com/us/app/-/id956800243)
- **Honeydew:** A third-party review page found in search reports that "the free version has intrusive ads". This conflicts with the listing's "no ads" description and the "ad-free" Plus perk, so treat it as possibly older or tier-specific. — [Grand Screen / AlternativeTo search results](https://grand-screen.com/apps/honeydew-recipe-manager/); [Honeydew App Store](https://apps.apple.com/us/app/-/id6714449541)
- **Plan to Eat:** Imports only one recipe at a time. — [Fortune](https://fortune.com/article/best-meal-planning-apps)

### Inferences
- Users reward three things: reliable import, a cook mode that never fights them (screen wake, quick timers), and ownership (offline storage, export, one-time pricing). They punish surprise paywalls on the core "save a recipe" action.

### Gaps
- I could not retrieve r/Cooking or r/mealprep threads directly. No current Wirecutter, The Verge or Zapier recipe-manager review from 2025–26 surfaced in searches; a 2014 Wirecutter Android piece was the only Wirecutter hit.
- Most comparison content found is vendor-written (Swoodie, Honeydew, RecipeSage, ReciMe, Deglaze, Plan to Eat). Independent editorial benchmarking from 2025–26 is sparse.
