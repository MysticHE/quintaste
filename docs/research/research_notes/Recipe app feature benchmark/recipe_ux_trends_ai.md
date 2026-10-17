# Recipe/Cooking App UX Best Practices, Cook-Mode Trends and AI Features (2024–2026)

Research date: 17 October 2026. Scope: recipe detail pages and in-kitchen cook modes, independent of any single app. Evidence strength is labelled throughout: **[Peer-reviewed]** (ACM CHI/ASSETS/DIS, journals), **[Preprint]**, **[Official docs]** (Apple/Google/W3C), **[Vendor study]** (commercially interested survey or case study), **[Press]** (tech/news reporting), **[Opinion/Case study]** (practitioner write-ups, aggregators). Older studies are labelled with their year.

## 1. UX research on recipe pages (structure, "jump to recipe", ingredient/step layout, scannability, life-story bloat)

### Takeaway
No rigorous NN/g or open Baymard study on recipe-page layout surfaced; the best quantitative evidence is a 2026 vendor survey (N=354) showing most cooks skip the article entirely (48.6% scroll straight to ingredients, only 11.3% read most of the article) and that "hard to find ingredients/steps", ads/pop-ups and clutter are the top frustrations. Peer-reviewed accessibility research (ASSETS '24) gives the most concrete structural guidance: discrete one-action steps, ingredients grouped by use, consistent naming between list and steps, and per-step time/quantity inline.

### Cited Findings
- **[Vendor study, 2026]** Allspice Labs survey of 354 quality-filtered US/Canadian home cooks (third-party panel, ±4% at 95% CI; sponsored by a vendor selling on-page cooking tools to publishers; respondents not told the sponsor; exact fielding dates not given): 48.6% scroll directly to ingredients, 24.3% click "jump to recipe" first, only 11.3% read most of the article — [Allspice Labs, "What Home Cooks Really Want"](https://www.allspicelabs.com/studies/home-cooks/)
- **[Vendor study, 2026]** Same survey: 70.6% "often or sometimes" avoid recipe sites because they are hard to cook from. Main frustrations: hard to find ingredients or steps 24.1%; ads and pop-ups 19.8%; scrolling clutter 15.8%; timing/doneness uncertainty 11.2%; losing place in steps 9.6%; measurement confusion 6.4% — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)
- **[Vendor study, 2026]** Same survey: 53.6% of those using recipe sites less cite worse site UX vs 21.4% who cite AI tools; only 4.8% primarily cook with AI instead of the recipe page — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)
- **[Peer-reviewed, ASSETS '24]** Li, Wang, Carrington & Kane interviewed 20 cooks with vision impairments + 4 adaptive cooking instructors. Structural preferences that generalise well beyond blind users: separate each ingredient addition and each action into its own step (a change in time or heat starts a new step); group ingredients by when they are used ("grouped together based on usage") or by type (wet/dry); use identical names in the ingredient list and the steps; open with a short overview of the outcome without the story; put a brief key task and estimated time inline in each step ("right there in that step"); group components (sauce, meat, toppings) into logical chunks and flag ingredients used more than once; offer separate browsing (overview) and cooking (step-by-step) modes — [arXiv 2407.19065 / ASSETS '24](https://arxiv.org/html/2407.19065v1)
- **[Official/product, 2025]** Apple News+ Food (iOS 18.4, March 2025, 70,000+ recipes) ships ingredient checklists ticked off while cooking, tapping an ingredient to show the amount needed *for the current step*, tappable durations that start timers, and a full-screen Cook Mode — [Information Today, Sep 2025](https://www.infotoday.com/IT/sep25/Pack--Culinary-Websites-Have-Been-Cooking-Up-New-Features.shtml)
- **[Opinion/Case study]** A Serious Eats recipe-template redesign write-up flagged that the "Jump to Recipe" button did not meet touch-target size requirements, a divider made it look less interactive, and its name was confusing; the author reported internal before/after metrics only (not controlled) — [Serious Eats template case study (Notion)](https://quark-garnet-d76.notion.site/Boosting-Engagement-by-60-on-Serious-Eats-Recipe-Template-1b0e80a20645809a9c74f6d7be7b5ee0)
- **[Opinion]** A practitioner critique argues that stacking a full ingredient list above the instructions creates friction mid-cook and urges usability testing; no formal test reported — [Modus Create, "The user experience on recipe sites is broken"](https://moduscreate.com/blog/the-user-experience-on-recipe-sites-is-broken)
- **[Research catalogue, paywalled]** Baymard maintains a "Recipe Page" design-example benchmark (grocery/meal-kit sites such as HelloFresh, Blue Apron, Sainsbury's, Ocado), but the guidelines themselves are behind Baymard Premium — [Baymard recipe-page examples](https://baymard.com/ecommerce-design-examples/recipe-page)
- **[Research, Baymard grocery]** For grocery flows (relevant to "shop ingredients" CTAs), Baymard's testing found users lose track of what they have already added; it recommends turning a static Add-to-Cart button into a quantity selector once an item is added. Its grocery study logged 700+ medium-to-severe usability issues across Whole Foods, Walmart, Target, Aldi, Instacart and Shipt — [Baymard, grocery add-to-cart buttons](https://baymard.com/blog/grocery-add-to-cart-buttons); [Baymard grocery UX launch](https://baymard.com/blog/grocery-site-ux-launch)

### Inferences
- For an in-app recipe detail page (no SEO incentive), the life-story problem is mostly solved by omission: lead with photo, time, key facts, ingredients and steps; keep any narrative/provenance behind a disclosure. The 11.3% "read most of the article" figure suggests narrative content is low-value on the critical path.
- "Find ingredients and steps fast" plus "don't lose my place" together account for roughly a third of stated frustrations in the Allspice data — layout clarity and place-keeping likely outrank novel features for impact.
- Step-scoped ingredient quantities (Apple News+ Food) and consistent list/step naming (ASSETS '24) are converging, independently evidenced patterns.

### Gaps
- No Nielsen Norman Group article specifically on recipe pages was found.
- Baymard's actual recipe-page guidelines are paywalled; specific recommendations could not be verified.
- No peer-reviewed controlled study of "jump to recipe" links was found; the Allspice figures are self-reported and vendor-sponsored.

## 2. Cook-mode / hands-free UX and research on cooking-assistant interfaces

### Takeaway
Keeping the screen awake is the single most-shipped, best-evidenced cook-mode feature (Betty Crocker 2019–20 data; publisher cook modes in 2024–25). HCI research (CHI '24 Best Paper) shows voice assistants fail in kitchens mainly through lack of task context — they lose track of where the cook is, misinterpret requests and overload with information — so place-keeping, accurate replay of the current action, and state-aware help matter more than raw voice capability.

### Cited Findings
- **[Vendor case study, 2019–2020; classic]** Betty Crocker web "cook mode" (Screen Wake Lock API), 10 Dec 2019–10 Jan 2020: 3.5% of users with compatible browsers turned it on (a top-5 action); sessions 3.1× longer; bounce rate 50% lower; purchase-intent indicators ~300% higher for users who enabled it (group comparison, not causal). Implementation guidance: visible opt-in toggle labelled "Prevent your screen from going dark while you cook"; handle denial (e.g., low battery) by switching the toggle back off; release the lock when the page is hidden; one-hour inactivity timeout reset by scrolling — [web.dev Betty Crocker case study](https://web.dev/case-studies/betty-crocker)
- **[Press, 2024–2025]** Dotdash Meredith publishers (Food & Wine, Simply Recipes, EatingWell) added Cook Mode in late 2024: one click to keep the screen from dimming/locking; many versions also offer reduced clutter, larger fonts and clear step-by-step instructions — [Information Today, Sep 2025](https://www.infotoday.com/IT/sep25/Pack--Culinary-Websites-Have-Been-Cooking-Up-New-Features.shtml)
- **[Peer-reviewed, CHI '24, Best Paper]** Jaber, Zhong, Kuoppamäki, Hosseini, Gessinger, Brumby, Cowan, McMillan, "Cooking With Agents: Designing Context-aware Voice Interaction for Complex Tasks" (DOI 10.1145/3613904.3642183). Analysis of 7 cooking sessions with a commercial voice agent found breakdowns from lack of contextual awareness: irrelevant responses, misinterpreted requests and information overload. 16 sessions with a wizard-led context-aware agent produced more fluent interaction (more complex requests, explicit grounding, social responses). Authors argue for *limited* context awareness as a step to explainable conversational interfaces — [UCL Discovery](https://discovery.ucl.ac.uk/id/eprint/10189212); [KTH project page](https://www.kth.se/profile/sannaku/page/conversational-agents-for-nutrition-advice)
- **[Peer-reviewed, ASSETS '24]** Hands-free control is wanted ("use voice or wave my hand to move the recipe to the next step"); smart speakers were criticised for losing current recipe state; physical play/pause/rewind buttons were easier with wet/dirty hands; recipe apps should restrict touch gestures so users don't accidentally leave the recipe; replay should resume from the relevant action rather than the start of the step; videos should not autoplay audio; timers/completion alerts should sync to phone and smartwatch; participants wanted cues for tasks that can run in parallel — [arXiv 2407.19065](https://arxiv.org/html/2407.19065v1)
- **[Peer-reviewed journal, 2024]** Frummet et al., ACM Transactions on Information Systems, studied expectations of digital assistants (Alexa, Google Home) in kitchens; in a Wizard-of-Oz follow-up an *active* (proactive) assistant policy produced almost double the conversational utterances of a passive policy — [University of Glasgow eprint](https://eprints.gla.ac.uk/326038) (details from search abstract; full text not reviewed)
- **[Workshop paper, IWSDS 2026]** KTH voice cooking companion for older adults living alone: Wizard-of-Oz experiments found instructional-only assistants created frustrating "dead air" during cooking pauses, while "chatty" assistants kept pauses engaging — [IWSDS 2026 paper (ACL Anthology)](https://aclanthology.org/2026.iwsds-1.15.pdf)
- **[Preprint, 2024–2025; submitted to SMC 2025]** SPICE (Prohaska & Castelló Ferrer) projects recipe information onto the cooking surface using tracking + vision LLMs; in a 30-participant study, SPICE users completed recipes with far fewer stops and substantially shorter time than text-based following, but self-reported difficulty barely changed — [arXiv 2412.03551](https://arxiv.org/abs/2412.03551)
- **[Peer-reviewed, DIS 2025]** Chan et al. designed context-aware meal-prep assistance for older adults with mild cognitive impairment (who may forget ingredients, skip steps or leave appliances on); insights organised as routine-based, real-time and situational support, personalised to lifestyle and respecting care-partner collaboration — [arXiv 2506.05663](https://arxiv.org/abs/2506.05663)
- **[Vendor study, 2026]** 9.6% of cooks name "losing place in steps" and 11.2% "timing or doneness uncertainty" as their main frustration — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)
- **[Product/Official, 2025]** Multi-timer naming is now mainstream on smart displays: Google's Gemini for Home documents commands such as a 20-minute timer named "Rice" and a 25-minute timer named "Chicken", plus mid-recipe substitutions — [Google Nest Help: Gemini for Home](https://support.google.com/googlenest/answer/16618650)

### Inferences
- Priority order suggested by evidence: (1) screen-awake with visible toggle and safe release; (2) robust place-keeping (current step persisted, resume to exact step, no accidental exits); (3) step-scoped ingredients/quantities and tappable durations → timers; (4) named, concurrent timers visible outside the app; (5) voice/gesture only after the state model is solid (CHI '24 shows voice without context fails).
- A "mise en place" checklist is implied by Apple News+ Food's ingredient checklists and ASSETS '24's "step through ingredients one at a time, then move into steps" — but no study measured its effect directly.
- Proactive assistance can increase engagement (Frummet) but also risks the information overload Jaber et al. observed; keep proactivity bounded and dismissible.

### Gaps
- No controlled study comparing swipe vs tap vs voice navigation for messy-hands step advancement was found.
- No quantitative evidence on multi-timer error rates or the effect of step-ingredient linking on cooking errors.
- Exact SPICE metrics (stop counts, times, SUS scores) were not available in the abstract.

## 3. Accessibility in the kitchen (large text, low vision, motor, screen readers, cognitive load, reduced motion)

### Takeaway
The strongest 2024 evidence (ASSETS '24) shows recipes are built around visual cues ("until golden brown") that fail blind/low-vision cooks; fixes are content-level (sensory cues, time ranges, explicit sizes/temps) and interaction-level (hands-free, state-preserving navigation, restricted gestures). Cognitive accessibility research (DIS 2025) points to routine-aware, real-time, situational support. Generic standards (WCAG 2.2 target size) still apply.

### Cited Findings
- **[Peer-reviewed, ASSETS '24]** Blind/low-vision cooks copy recipes into plain text, hand-transcribe audio/video, struggle with inaccessible measuring tools, wash hands repeatedly to operate recipe readers, protect devices from mess, and memorise steps to reduce touching the device — [arXiv 2407.19065](https://arxiv.org/html/2407.19065v1)
- **[Peer-reviewed, ASSETS '24]** Content recommendations: replace visual doneness cues with texture, sound and smell ("Caramelized onion smells sweet and nice"); give time ranges and explain how timing affects results; specify pan/patty sizes and placement; "I need specifics, I need temperature, I need time"; include substitutions and alternate methods (bake vs air-fry) inside the step; adjust detail to experience level (newly blind/novice cooks want more); adjustable audio speed/volume; no autoplaying video audio. Future work proposes a database of non-visual descriptors and LLM-generated step summaries — [arXiv 2407.19065](https://arxiv.org/html/2407.19065v1)
- **[Advocacy guide]** American Printing House for the Blind: for many blind/low-vision cooks a smart speaker is the single most useful kitchen tool, but speakers work from the internet rather than the user's own recipe collection, and step-by-step reading can be frustrating — [APH ConnectCenter](https://aphconnectcenter.org/technology/accessible-cooking-apps-for-blind-and-low-vision/)
- **[Press, 2021]** America's Test Kitchen partnered with Perkins School for the Blind: high-contrast text/background choices and ingredient lists/instructions read aloud in demos — [Boston Globe, Nov 2021](https://www.bostonglobe.com/2021/11/30/lifestyle/americas-test-kitchen-perkins-school-blind-partner-make-recipes-accessible)
- **[Student design paper, not peer-reviewed, 2023]** A hands-free recipe assistant ("Yes Chef") caused frustration/confusion for visually impaired users; guidance calls for substantially enlarged text and ≥4.5:1 contrast — [IDSA Repeel paper](https://idsa.org/wp-content/uploads/2023/09/Repeel.pdf)
- **[Peer-reviewed, DIS 2025]** For mild cognitive impairment: risks are forgetting ingredients, skipping steps, leaving appliances on; support should be routine-based, real-time and situational, personalised, and involve care partners — [arXiv 2506.05663](https://arxiv.org/abs/2506.05663)
- **[Official standard]** WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA: pointer targets at least 24×24 CSS px (with spacing exceptions); W3C recommends aiming for the stricter 2.5.5 for important controls — [W3C Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **[Opinion/Case study]** The Serious Eats "Jump to Recipe" control failed touch-target size — [Serious Eats case study](https://quark-garnet-d76.notion.site/Boosting-Engagement-by-60-on-Serious-Eats-Recipe-Template-1b0e80a20645809a9c74f6d7be7b5ee0)

### Inferences
- "Cook mode" doubles as an accessibility mode: large type, one step per screen, high contrast, big targets, no autoplay, gesture restrictions, and screen-reader-friendly step announcements serve both messy-hands and low-vision users.
- Sensory doneness cues + explicit temperatures/times are a content-authoring standard worth adopting for editorial recipes; it also addresses the 11.2% "doneness uncertainty" frustration in the Allspice data.
- Screen-reader users benefit from a per-step summary line (key action + time) read first, with detail after — per ASSETS '24.

### Gaps
- No 2024–2026 study specifically on reduced-motion preferences in cooking apps, or on motor-impairment interaction (e.g., switch control) in recipe apps, was found.
- No evaluation of iOS/Android screen readers reading step-by-step cook modes was found.

## 4. AI features shipped 2024–2026 and documented issues

### Takeaway
Shipped AI is concentrated in (a) import/extraction from social video and photos (Pestle, ReciMe, SideChef), (b) pantry/fridge recognition and meal planning (Samsung Food, Samsung Gemini fridges), (c) general assistants doing recipe walk-throughs, scaling and substitutions (Gemini Live, Gemini for Home, ChatGPT voice), and (d) commerce (Instacart in ChatGPT). Major publishers (NYT Cooking, Allrecipes) showed no confirmed in-app conversational AI. Documented harms are real but mostly anecdotal/press-reported: blended "Frankenstein" recipes in Google AI Overviews, wrong baking times/temperatures, and a 2025 bromism case from an AI salt-substitute suggestion.

### Cited Findings
**Import from social video / photos**
- **[Press, Jul 2024]** Pestle added Instagram Reels import using on-device machine learning — [TechCrunch, 8 Jul 2024](https://techcrunch.com/2024/07/08/pestles-app-can-now-save-recipes-from-reels-using-on-device-ai)
- **[Press, Nov 2024]** Pestle added TikTok import, parsing the video caption (where creators usually put ingredients/instructions) with on-device ML rather than a third-party AI provider — [TechCrunch, 25 Nov 2024](https://techcrunch.com/2024/11/25/pestle-recipe-app-can-now-save-dishes-from-tiktok)
- **[App listing, 2025–26]** Pestle's iOS 26 release advertises on-device Apple Intelligence and meal-plan sections — [App Store: Pestle](https://apps.apple.com/US/app/id1574776971)
- **[Help docs, 2025–26]** ReciMe TikTok import via share sheet with a fallback chain: caption first; if none, detect the recipe from the video's audio; if that fails, find and import the original recipe website — [ReciMe Help: Import from TikTok](https://help.recime.app/en/articles/11625015-import-from-tiktok)
- **[Company press release, Aug 2024]** SideChef RecipeGen AI (beta, 6 Aug 2024) turns a photo of a dish into a step-by-step, shoppable recipe with shopping list — [SideChef press release](https://business.sidechef.com/press-releases/sidechef-announces-recipegen-ai-beta-feature)

**Pantry/fridge recognition and meal planning**
- **[Official, Aug 2024]** Samsung Food at IFA 2024: 6M+ users; AI meal-plan recommendations from preferences/diet/cuisine; "Search with Your Food List" prioritises recipes using ingredients on hand; Samsung Food+ with Vision AI recognises ingredients from phone photos and adds them to the Food List — [Samsung Newsroom AU, IFA 2024](https://news.samsung.com/au/samsung-elevates-food-experience-at-ifa-2024-a-new-standard-in-smart-dining)
- **[Press, 2024]** Samsung Food+ priced at US$6.99/month — [Ubergizmo, Sep 2024](https://ubergizmo.com/2024/09/samsung-ai-food-platform)
- **[Press, Jan 2025]** Samsung 2025 TVs use on-device AI to recognise a dish on screen and find a recipe (Samsung Food on TV) — [TechCrunch, 5 Jan 2025](https://techcrunch.com/2025/01/05/samsungs-new-tvs-can-find-recipes-for-dishes-in-shows)
- **[Press, Dec 2025]** Samsung announced Google Gemini in Bespoke AI refrigerators (CES 2026) for improved food identification and an AI Food Manager that recommends recipes and shopping based on what's inside and what is expiring — [SamMobile](https://www.sammobile.com/news/samsung-brings-google-gemini-bespoke-ai-refrigerators/); [Android Central](https://www.androidcentral.com/phones/samsung-galaxy/samsung-gemini-fridge-ces-2026)

**General assistants as cooking companions**
- **[Official, 2025]** Gemini Live camera/screen sharing: Google's example rescales a YouTube recipe from 2 to 6 servings via "Talk Live about video" — [Google Store magazine: Gemini camera updates](https://store.google.com/magazine/gemini-camera-updates)
- **[Press hands-on, 2024–25]** Android Authority found Gemini Live an "attentive teacher" for beginners but questioned value for confident cooks — [Android Authority](https://androidauthority.com/cooking-with-gemini-live-3497800)
- **[Official, Oct 2025]** Gemini for Home on Nest devices: "what can I make with these ingredients", mid-recipe substitutions, smarter shopping lists, named multiple timers; US early access from late Oct 2025; Gemini Live requires Google Home Premium — [Google Nest Help](https://support.google.com/googlenest/answer/16618650); [Android Authority](https://www.androidauthority.com/gemini-google-nest-smart-home-3674394/)
- **[Press hands-on]** ChatGPT Advanced Voice Mode tested as a hands-free sous-chef for banana bread from improvised ingredients — [TechRadar](https://www.techradar.com/computing/artificial-intelligence/i-tested-chatgpt-advanced-voice-modes-sous-chef-ability-by-baking-banana-bread-heres-how-it-went)

**Commerce**
- **[Company press release, Dec 2025]** Instacart launched the first grocery app inside ChatGPT (8 Dec 2025) with end-to-end shopping and Instant Checkout across 1,800+ retailers; meal ideas → ready-to-review cart — [Instacart investor release](https://investors.instacart.com/news-releases/news-release-details/instacart-app-launches-openai-chatgpt-first-company-offer-new)
- **[Press]** NYT Cooking added a "Shop Ingredients on Instacart" button (June 2024) that can combine multiple recipes into one cart — [Information Today](https://www.infotoday.com/IT/sep25/Pack--Culinary-Websites-Have-Been-Cooking-Up-New-Features.shtml)

**Documented issues**
- **[Press, Nov–Dec 2025]** Bloomberg/Fortune interviewed 22 independent food creators reporting 30–80% traffic declines since AI summaries; Inspired Taste's Adam Gallagher described "Frankenstein" recipes where Google AI combines one publisher's ingredients with another's instructions — untested combinations; an AI summary gave a wrong baking time for a 6-inch Christmas cake — [Fortune, 26 Nov 2025](https://fortune.com/2025/11/26/ai-slop-recipes-thanksgiving-food-blog-collapse-traffic); [Search Engine Land](https://searchengineland.com/google-ai-slop-thanksgiving-food-bloggers-465200)
- **[Press, Dec 2025]** NBC segment: an Alabama Extension food-safety specialist warned AI recipes could lead to chicken cooked to an incorrect temperature — [PPC Land](https://ppc.land/recipe-bloggers-warn-googles-ai-recipes-risk-ruining-holiday-meals/); [Inspired Taste](https://inspiredtaste.net/101454/ai-recipes-harming-trust)
- **[Press, Mar 2026]** Google changed AI Mode recipe results to show an interactive panel with clickable images, direct links and more structured data, widely described as a response to the backlash — [SEO Sherpa](https://seosherpa.com/google-adds-new-visual-elements-for-recipes-in-ai-mode/)
- **[Medical case report via press, Aug 2025]** "A case of bromism influenced by use of artificial intelligence", Annals of Internal Medicine: Clinical Cases (5 Aug 2025): a 60-year-old replaced table salt with sodium bromide after consulting ChatGPT and was hospitalised with psychiatric symptoms; physicians reproducing the query with an older model reportedly got bromide without a health warning — [Live Science](https://www.livescience.com/health/food-diet/man-sought-diet-advice-from-chatgpt-and-ended-up-with-bromide-intoxication)
- **[Press, 2023]** New Zealand supermarket meal-planner bot (GPT-3.5 era) suggested recipes producing chloramine gas and other dangerous items — [Supermarket News NZ](https://supermarketnews.co.nz/news/ai-versus-the-consumer)
- **[Academic survey, 2025]** Ingredient-substitution research survey: recommendation models must be explainable, rely on trusted data/knowledge sources and follow medical guidelines — [arXiv 2501.01958](https://arxiv.org/pdf/2501.01958)
- **[Vendor analysis, counterpoint]** Originality.ai found 2025 holiday recipes largely human-written, and all 39 articles flagged for food-safety issues were human-written — unsafe advice is not AI-only — [Originality.ai](https://originality.ai/blog/ai-holiday-recipes-study)
- **[Vendor study, 2026]** 44% of surveyed cooks would view an AI-generated summary more positively than a human one; 5% more negatively — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)

### Inferences
- The most defensible AI features for a trust-sensitive app are *assistive transforms of known content* (import/structure, scaling, unit conversion, step summaries, substitution suggestions with caveats) rather than *open generation* of new untested recipes.
- On-device processing (Pestle) is emerging as a privacy/cost differentiator for import.
- Substitution and "safe alternative" outputs need guardrails: diet/allergen-aware filtering, explicit "untested" labelling, and refusal for non-food chemicals (bromism case).
- Fallback-chain import (caption → audio → source website) is a pragmatic pattern that preserves provenance by preferring the original source.

### Gaps
- No confirmed 2024–2026 in-app conversational "ask about this recipe" assistant from NYT Cooking or Allrecipes was found; search results for NYT Cooking AI were low quality/unverified.
- No peer-reviewed 2025 study quantifying food-safety error rates in AI-generated recipes was found; the frequently cited "99% of ChatGPT recipes failed" (2023) claim came from an unsourced secondary guide and was excluded.
- No confirmed 2025 Samsung Food app (as opposed to fridge) Gemini integration or social-video import.
- Alexa+ cooking capabilities on Echo Show (2025) could not be verified.

## 5. Platform features (Live Activities/Dynamic Island, Android ongoing notifications, Watch, widgets, assistants, smart displays)

### Takeaway
iOS 26 AlarmKit is the key 2025 change: third-party apps can now run system-rendered timers/alarms with a system-managed Live Activity that can break through Silent/Focus (community write-ups; verify). Live Activities run up to 8 h active (+4 h on Lock Screen). Android 16's Live Updates are promotable ongoing notifications with a status-bar chip, but Google's guidance lists navigation/calls/rideshare/delivery — timers are not explicitly named, so a cooking timer must justify "user-initiated, ongoing, time-sensitive".

### Cited Findings
- **[Official docs]** Live Activities can be active up to 8 hours unless ended earlier; after ending they remain on the Lock Screen up to 4 more hours (12 h total); the Dynamic Island is cleared immediately on end — [Apple: Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities.md); [Apple Developer Forums thread 797676](https://developer.apple.com/forums/thread/797676)
- **[Official docs, iOS 26]** AlarmKit (WWDC25 session 230): apps request authorization via AlarmManager and need an NSAlarmKitUsageDescription; unauthorised alarms don't schedule; the firing alert is system-managed UI; a widget extension renders the countdown/paused Live Activity — [Apple: Scheduling an alarm with AlarmKit](https://developer.apple.com/documentation/alarmkit/scheduling-an-alarm-with-alarmkit.md)
- **[Community write-up, verify]** AlarmKit alarms override Focus and Silent mode; timers are duration-based with always-on countdown UI; presentation has alerting/counting-down/paused states; a missing widget extension for countdown presentation can cause unexpected dismissal — [swift-ios-skills AlarmKit notes (tessl.io)](https://tessl.io/registry/dpearson2699/swift-ios-skills/files/skills/alarmkit/SKILL.md)
- **[Official docs]** Android Live Updates: require `POST_PROMOTED_NOTIFICATIONS`, `setRequestPromotedOngoing(true)`, `setOngoing(true)`, a content title, non-MIN channel; disallow custom RemoteViews, group summaries and colorized notifications; status chip max 96dp, text shown whole if under 7 chars; `setUsesChronometer`/`setChronometerCountdown` show a timer in the chip; user can disable per app (`canPostPromotedNotifications()`); criteria: ongoing, user-initiated, time-sensitive; listed appropriate uses are navigation, calls, rideshare, food delivery; inappropriate: ads, promotions, chat, alerts, quick feature access; don't repost dismissed updates — [Android Developers: Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update)
- **[Press, 2025]** Android 16 introduced `Notification.ProgressStyle` (segments, points, tracker icon); Live Updates were disabled in stable Android 16 and enabled in QPR1 with the promoted-notification permission — [Android Authority, QPR1 Live Updates](https://www.androidauthority.com/android-16-qpr1-live-updates-3573399)
- **[Company engineering blog, 2025]** Just Eat Takeaway reported progress notifications drove a 22% increase in post-order screen views — [JET Tech, Medium](https://medium.com/justeattakeaway-tech/live-updates-and-progress-notifications-for-android-16-at-jet-b0c87eab17b4)
- **[Product, 2025]** Apple News+ Food: tappable durations start timers — [Information Today](https://www.infotoday.com/IT/sep25/Pack--Culinary-Websites-Have-Been-Cooking-Up-New-Features.shtml)
- **[Peer-reviewed, ASSETS '24]** Cooks want timer/completion alerts synchronised to phones and smartwatches — [arXiv 2407.19065](https://arxiv.org/html/2407.19065v1)
- **[Official, 2025]** Gemini for Home supports named concurrent timers and descriptive timers ("set a timer for cooking a soft-boiled egg") on Nest devices — [Google Nest Help](https://support.google.com/googlenest/answer/16618650); [Droid Life](https://www.droid-life.com/?p=323427)
- **[Press, 2017–2019; historical]** Echo Show cooking skills (Allrecipes, Kitchen Stories, Tasty, BBC Good Food "Cook with Alexa") offered voice-navigated steps with on-screen video — [Amazon Alexa blog: Allrecipes skill](https://developer.amazon.com/blogs/alexa/post/4d12d201-e509-4b63-9773-00e8e262b4b3/allrecipes-elevates-skill-for-alexa-with-new-enhanced-visual-capabilities-in-alexa-skills-kit); [The Spoon: Tasty on Echo Show](https://thespoon.tech/alexa-adds-thousands-of-buzzfeed-tasty-recipes-to-echo-show/)

### Inferences
- For iOS cooking timers, AlarmKit (iOS 26+) is likely the most reliable path for audible expiry while the app is backgrounded; Live Activities provide glanceable countdowns (Lock Screen, Dynamic Island, StandBy) within the 8-hour cap, which comfortably covers typical cook sessions.
- On Android, a cooking timer started explicitly by the user plausibly satisfies "ongoing, user-initiated, time-sensitive", but since timers aren't named in Google's list, treat promotion as best-effort and fall back to a standard ongoing notification with chronometer.
- Smart-display assistants (Gemini for Home) now cover generic timers/substitutions; an app's differentiation lies in recipe-specific, step-linked timers and its own recipe collection (APH notes speakers don't access personal collections).

### Gaps
- No 2025–2026 source verified Apple Watch-specific cooking features or widget usage data for recipe apps.
- Siri/App Shortcuts/App Intents patterns for recipe apps were not researched in depth; no usage evidence found.
- Alexa+ (2025) recipe/cooking behaviour on Echo Show could not be verified.

## 6. Engagement/retention patterns and anti-patterns users hate

### Takeaway
Cooked logs, "I made this" photos, collections and meal plans are common but no public retention data proves their effect. Anti-patterns are better evidenced: ads/pop-ups are the #2 stated frustration (19.8%), aggregated reviews show paywall-on-core-content and ads-in-paid-tiers complaints, and Yummly's Dec 2024 shutdown illustrates the cost of no data export.

### Cited Findings
- **[Vendor study, 2026]** Ads and pop-ups: 19.8% of cooks' main frustration; scrolling clutter 15.8% — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)
- **[Aggregator analysis, 2026; weak]** Review-mining aggregators report recurring complaints: apps advertised as free but requiring subscription, recipe libraries and voice-assist gated behind subscription, ads introduced for paid NYT Cooking subscribers, full-screen ads blocking the next step mid-cook on free libraries, import features that mangle ingredient lists; small samples and proprietary methods — [Unstar recipe-app ranking 2026](https://unstar.app/blog/allrecipes-yummly-nyt-cooking-paprika-mealime-recipe-apps-ranked-2026); [Marlvel: NYT Cooking report](https://marlvel.ai/apps/nyt-cooking-quick-tasty-meals); [JustUseApp: CREME reviews](https://justuseapp.com/en/app/1638361026/creme-cook-with-video-recipes/reviews)
- **[Press, 2024]** Whirlpool laid off the entire Yummly team (Apr 2024) and closed the site/apps on 20 Dec 2024; users struggled to save libraries (only some recipes offered PDF download) — [The Spoon](https://thespoon.tech/whirlpool-lays-off-entire-team-for-cooking-and-recipe-app-yummly); [Plan to Eat blog](https://www.plantoeat.com/blog/2024/12/yummly-is-closing-discover-the-best-meal-planning-alternative)
- **[Press, 2025]** Dotdash Meredith launched MyRecipes (Mar 2025) as a hub for 90,000+ recipes across Allrecipes, EatingWell, Food & Wine with save and custom collections — [Information Today](https://www.infotoday.com/IT/sep25/Pack--Culinary-Websites-Have-Been-Cooking-Up-New-Features.shtml)
- **[App listings/vendor blog]** Cooked-history patterns: Moves separates Favorites from a Cooked tab; Deglaze added a private cooking history backfilled from finished sessions; Cooked This/CookDiary log dishes with photo, notes and rating; Farelo keeps a shareable meal timeline. None publish retention data — [Moves help](https://intercom.help/moves-app/en/articles/15706022-how-do-i-save-and-revisit-recipes); [Deglaze blog](https://www.deglaze.app/blog/cooking-history-private-profiles); [Cooked This (App Store)](https://apps.apple.com/us/app/-/id6749899791); [Farelo (App Store)](https://apps.apple.com/us/app/-/id6745767053)
- **[Vendor case study, 2019–20]** Wake-lock users had 3.1× longer sessions and 50% lower bounce (correlational) — [web.dev Betty Crocker](https://web.dev/case-studies/betty-crocker)
- **[Third-party metric]** NYT Cooking unitQ quality score 86 ("good") on 284 reports (30-day average to 16 Oct 2026); categories not public — [unitQ scorecard](https://unitq.com/unitq-scorecards/newyorktimescooking)

### Inferences
- Utility features that make cooking easier (cook mode) show stronger engagement correlations than gamification; no evidence was found supporting streaks for recipe apps.
- A private, automatic "cooked" history (Deglaze pattern) is low-friction and avoids social pressure; "I made this" sharing is optional social layer.
- Data portability (export) is a trust/retention safeguard given the Yummly precedent.
- Interstitial ads or paywall prompts inside cook mode are the most cited hated pattern; keep cook mode free of interruptions.

### Gaps
- No public retention data for cooked logs, streaks, "I made this" photos or meal plans.
- No rigorous study on forced account creation in recipe apps was found; complaint evidence is aggregator-level.

## 7. Trust and safety (food safety, allergens, provenance/editorial review, AI-content disclosure)

### Takeaway
Doneness uncertainty is a top-5 frustration and AI errors on times/temperatures are the main documented food-safety risk, so explicit temperatures/times and sensory cues are both a UX and safety win. EU AI Act Article 50 transparency obligations have applied since 2 Aug 2026, with human editorial review exempting text from labelling and a broad reading of "deepfake" possibly covering realistic AI food images.

### Cited Findings
- **[Vendor study, 2026]** 11.2% cite timing/doneness uncertainty as the main frustration — [Allspice Labs](https://www.allspicelabs.com/studies/home-cooks/)
- **[Peer-reviewed, ASSETS '24]** Cooks want explicit temperature, time and size specifics and sensory doneness cues — [arXiv 2407.19065](https://arxiv.org/html/2407.19065v1)
- **[Press, 2025]** Food-safety specialist warning that AI recipes may give incorrect chicken temperatures; AI summaries giving wrong baking times — [PPC Land](https://ppc.land/recipe-bloggers-warn-googles-ai-recipes-risk-ruining-holiday-meals/); [Fortune](https://fortune.com/2025/11/26/ai-slop-recipes-thanksgiving-food-blog-collapse-traffic)
- **[Medical case via press, 2025]** Bromism after AI salt-substitute advice — [Live Science](https://www.livescience.com/health/food-diet/man-sought-diet-advice-from-chatgpt-and-ended-up-with-bromide-intoxication)
- **[Legal commentary, 2026]** EU AI Act Article 50 transparency obligations applied from 2 Aug 2026; providers must mark synthetic outputs machine-readably (Art. 50(2)); deployers must label deepfakes and AI-generated text published on matters of public interest (Art. 50(4)); text under human review/editorial responsibility is generally exempt from the text-labelling duty; "deepfake" can include realistic AI product images — [Lausen: Section 50(4)](https://lausen.com/en/section-504-of-the-ai-act-what-organisations-must-label-as-ai-content-from-august-2026/); [Fotoware: Article 50 explained](https://www.fotoware.com/blog/eu-ai-act-article-50-explained)
- **[Legal commentary, 2026]** The Commission published a voluntary Code of Practice on transparency of AI-generated content (10 Jun 2026), deemed adequate for Art. 50 (9 Jul 2026); signing does not by itself guarantee compliance — [Jones Day](https://www.jonesday.com/en/insights/2026/06/european-commission-publishes-final-code-of-practice-on-marking-and-labelling-aigenerated-content)
- **[Academic survey, 2025]** Diet/ingredient recommenders should be explainable and grounded in trusted sources and medical guidelines — [arXiv 2501.01958](https://arxiv.org/pdf/2501.01958)
- **[Press, 2026]** Google's response to recipe backlash emphasised direct links and attribution to original creators — [SEO Sherpa](https://seosherpa.com/google-adds-new-visual-elements-for-recipes-in-ai-mode/)

### Inferences
- Provenance labels (author, tested/untested, editorial review status, source link, AI involvement) address the core trust failure exposed by "Frankenstein" recipes, and an editorial-review label may also matter for EU text-labelling exemptions.
- AI substitution features should check against the user's declared exclusions/allergens and flag that substitutions are untested.
- Show safe internal temperatures inline for meat/poultry/fish/egg steps where relevant, with a source.

### Gaps
- The USDA safe-temperature chart pages (FoodSafety.gov and FSIS) returned HTTP 403 during this session, so exact values could not be verified here. Commonly cited USDA values are 165°F/74°C for poultry, 160°F/71°C for ground meats, and 145°F/63°C with a 3-minute rest for whole cuts of beef/pork/veal/lamb and for fish. The writer should verify them at [FoodSafety.gov](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures) before use.
- No 2024–2026 research on allergen-warning UX in recipe apps was found.
- No primary text of the Annals bromism case report was reviewed; details come from press.
- No research on how users perceive "AI-generated" vs "editorially reviewed" badges on recipes was found, apart from the Allspice attitude question (44% positive / 5% negative about AI summaries).
