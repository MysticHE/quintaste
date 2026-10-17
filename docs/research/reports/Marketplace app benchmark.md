# Marketplace App Benchmark for the Market Redesign

**Date:** 17 October 2026. **Scope:** UI/UX patterns from Carousell (primary), Facebook Marketplace, Mercari, Vinted, OLIO, Too Good To Go (TGTG), Shopee and Depop, plus Singapore food-sale rules, applied to QuinTaste's sealed-pantry Market. This report is not legal advice.

**Method:** official help centres, app-store listings, company posts, government pages and design critiques, plus live inspection of carousell.sg mobile web at 375 px on 17 October 2026 (home, a "vegan" search, one food listing) and Vinted's catalogue text. Carousell's and TGTG's help centres returned HTTP 403 to direct fetches; those claims rest on search-indexed excerpts of the official pages. Third-party claims are marked *(secondary)*.

## Key findings

- **The deal sits on one sticky bar.** Carousell pins Share, Make Offer and Chat to the bottom of a listing; Report hides in a ⋮ sheet; no safety paragraph appears.
- **Safety is contextual and short:** a one-line banner, chat badges, a Singpass tick and chat filters, not prose.
- **The deal state lives in chat.** After an accepted offer, Carousell shows Reserve, Mark as Sold and Leave Feedback at the top of the chat.
- **Food apps are weakest where QuinTaste is strongest.** TGTG disclaims allergens, OLIO Singapore bans food sales, and no app offers structured ingredient data. SFA says a clearly legible label photo "will suffice", and under the Food Regulations food may not be sold after its "Use by" or "Best Before" date (MSE, Feb 2024).

## Comparison table

| App | Card anatomy | Offer and status | Feedback | Food and trust specifics |
|---|---|---|---|---|
| **Carousell** | Seller and time posted above a square photo; overlay badge; 2-line title; price with struck-through old price; condition; heart with count (observed) | Offer field plus Make Offer/Chat on the listing; Reserve and Mark as Sold in chat after acceptance; Sold cannot be undone | Reviews exist only after a completed deal (observed) | Singpass blue tick; chat badges; links and emails blocked; SG bans expired and opened food |
| **FB Marketplace** | Photo-led grid | Default availability question; Meta AI drafts replies from the listing (Mar 2026) | Two-way ratings, public after 5+ ([FB help](https://www.facebook.com/help/915385548593204)) | Seller summary: time on Facebook, history, ratings ([TechCrunch](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages/)) |
| **Vinted** | Favourites count, brand/title, "Bumped" label, condition, price plus "incl." protection price (observed) | Offers from the listing or chat, up to 40% below; non-binding until Buy now ([help](https://www.vinted.co.uk/help/258-i-want-to-make-an-offer-or-suggest-a-different-price)) | 1–5 stars within 4 days; automatic feedback ([help](https://www.vinted.co.uk/help/14-feedback-star-ratings)) | Verification badge; message spam filter ([safety](https://www.vinted.co.uk/safety)) |
| **Mercari** | Photo grid | Accept/decline/counter within 24 h *(secondary)* | – | AI listing from photos since Sep 2024 ([OpenAI](https://openai.com/index/mercari)) |
| **Depop** | Square photos | Make Offer beside Buy; Send Offer to likers; 24 h expiry; over 40% of items sold via offers ([Depop](https://news.depop.com/depop-community-embraces-offers-as-suite-of-negotiation-tools-expands/)) | – | Shop stats dashboard (Jun 2025) |
| **OLIO** | Photo-first; date visible in the photo | Request → pickup slot | – | SG: allergens from packaging, "say so rather than guessing"; food is free only |
| **Too Good To Go** | Pickup window and items left always visible | Reserve → "Swipe to redeem" at collection | Multi-question rating after pickup | Vegetarian/vegan filter; no allergen guarantee |
| **Shopee (C2C)** | Product grid | Seller tabs Live / Sold out / Violation / Delisted / Unpublished *(secondary)* | Order ratings | SG food must carry a use-by/expiry date and be sealed ([help](https://help.shopee.sg/portal/article/77151)) |

## 1. Browse and home

- **Search first, then categories.** Carousell's mobile home stacks a pinned search bar, a one-line banner ("Stay safe from ticket scams"), a promo carousel, an "Explore Carousell" grid of illustrated category icons in two scrolling rows, a "Fresh Finds" feed and a floating **+ Sell** ([carousell.sg](https://www.carousell.sg/), observed).
- **Filters are chips in one row.** Carousell search shows Category, Sort, Delivery, Condition, Price, Buyer Protection, Free delivery and More filters, then a result count and a **Save this search** toggle ([search](https://www.carousell.sg/search/vegan/), observed). TGTG filters by diet (vegetarian/vegan), availability (include sold out), collection day/window and category ([TGTG help](https://tgtg.zendesk.com/hc/en-us/articles/28718009988498-How-do-I-use-filters-to-find-the-right-food-for-me)). Its radius and time sliders update the map live ([Pratt 2024](https://ixd.prattsi.org/2024/02/design-critique-too-good-to-go/)).
- **Card anatomy converges.** Square photo; one overlay badge; price in bold with a struck-through old price when reduced; 2-line title; one attribute line (condition or size); heart. Carousell shows seller and relative time above the photo. Vinted discloses paid promotion as "Bumped" and shows the fee-inclusive price (observed). For food, the useful "condition" is the **date mark**, which TGTG and OLIO keep visible.
- **Cold start is a supply problem, not a UI one.** OLIO "works best when a large number of people in a small area are active in posting food", and it seeded supply with about 11,000 volunteers ([CNN](https://money.cnn.com/2017/05/19/smallbusiness/olio-food-waste-share)). Carousell turns a thin search into an alert with Save this search. Showing sold-out stock confuses users: TGTG's "popular today" lists sold-out shops ([Pratt 2024](https://ixd.prattsi.org/2024/02/design-critique-too-good-to-go/)).

## 2. Item detail

- **Layout (Carousell, observed):** full-bleed photo with ⋮ (sheet: Share, Report); breadcrumb; title; price; **Details** (condition, listed N days ago); description; **Deal method: Meet-up** at named public points (a bus stop, an MRT station); **About this seller** card (verified tick, rating, review count, years on Carousell); reviews.
- **Sticky bottom bar:** Share icon, **Make Offer** (outline), **Chat** (filled primary).
- **Seller trust is compact:** rating, count and tenure, not prose. Facebook (Mar 2026) summarises tenure, listing history, item types and ratings atop the seller page ([TechCrunch](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages/)).
- **Food facts stay visible.** TGTG keeps pickup time, location and items left in view while scrolling ([Pratt 2026](https://ixd.prattsi.org/2026/02/design-critique-too-good-to-go-mobile-app/)); its weakness is missing ingredient detail ([Pratt 2024](https://ixd.prattsi.org/2024/02/design-critique-too-good-to-go/)).

## 3. Listing creation

- **Photo-first, with AI fill.** Carousell: "Take a photo and our AI fills in the title, description and price" ([App Store SG](https://apps.apple.com/sg/app/carousell-snap-sell-chat-buy/id548607187)). Carousell reports a median listing time under two minutes and 20% more items listed ([Google Cloud](https://cloud.google.com/customers/carousell); company claim). Facebook's March 2026 tool turns a photo into a draft and suggests a price from "similar items in the area" ([TechCrunch](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages/)). Mercari has generated titles and descriptions from photos since September 2024 ([OpenAI](https://openai.com/index/mercari)).
- **Fields stay minimal.** Carousell asks for up to 10 photos, category, title, price, condition, description and deal method *(secondary)*. Vinted allows up to 20 photos and asks for the most specific category, brand ("No brand" allowed), condition and price. It runs an automated compliance check that usually takes about a minute and bans duplicate listings ([Vinted help](https://www.vinted.co.uk/help/375-uploading-step-by-step)).
- **Food rules (OLIO):** the date must be readable in the photo without opening it; only same-date items share a listing; quantity is a field; pickup falls before any use-by date; a "List for" duration ends the listing ([10 steps](https://help.olioapp.com/article/226-10-steps-to-create-the-perfect-olio-listing)). In Singapore, listers refer allergen questions to the packaging and say so when unsure rather than guess ([OLIO SG](https://help.olioapp.com/en/articles/13545770-singapore-personal-listings-what-can-and-can-t-be-shared)).
- **TGTG disclaims ingredients:** bags "will contain statutory allergens"; buyers are sent to the label's "Allergy Advice" ([example](https://www.toogoodtogo.com/en-gb/find/norwich/morrisonssupermarket/groceries/groceriessurprisebag-52959)).
- **Takeaway:** QuinTaste's four evidence photos (item, label, seal, date) are its equivalent of AI autofill; capture them first.

## 4. Seller management

- **Status actions:** Carousell offers Mark as Sold from ⋯ (no undo; contact support) and Mark as Reserved via Edit; reserved and sold listings stay on the profile but take no new chats or offers ([sold](https://support.carousell.com/hc/en-us/articles/115006245027-How-do-I-mark-my-listing-as-sold), [undo](https://support.carousell.com/hc/en-us/articles/115006245087-How-do-I-undo-mark-as-sold-option-for-my-listings), [quota](https://support.carousell.com/hc/en-us/articles/16770732375193--Malaysia-Category-based-listing-quota-for-selected-goods-categories)).
- **Tabs:** Shopee splits Live / Sold out / Violation / Delisted / Unpublished, each with a distinct next action *(secondary, [Ginee](https://ginee.com/my/insights/how-to-delete-product-shopee/))*.
- **Promotion and stats:** Carousell Bump costs Coins ([Bump](https://www.carousell.sg/bump-education/l/)); Vinted labels bumped items publicly. Depop's June 2025 Shop stats show sales, potential earnings and listings; views unlock only with paid Boost ([Depop](https://www.depop.com/blog/depop-product-release-june-2025/)). Facebook sellers can request ratings from inventory or chat ([FB](https://www.facebook.com/help/2976188062670725)).

## 5. Chat, offers and inbox

- **Offers are chat events.** Carousell's chat lets users "complete a transaction by making or accepting an offer in the chat itself", with read receipts and typing indicators ([Sendbird](https://sendbird.com/resources/carousell)). Vinted allows **Make an offer** from the listing or the conversation. A seller's counter-price is visible only to that buyer, and acceptance is not binding until purchase ([Vinted](https://www.vinted.co.uk/help/258-i-want-to-make-an-offer-or-suggest-a-different-price)).
- **Expiry keeps queues honest.** Depop and Mercari offers lapse after 24 hours ([Depop](https://news.depop.com/depop-community-embraces-offers-as-suite-of-negotiation-tools-expands/); Mercari *(secondary, [OneShop](https://oneshop.com/blog/mercari-offers))*). Depop's 2025 test of binding offers was reportedly rolled back after sales fell *(secondary, [ExportYourStore](https://exportyourstore.com/blog/depop-binding-offer))*.
- **Canned first messages:** Facebook's buyer default asks about availability; since March 2026 Meta AI drafts seller replies from price, description and pickup location, with preview/edit/disable ([TechCrunch](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages/)). Auto-answers are a poor fit for allergen questions.
- **Inbox:** Carousell added an **unread chats** filter *(secondary, APKMirror release notes)*; no official source confirmed a Buying/Selling split.
- **Handover confirmation:** TGTG disables pickup with a countdown, then requires "Swipe to redeem" in front of staff; orders end "Picked up" or "Pickup not confirmed" ([TGTG](https://www.toogoodtogo.com/en-gb/how-to-collect-too-good-to-go); [Pratt 2026](https://ixd.prattsi.org/2026/02/design-critique-too-good-to-go-mobile-app/)).

## 6. Trust and safety

- **Meetup guidance is short and points to a place.** MHA's Carousell advisory: well-lit public places, no large sums of cash, pay only after receiving the item, keep messages on the platform ([MHA](https://www.mha.gov.sg/e-commerce-marketplace-transaction-safety-ratings/carousell/)). Carousell's listing shows named public points (a bus stop and an MRT station) rather than advice text (observed).
- **Enforcement sits in the chat layer.** Carousell warns users who share personal details, blocks emails and links, and shows New User / Not Verified / Verified Business badges in chat. Its Singpass blue tick is optional ([MHA](https://www.mha.gov.sg/e-commerce-marketplace-transaction-safety-ratings/carousell/)). Vinted automatically blocks suspicious message content ([Vinted](https://www.vinted.co.uk/safety)).
- **Reviews are gated.** Facebook ratings run both ways and go public after five; Meta does "not verify" purchases ([FB](https://www.facebook.com/help/915385548593204)). Vinted allows 4 days, with automatic positive feedback on silence and negative on cancellation ([Vinted](https://www.vinted.co.uk/help/14-feedback-star-ratings)). Carousell ties reviews to completed deals; after Mark as Sold, users "will not be able to exchange reviews" ([Carousell](https://support.carousell.com/hc/en-us/articles/115006245027-How-do-I-mark-my-listing-as-sold)).
- **Prominence:** block and report sit under ⋯; safety is one line or a badge, never a listing-page paragraph.

## 7. Singapore rules (uncertain; not legal advice)

- **No SFA licence for pure resale; food law still applies.** Sellers who buy from licensed wholesalers or importers and resell online need no licence but remain subject to the Sale of Food Act and Environmental Public Health Act ([SFA guidelines, 20 Sep 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf), FAQ i). Food must come from "SFA-regulated sources" ([SFA, updated 19 Feb 2025](https://sfa.gov.sg/food-retail/online-food-businesses/requirements-for-online-food-sellers)). **Uncertain:** the guidance addresses businesses, not individuals reselling household surplus.
- **Labels online.** Prepacked labels give name, complete ingredients including allergens, net contents, local operator and origin. Sellers are "encouraged" to show this on listings; a clearly legible label photo "will suffice" (¶13–14, FAQ iii).
- **Recalls.** SFA recommends recording batch and expiry, and on recall removing affected listings and contacting buyers (¶18–19).
- **Date marks.** Under current Food Regulations, "Use by" and "Best Before" both indicate the expiry date, beyond which food "is not permitted to be sold in Singapore" ([MSE, 7 Feb 2024](https://www.mse.gov.sg/latest-news/oral-reply-to-pq-on-standardising-date-labels-for-food/)). QuinTaste's provisional seven-day cutoff is stricter. OLIO SG lets members **give away** shelf-stable food past a best-before date, but that is free sharing, not sale.
- **No resale of overseas purchases.** Food brought back by travellers or received by parcel post is "strictly for your private consumption. You are not allowed to sell them", including "via online platforms" ([SFA, updated 3 Nov 2025](https://www.sfa.gov.sg/bringing-food-for-personal-use-from-overseas/general-rule-to-bring-food-into-singapore-non-commercial)). This supports keeping the **Bought in Singapore** confirmation.
- **Home-based food businesses.** These currently need no SFA licence, but they must source ingredients from licensed suppliers and may not use other home businesses as suppliers ([SFA, updated 4 Aug 2026](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/home-based-food-businesses/requirements-for-home-based-food-businesses)). Homemade food should stay out of this Market.
- **Food Safety and Security Act.** Passed 8 Jan 2025; Tranche 1 (novel/GM food, non-packaged water) took effect 28 Nov 2025; later tranches are undated ([SFA](https://www.sfa.gov.sg/legislation/food-safety-and-security-act)). Search excerpts suggest its "food business" definition covers home businesses and excludes some intermediaries: **unverified against the statute**; monitor.
- **Platform rules.** Carousell SG bans expired, opened or partly consumed food and food with prohibited substances ([Carousell SG](https://support.carousell.com/hc/en-us/articles/360025851813--Singapore-List-of-Prohibited-Content)). Shopee SG (16 Jul 2026) requires a use-by/expiry date and tamper-evident sealing, and bans medicinal claims, unpasteurised dairy, wild mushrooms and chewing gum ([Shopee](https://help.shopee.sg/portal/article/77151)). OLIO SG bans selling "anything edible".
- **Action:** confirm individual resale with SFA (ask.gov.sg/sfa) before production launch.

## Recommendations for the Market redesign

The tags show what each item depends on: **[Local]** can ship now on device storage; **[Backend]** needs the deferred database, accounts or live chat; **[AI]** needs a server AI service. All items assume 48-unit targets, semantic tokens, short status labels and no explanatory paragraphs.

### Now

1. **Sticky action bar on detail [Local]:** buyers get **Make offer** (secondary) + **Message** (primary); owners get **Edit** + **Manage**. Replaces the in-flow "Chat With Seller".
2. **⋯ bottom sheet [Local]:** Share, Report and Block in one sheet; the toolbar keeps Save and ⋯ only. Removes the inline action panel.
3. **Swipeable evidence gallery [Local]:** Item · Ingredient label · Seal · Date mark with a 1/4 counter, replacing the link-button row; label opens uncropped full-screen.
4. **One "Food facts" block in fixed order [Local]:** date mark with time left ("Best before 12 Mar 2027 · 21 weeks"), Sealed, Bought in Singapore, Contains / May contain chips, ingredient text, label photo. Hide owner-only "needed" placeholders from buyers.
5. **Tighter card [Local]:** square photo, price, 2-line name, one meta line (pickup area · date mark), at most one overlay badge (owner status). Drop "Sealed" on buyer cards; every eligible listing is sealed, so it would repeat on every card.
6. **Structured pickup [Local]:** a public-place picker (MRT stations, bus interchanges, like Carousell's named meet-up points) plus date and time replaces free text; the picker is the safety cue, so no advice copy is needed.
7. **Deal card pinned in chat [Local]:** current stage (Requested → Reserved → Pickup set → Handed over) with **one** primary next action; offers as chat events with inline Accept/Decline. Replaces the stacked panels.
8. **Photo-first listing form [Local]:** 2×2 capture grid (Item, Label, Seal, Date mark) first with a "3 of 4 photos" label, then Name/Price/Quantity/Pickup, Ingredients, Confirm. A disabled Publish lists what is missing ("Needs date mark photo").
9. **Simpler My Listing [Local]:** chips Active / Reserved / Drafts / Ended (Paused, Sold, Unavailable as overlays); per-card ⋯ Manage sheet (Edit, Reserve, Mark sold, Pause/Resume, Delete); an "Ends in N days" label near the seven-day cutoff.
10. **Inbox [Local]:** Buying / Selling segment and unread dots.
11. **Empty browse [Local]:** "No listings yet" with **Sell an item** routed to My Listing +; samples stay behind their own chip.
12. **Prohibited-item guard at publish [Local]:** block opened, homemade, chilled or frozen items, chewing gum and medicinal claims, with short reasons.

### Next

13. Accounts, a database and live chat for real listings, read state and push notifications **[Backend]**.
14. Offers that expire after 24 hours and are non-binding until handover, with automatic release of reserved quantity **[Backend]**.
15. Seller card with rating, count and member-since, plus Singpass-verified and New-user badges in chat **[Backend]**.
16. Two-way ratings with a short window (Vinted uses 4 days), shown publicly only after a threshold (Facebook uses 5) **[Backend]**.
17. Server chat filters that block links, emails and phone numbers, warn when personal details are shared, and route reports to staffed moderation **[Backend]**.
18. A recall workflow (match product and batch, delist, notify buyers) and Save search alerts **[Backend]**.

### Later

19. Read the label photo with OCR to prefill ingredient text and suggested Contains tags, with the seller confirming each tag. Never auto-answer allergen questions in chat **[AI]**.
20. Price guidance from comparable listings, and Depop-style listing stats **[Backend]**.
21. Do not adopt: paid bumps, like counts as social proof before real volume, AI auto-replies, or opaque "surprise" bundles.

## Gaps and confidence

- **Lower confidence:** Mercari offer rules, the Shopee tab names, Carousell's unread filter and Depop's binding-offer rollback come from secondary sources.
- **Not observed:** the Carousell, Facebook and Mercari native apps were not inspected. Carousell observations come from mobile web.
- **Unresolved:** SFA's position on individuals reselling pantry surplus, and later FSSA tranches.
