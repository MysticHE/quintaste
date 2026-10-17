# Swap Pantry Resale for Verified Kitchens

> **Superseded on who may sell (17 October 2026):** after comparing Carousell and Shopee, the owner chose open selling. Any member can open a shop without staff review and sell home-cooked food or sealed shop-bought packs; staff act on reports. The rules, risks and legal questions below still apply.

QuinTaste should retire individual pantry resale and rebuild Market as a pre-order marketplace with two seller lanes: SFA-licensed food businesses, and home-based food businesses (HBFBs) selling food they make themselves. The direction is lawful, feasible for a small team, and aimed at losses Singapore sellers and buyers demonstrably suffer. No rule found obliges a platform to accept individual resellers, SFA expressly leaves HBFB acceptance to each platform, and the Food Safety and Security Act 2025 excludes a reward-earning online intermediary from the definition of a food business. Three corrections make the plan defensible. First, the app can verify identity, licence status and declarations but never "SFA compliance", so every badge must name the check behind it. Second, HBFBs are legal because they are small, so the app must block catering, bulk packed meals, supply to other businesses and resale. Third, money must move from a MAS-licensed payment provider straight to each seller, never through QuinTaste's own account, to stay clear of Payment Services Act licensing. The redesign answers documented problems (doctored PayNow screenshots, hours of DM order-taking, collection no-shows, brands that hide the real kitchen, hidden onion or garlic), but not the one that sank every Singapore home-cook app of 2016: too few sellers and buyers. Launch as a hand-verified, zero-commission pilot built on pre-order drops, pickup slots and payout after handover; automate Singpass, Corppass and ACRA checks next; and defer catering, promoted listings and any platform-run delivery. The payment flow, the HBFB catering threshold and the labelling of sealed home-made goods need a Singapore lawyer or SFA before production.

## The direction is lawful, but no app can verify "SFA-compliant"

Singapore law gives QuinTaste the choice of who may sell. SFA states that HBFBs "currently do not require an SFA licence", that it does not restrict them from selling on delivery platforms, and that sellers must check each platform's own approval requirements ([SFA](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/home-based-food-businesses/requirements-for-home-based-food-businesses)). SFA also says e-commerce platforms acting as intermediaries need no licence, although food law still governs the trades they carry ([SFA](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/online-food-businesses/types-of-online-food-businesses)). The Food Safety and Security Act 2025 (FSSA) excludes from "food business" a business that acts as an intermediary **"for reward"** by providing services "such as an internet service provider or an online auction location" (s 5(3)(a), in force since **28 November 2025**) ([SSO](https://sso.agc.gov.sg/Act/FSSA2025)). A two-lane Market of licensed businesses and HBFBs is therefore a lawful product policy, not a regulatory requirement.

Retiring individual resale also removes a question the paused C2C design could never answer. SFA's online-sales guidance exempts sellers who buy from licensed wholesalers and resell online, but it addresses businesses, not households clearing a pantry ([SFA guidelines, 2021](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)). The FSSA definition already in force covers any supply of food "regardless of whether ... commercial, charitable or community" and even when carried on "on one occasion only" ([SSO](https://sso.agc.gov.sg/Act/FSSA2025)). Read together, an adult reselling a sealed jar arguably runs a food business with full food-law duties, while the platform holds no licence, sourcing record or business identity to check. That reading is an inference, not a ruling, but it means the old lane carried exposure that photos of seals and labels could not remove.

Three parts of the owner's framing need correcting before implementation.

**"SFA-compliant" is not checkable.** For licensed sellers, SFA's Track Records tool confirms that a licence number exists for a named licensee, address and food-business type, shows the SAFE grade and flags suspensions in the past year. It has **no API, no UEN field and no expiry date** ([SFA Track Records](https://www.sfa.gov.sg/tools-and-resources/track-records)). A grade describes past lapses, not today's kitchen: grade A means no major lapse for more than three years ([SFA SAFE framework](https://www.sfa.gov.sg/regulatory-standards-frameworks-guidelines/understanding-the-safety-assurance-for-food-establishments-framework)). For HBFBs there is no register at all. SFA "does not track the number of home-based food businesses as they are not required to be licensed" ([MSE, 14 Oct 2025](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-home-based-food-businesses/)), the WSQ Food Safety Course Level 1 is encouraged but not required ([MSE, 24 Sep 2025](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-home-based-food-business-owners-/)), and SFA tells consumers to "exercise discretion" when buying from home businesses ([SFA](https://www.sfa.gov.sg/news-publications/newsroom/before-2024/news-publications-reply-on-home-based-food-businesses-hbfbs)). Every badge must therefore name the specific check and its date, and none may imply SFA approval of a home kitchen.

**The HBFB lane is lawful only within limits the app must enforce.** HBFBs may not cater (SFA counts **buffet lines and packed meals** as catering), sell to SFA-licensed outlets, prepare food for temporary fairs, sell ready-to-eat raw seafood, or use ingredients bought from other HBFBs or carried back from overseas ([SFA](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/home-based-food-businesses/requirements-for-home-based-food-businesses)). The HDB and URA schemes add that only residents may run the business, with no non-resident employee, no signage, no non-domestic heavy equipment, no frequent loading and no use as a distribution centre ([URA, updated 23 Jun 2026](https://www.ura.gov.sg/guidelines/property-and-business-owners/business-owners/home-business/home-based-businesses/)). SFA's stated reason is capacity: catering or supplying retailers "could lead to them operating beyond the capacity afforded by a home setting" ([SFA, 6 Dec 2024](https://www.beta.sfa.gov.sg/news-publications/newsroom/2024/risk-based-approach-in-regulating-industry)). The FSSA preserves this boundary for when its licensing Part commences. Home takeaway stays non-licensable because the retail classes read "(but not a home)". Catering (First Schedule item 8) and temporary-fair stalls (item 11) carry no home exclusion. Section 104 lets regulations prohibit specified conduct by non-licensable businesses, with a fine of up to **S$5,000** ([SSO](https://sso.agc.gov.sg/Act/FSSA2025?ProvIds=P14-,Sc1-)). Part 4 licensing had not commenced as of 17 October 2026; the Sale of Food Act still drives enforcement, as SFA's 9 October 2026 prosecution of Gourmetz shows ([SFA](https://www.sfa.gov.sg/news-publications/newsroom/gourmetz-pte-ltd-fined--13-000-for-food-safety-lapses)).

**"Licensed only" shuts out some lawful sellers.** SFA licenses premises-based activities. Minimarts selling only prepacked food, online resellers buying from licensed distributors and lower-concern market stalls therefore hold no SFA licence ([SFA](https://www.sfa.gov.sg/food-retail/licence-permit/businesses-that-need-licence-permit-for-food-retail)). Processed-food importers hold a free import registration rather than an establishment licence, so Track Records, which lists licensed establishments, cannot confirm them ([SFA](https://www.sfa.gov.sg/food-import-export/licence-permit-registration)). Excluding them at launch keeps verification simple. A later "registered reseller" lane with document checks is an option, not an obligation. The same SFA page bars licensed businesses from sourcing from unlicensed home or online businesses, so a café may never list an HBFB's cakes under its own licence.

## Documented losses favour the redesign; thin demand killed its predecessors

### Sellers lose money and hours to the DM-and-PayNow workflow

Singapore home sellers typically find buyers on Instagram, WhatsApp or Facebook groups, take orders by direct message, accept a PayNow screenshot and arrange collection. Take App was founded because owners had to "manually respond to and track many WhatsApp conversations" ([Vulcan Post, 2023](https://vulcanpost.com/821127/take-app-simplify-whatsapp-ordering-singapore/)). One home baker's waitlist reached about **3,000** while the founder worked more than 16 hours a day and, under HBB rules, could not hire help ([Vulcan Post, 2020](https://vulcanpost.com/710960/whiskdom-home-baker-singapore/)).

The screenshot step is a documented fraud vector. One customer sent **35 doctored PayNow screenshots** to a Joo Chiat restaurant for S$4,619.90 of food ([Mothership](https://mothership.sg/2023/09/customer-scam-joo-chiat-restaurant-fake-paynow-screenshots/)). Another obtained more than S$9,000 of food over two years ([Malay Mail](https://malaymail.com/news/singapore/2025/11/12/woman-used-doctored-screenshots-to-cheat-singapore-restaurants-of-more-than-s9000-worth-of-food-over-two-years/198138)). SPF counts sellers who hand over goods after fake proof of payment among e-commerce scam victims ([SPF](https://www.police.gov.sg/-/media/SPF/Media-Room/Statistics/Annual-Scams-and-Cybercrime-Brief-2025/Annual-Scam-and-Cybercrime-Brief-2025.pdf)). Delivery platforms bring the mirror problem. A Bishan HBFB photographed a S$64.60 foodpanda pickup order and had CCTV of the customer leaving with it, yet foodpanda deducted a missing-item refund. The seller was left with S$11.59 until the deduction was reversed two days later ([MS News](https://mustsharenews.com/foodpanda-false-refund/)).

Logistics add more losses:

- **No-shows.** One baker moved to allocated collection slots after an order left on her gate was found half-eaten in a stairwell ([Mothership](https://mothership.sg/2020/09/home-baker-order-half-eaten/)).
- **Couriers.** Courier drops cost about **S$10–18**, and GrabExpress does not take cakes ([DollarsAndSense](https://dollarsandsense.sg/business/lalamove-gogox-rydesend-grabexpress-which-delivery-service-home-based-businesses-use/)).
- **Delivery-app commissions.** Vendor comparisons put them at roughly 25–30%, though those comparisons disagree with each other ([Eats365](https://www.eats365pos.com/sg/blog/post/grabfood-vs-foodpanda-sg); [Klikit](https://klikit.io/en/learn/food-delivery-commission-fees-singapore-guide)).
- **Fewer delivery apps.** Deliveroo left Singapore on 4 March 2026, leaving GrabFood and foodpanda as the main apps ([Mothership](https://mothership.sg/2026/02/deliveroo-close/)).

### Buyers fear the kitchen they cannot see and the money they cannot recover

Buyer risk from home kitchens is real but rare. The 2021 Peachy Sugarmaker outbreak from a home business sickened 15 people by the MOH count (a later SFA notice cites 47), and its sales were stopped from 13 August ([MOH](https://www.moh.gov.sg/newsroom/prohibition-of-the-distribution-and-sale-of-food-prepared-by-the-peachy-sugarmaker-pte-ltd/)). SFA recorded six enforcement cases against home businesses in 2024 ([ST via Yahoo](https://sg.news.yahoo.com/home-based-food-businesses-stir-210000014.html)). Yet over five years SFA investigated only about **one suspected HBFB food-poisoning case a year**, and found no causal link ([MSE, 25 Sep 2025](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-food-poisoning-related-to-home-based-food-businesses/)).

Kitchen opacity is a larger documented failure. When SFA cancelled Sakura Buffet's licence in May 2024, it found **12 web brands** supplied by that one caterer, including one called "Vegetarian Buffet" ([AsiaOne](https://www.asiaone.com/singapore/catering-firm-sakura-buffets-licence-cancelled-after-reports-meals-insects-sfa-urges-not)).

Paying upfront is the other fear:

- **Prepayment losses** reported to CASE quadrupled to about **S$1.93 million** in 2024 ([CASE](https://www.case.org.sg/wp-content/uploads/2025/02/Media-Release-CASE-sees-prepayment-losses-more-than-quadruple-in-2024-entertainment-related-complaints-nearly-triple.pdf)).
- **E-commerce scams** were still Singapore's most-reported scam type in 2025, with **6,703 cases and S$16.7 million lost**. Carousell (29.0%) and Facebook Marketplace (22.2%) led, and the typical script is a pre-order paid by PayNow deposit ([SPF](https://www.police.gov.sg/-/media/SPF/Media-Room/Statistics/Annual-Scams-and-Cybercrime-Brief-2025/Annual-Scam-and-Cybercrime-Brief-2025.pdf)).
- **The 2023 mooncake scam** moved buyers from social ads to WhatsApp and then to malicious "payment" APKs. At least 27 victims lost S$325,000 in one month ([SPF](https://www.police.gov.sg/media-hub/news/2023/20230905_police_advisory_on_new_variant_of_scams_involving_the_sale_of_mooncakes)).

For QuinTaste's core users, a vegetarian tag is not enough. A Jain caterer warns that "many spice mixes contain hidden onion or garlic" ([Nalan](https://www.nalan.com.sg/blog/jain-food-catering-menu-guidance)).

Official data shows that verification helps. Marketplaces that check sellers' government ID and offer secure payment saw "significantly fewer" scams, and Meta's ID checks on advertisers coincided with about **38% fewer** Facebook scam cases ([SPF](https://www.police.gov.sg/-/media/SPF/Media-Room/Statistics/Annual-Scams-and-Cybercrime-Brief-2025/Annual-Scam-and-Cybercrime-Brief-2025.pdf)).

| Documented pain | Redesign answer | Solved? |
|---|---|---|
| Fake PayNow screenshots; prepayment scams | Payment confirmed by the payment provider's webhook; no screenshots; payout after handover | Yes |
| Hours of DM order-taking | Menu, pre-order checkout and order dashboard | Largely |
| Collection no-shows | Pickup slots, reminders, no-show policy shown at checkout | Partly |
| False refund claims | Timestamped handover record and a dispute process | Partly |
| Unknown kitchen behind a brand | Lane badge (licensed or home kitchen), licence number, verified identity | Yes |
| Hidden alliums, egg, dairy | Structured ingredients, Contains / May contain, diet-consistency checks, seller-declared labels | Improved, not verified |
| Public legitimacy pressure on HBFBs | Literal badges that never overclaim | Partly |
| High commissions | 0% at launch | For now |
| Courier cost, fragile goods | Pickup first; seller-arranged delivery | No |
| Household-only capacity ceiling | Slot caps smooth demand; the ceiling itself is law | No |
| Finding buyers | Depends on QuinTaste bringing demand | Unproven |

### Earlier home-food apps verified sellers but never captured the order

Singapore has run this experiment before. All three 2016 apps below were free, left price and collection to off-platform negotiation, and have had no coverage since ([Home & Decor](https://www.homeanddecor.com.sg/design/news/3-food-delivery-apps-for-ordering-home-cooked-meals)):

- **Hcook** (about 200 home chefs in November 2016) vetted applicants with a home hygiene visit, made **unannounced monthly revisits** and barred chefs after upheld complaints.
- **Share Food** gave a "Safety Certified" badge to the roughly 40% of cooks who had taken a hygiene course.
- **Heartland Chefs** vetted no one.

Their successors are thin. ManyChef (May 2024) takes Stripe payments, pays sellers by PayNow, accepts orders up to 60 days ahead and filters by a "Vegan" kitchen type, but describes no seller verification ([ManyChef](https://manychef.com/sg/manychef-singapore-launches-food-ordering-platform-featuring-hdb-ura-home-based-food-businesses-hbfbs/)). BlockChef launched with 24 creators against a target of 10,000, and no evidence shows it met that target ([Alvinology](https://alvinology.com/2024/01/09/singaporean-entrepreneur-launches-blockchef-an-online-food-marketplace-empowering-local-home-cooks/)).

Demand is also smaller than the 2020 peak suggests. **31%** of Singaporeans said they bought more from home businesses during Covid-19, but only **14%** expected the habit to last ([Visa](https://www.visa.com.sg/about-visa/newsroom/press-releases/nearly-three-in-four-consumers-in-singapore-shop-online-more-frequently-due-to-covid-19-visa-study.html)). Nobody counts HBFBs, let alone vegetarian ones. "Verified plus vegetarian" is unclaimed positioning, but getting enough sellers and buyers at launch is the main risk.

Overseas, the survivors share a pattern. Shef takes **15%** per order, trains and certifies cooks at onboarding, requires orders at least a day ahead, and closes weekly subscription changes three days before delivery ([Crunchbase News](https://news.crunchbase.com/fintech-ecommerce/andreessen-backed-shef-lands-20m-series-a-to-cook-up-local-food-platform/); [TechCrunch](https://techcrunch.com/2023/03/01/food-marketplace-shef-series-b); [Shef help](https://intercom.help/shef/en/articles/8520084-shef-subscriptions)). DishDivvy paid cooks about 85% of a US$48 average order, let buyers pick pickup times set by each cook's preparation notice, and left delivery to DoorDash ([TechCrunch](https://techcrunch.com/2022/02/23/dishdivvy-serves-up-marketplace-for-on-demand-home-cooked-food)).

The failures are just as consistent:

- **Josephine** spent 90% of its final budget on policy work because home meal sales were not yet legal ([E2C](https://git.medlab.host/e2c/e2c-how/raw/branch/main/content/case-studies/josephine.md)).
- **Holachef** ran its own logistics and lost Rs 24.8 crore on Rs 11.3 crore of revenue ([IndianWeb2](https://www.indianweb2.com/2018/10/ola-owned-foodpanda-acquires-shut-down.html)).
- **Yumist** expanded to a second city too early ([Inc42](https://inc42.com/buzz/yumist-foodtech-startup-shutdown)).
- **Cyberchef's** cooks reported late payments before it stopped ([Entrepreneur India](https://www.entrepreneur.com/article/280813)).

Singapore's permissive HBFB scheme spares QuinTaste Josephine's fight. The lessons that transfer are pre-ordering, mandatory training, no owned logistics, and fast, predictable payouts.

### Free ordering tools cap what QuinTaste can charge

Sellers already have cheap tools:

- **Take App:** the free tier charges 0% commission on up to 50 saved orders a month; the Business plan is US$50 a month ([Take App](https://www.take.app/pricing)).
- **HitPay:** payment fees only ([HitPay](https://hitpayapp.com/blog/hitpay-transaction-fee)).
- **Oddle:** S$0 a month plus 10% per order on its bank-partner package ([UOB](https://www.uob.com.sg/business/digital/digital-transaction-marketing/oddle.page)).

A commission therefore has to be earned through demand and trust, not checkout. The evidence supports free listing and 0% commission for a curated first cohort, with no buyer fee. Commission should rise to roughly 10–15% only once QuinTaste visibly brings orders.

Supply grows through offline and community channels. Singapore's first vegan online grocer "mainly participated in fairs and markets" before opening a shop ([Green Queen](https://www.greenqueen.com.hk/singapores-first-vegan-online-grocer-opens-retail-shop-meet-plant-based-demand/)). The admin-moderated, area-tagged Hawkers United – Dabao 2020 Facebook group gained 25,000 members in two days ([Vulcan Post](https://vulcanpost.com/696286/hawkers-united-facebook-group-singapore/)).

## Two seller lanes need two different kinds of proof

No single API proves a business is SFA-licensed, so the verification stack is free or cheap but partly manual:

- **Myinfo Business** returns government-verified entity data for an authorised Corppass user, but "grants and licenses information are presently not available" ([ask.gov.sg](https://ask.gov.sg/corppass/questions/cm1q0y3qp0011wdnwrhee81ky)).
- **data.gov.sg** no longer hosts any SFA-managed dataset; its old grading datasets return "does not exist" ([data.gov.sg API](https://api-production.data.gov.sg/v2/public/api/datasets)).
- **ACRA entity data** (UEN, name, type, status, address, activity codes) is free in monthly bulk files, last updated **14 October 2026** ([data.gov.sg](https://api-production.data.gov.sg/v2/public/api/collections/2/metadata)).
- **Singpass** charges private organisations nothing for the first **50,000 logins and 5,000 Myinfo transactions a month** per UEN ([Singpass](https://partnersupport.singpass.gov.sg/hc/en-sg/articles/34880999253145-Singpass-Pricing-Model-and-Service-Level-Subscription-FAQ-for-Private-Organisations)). Integration requires QuinTaste to be a locally registered business ([Singpass](https://www.singpass.gov.sg/main/myinfobusiness/faq)). New Myinfo Business integrations must use the FAPI 2.0 Corppass Authorization API ([Corppass](https://docs.corppass.gov.sg/technical-specifications/corppass-authorization-api-fapi-2.0/changelog/myinfo-business-support)).

### Licensed businesses can be checked against government records

| Check | Collect | How QuinTaste verifies | Re-check |
|---|---|---|---|
| Entity | Corppass sign-in through Myinfo Business: UEN, entity name, type, status, registered address, activity (SSIC) codes, authorised person | Myinfo Business returns verified data. Fallback: match a typed UEN against the ACRA open dataset. Reject unless the status is Live | Monthly job against the ACRA dataset |
| SFA licence | Licence number, licence type, each premises address, licensee name, expiry date (from the document), photo or PDF of the licence with its QR code | A reviewer searches Track Records. The licence number, licensee (ACRA name or recorded trading name), address and food-business type must all match. Store the SAFE grade, the suspension flag and a dated screenshot | Monthly; again 4 working days after each licence anniversary, because renewals appear within 3 working days; and on any complaint |
| Activity documents | Food processing establishment licence for prepacked goods made for sale; import licence or processed-food import registration for imported goods | Document review. No public register of import registrations was found | Annually |
| Halal (optional) | MUIS certificate PDF | MUIS Verify returns issued to, issued on and expires on ([MUIS](https://halal.muis.gov.sg/verify)) | Before expiry |
| Payout | Business verification by the payment provider | The provider's own KYB | Provider-driven |

Track Records exports to Excel and PDF but offers no machine interface. Whether its terms allow automated checking was not established, so the safe default is a manual check with saved evidence ([SFA](https://www.sfa.gov.sg/tools-and-resources/track-records)). A SAFE grade C or a suspension in the past year should hold the seller for review rather than reject automatically.

Licence scope should gate listing types:

- **Food Shop or Food Stall licensees** (restaurants, cafés, takeaways, cloud kitchens, bakeries with kitchens) may list cooked and ready-to-eat food prepared at the licensed premises. Each listing shows the licence number and SAFE grade, as SFA encourages for non-prepacked food sold online ([SFA guidelines](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)).
- **Food processing establishments** list prepacked products with full labels.
- **Processed-food importers** list imported prepacked goods once their import registration is on file.
- **Catering** waits for a later phase. Licensed caterers must time-stamp every packed meal with a "CONSUME BY" time no later than **four hours** after the food is ready, plus the caterer's name and licence number ([SFA](https://sfa.gov.sg/docs/default-source/food-retail/guidelines-for-ordering-catered-meals-for-functions-and-events.pdf)).

### Home-based businesses can only be checked for identity and declarations

| Item | Collect | How verified | Shown publicly |
|---|---|---|---|
| Identity | Singpass Myinfo name and registered address | Myinfo from Phase 2. In the pilot: the payment provider's identity verification plus a reviewer call | Trading name; "Identity verified" |
| Residence | Attestation that the seller owns the home, occupies it, or rents it with the owner's consent. Condo sellers confirm their MCST by-laws allow the business | Attestation, compared with the Myinfo address | Area or postal sector only |
| Trading name | UEN, if the seller trades under any name other than their full legal name | ACRA dataset lookup | Trading name |
| Scope | Versioned declarations: own food only; ingredients from licensed or legally imported sources; nothing from other HBFBs or overseas trips; no catering or packed meals for groups; no supply to food businesses or fairs; no non-resident helpers; no signage at home | Signed attestation, listing rules, complaint-triggered review | No |
| Food safety | WSQ Food Safety Course Level 1 certificate | Document review | "Food Safety Course Level 1 on file" |
| Eligibility | Citizen or PR, or the approval a pass holder needs to run a business | Attestation (lawyer to confirm) | No |
| Payout | Individual verification by the payment provider | The provider's KYC | No |
| Never collect | NRIC images, or NRIC numbers as a login or identifier | — | — |

QuinTaste should require the Food Safety Course Level 1 for home sellers as its own policy, and say so. SFA only encourages it. Shef makes training mandatory at onboarding ([TechCrunch](https://techcrunch.com/2023/03/01/food-marketplace-shef-series-b)), Share Food's optional badge reached only about 40% of cooks ([Vulcan Post](https://vulcanpost.com/596880/share-food-singapore-home-cooking/)), and SFA made the Peachy Sugarmaker operator pass the course before resuming sales ([Food Safety News](https://www.foodsafetynews.com/2021/08/home-business-linked-to-outbreak-in-singapore/)).

Product scope follows SFA's lines:

- **Allowed.** Small-scale baking is the URA scheme's own named example ([URA](https://www.ura.gov.sg/guidelines/property-and-business-owners/business-owners/home-business/home-based-businesses/)). No prohibition was found on sauces, frozen dumplings or drinks sold directly to households.
- **Blocked.** Packed meals for groups fall inside the catering ban. The FSSA defines catering by a predetermined food type, **number of people**, time and cost ([SSO](https://sso.agc.gov.sg/Act/FSSA2025?ProvIds=P14-,Sc1-)). Until SFA clarifies, allow individually ordered household portions, and block office runs, event trays, "bento for N pax" and recurring bulk meal-prep subscriptions from home sellers.
- **Business names.** A seller trading under any name other than their full identity-card name must register with ACRA; only individuals using that exact name are exempt ([ACRA](https://acra.gov.sg/docs/default-source/default-document-library/legislation/business-names-registration-act/bnra_2ndreading.pdf)).

### Records the backend needs

| Record | Key fields |
|---|---|
| Seller profile | Lane (licensed or home), trading name, UEN if any, public area, status (pending, active, held, suspended, removed), payment-provider account reference |
| Verification evidence | Check type, source (Myinfo, ACRA, Track Records, MUIS, payment provider, document), values matched, stored artefact, checked at, reviewer, next check due |
| Licence | Number, type, premises, expiry, SAFE grade, suspended flag, last checked |
| Attestation | Version, text hash, accepted at |
| Listing | Kind (made to order or prepacked), ingredients, Contains and May contain allergens, diet declarations, storage, consume-by or date mark, lot ID, lead time, fulfilment options, status |
| Drop and slot | Opens, closes, cut-off, capacity, remaining, pickup windows |
| Order | Items with lot and date mark, slot, fulfilment, state history, payment reference, handover record |
| Review, report, case, recall | Order link, dimension ratings, reason, evidence, decision, timestamps, affected orders |

## QuinTaste stays a light intermediary only if it never holds money, handles food or sells placement

### Food, advertising and consumer law bind sellers, with three triggers for the platform

SFA puts food-safety responsibility on sellers: "a food seller is responsible for the safety of the food it offers for sale" ([SFA guidelines](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)). It expects platforms to support information display, traceability and recall through **SS 687:2022**, a voluntary standard that "applies to online food sellers, e-commerce platforms, and food delivery companies" ([SFA](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/online-food-businesses/requirements-for-online-food-sellers)). In a recall, SFA directs implicated businesses to remove products "from all points of distribution" and treats non-compliance as an offence ([MSE, 25 Feb 2026](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-product-recall---traceability-/)).

QuinTaste keeps its light position only while it avoids three triggers:

1. **Handling food or acting as principal.** Buying and reselling as principal, or packing, storing or delivering food, would likely make QuinTaste a food business outside the s 5(3) exclusion. A lawyer should confirm.
2. **Selling placement.** A platform that charges for the "display, placement or location" of content is treated as "causing or authorising" an advertisement under FSSA s 7, which is already in force ([SSO](https://sso.agc.gov.sg/Act/FSSA2025)). Of the advertising offences, only s 185 (advertising unapproved novel food) is in force today. The strict-liability false-description offence in s 184 follows when the rest of Part 10 commences. Its defences are lost once SFA has written to the platform or the platform "ought reasonably to have known" ([SSO PDF](https://sso.agc.gov.sg/Act/FSSA2025?ViewType=Pdf&_=20251229201918)).
3. **Making diet claims itself.** An auto-applied "Vegan" badge would make QuinTaste the author of the claim. SFA's labelling guide defines neither "vegetarian" nor "vegan", but Food Regulations reg 9 already bans false or misleading statements about a food's composition on labels and in advertisements ([SFA labelling guide](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)).

Consumer law applies to e-commerce as it does offline; MTI described no marketplace-specific duty ([MTI](https://www.meti.gov.sg/newsroom/written-reply-to-pq-on-consumer-protection-for-e-commerce-marketplace)). Two rules shape checkout and reviews now. First, mandatory charges belong in the headline price under the price-transparency guidelines in force since 1 November 2020 ([CCS](https://www.ccs.gov.sg/consumer-protection/legislation-and-guidelines/guidelines-on-price-transparency/)). Second, fake reviews are an active enforcement priority: on **30 September 2026** the regulator announced undertakings from 45 businesses and a fake-review provider ([CCS](https://www.ccs.gov.sg/media-and-events/newsroom/announcements-and-media-releases/ccs-takes-action-against-45-businesses-and-a-fake-review-provider-for-fabricating-online-reviews/)). CASE has asked marketplaces to "authenticate sellers, establish escrows to protect consumers' monies and improve dispute resolution processes". Shopee committed to resolving refunds in 2.5 working days on average, against the seven days CASE recommends ([CASE](https://www.case.org.sg/wp-content/uploads/2023/04/Press-Release-CASE-and-Shopee-sign-MOU-to-better-protect-consumer-rights-through-adoption-of-CASE-framework.pdf)).

### Anti-scam rules set the benchmark; online-safety and privacy law apply now

MHA's Transaction Safety Ratings cover only major marketplaces ([MHA](https://www.mha.gov.sg/e-commerce-marketplace-transaction-safety-ratings/)). The OCHA E-Commerce Code binds only designated services, currently Carousell and Meta's marketplace and advertising products ([MHA](https://www.mha.gov.sg/media-room/newsroom/assessment-of-carousell-and-meta-enhanced-verification-measures-under-the-e-commerce-code-of-the-online-criminal-harms-act/)). Their criteria still define what "verified" means in Singapore ([SPF](https://www.police.gov.sg/-/media/Spf/Advisories/OCHA/COP-for-Online-Communication-Services/COP-for-E-Commerce-Services.ashx)):

- B5: verify sellers "against Government-issued records";
- B6: optional payment protection that releases funds only after delivery is verified;
- an easily accessible reporting channel;
- A5: keep data on scam-linked accounts for at least 90 days.

Meeting these from launch is cheap. Designation is risk-based, so a growing marketplace could later be designated.

The Online Safety (Relief and Accountability) Act took effect on **29 June 2026**. A platform hosting user content must respond reasonably to an Online Harm Notice. Victims of harassment or stalking can escalate to the Online Safety Commission if the platform does not respond adequately within **24 hours** ([MDDI](https://www.mddi.gov.sg/newsroom/the-online-safety-commission-begins-operations-on-29-june-2026-/)). Doxxing is one of the five initial harms ([Allen & Gledhill](https://www.allenandgledhill.com/sg/publication/articles/33139/partial-commencement-of-online-safety-relief-and-accountability-act-2025-and-online-safety-commission-to-begin-operations-on-29-june-2026)), which matters because HBFB pickup addresses are homes.

Privacy rules shape seller verification:

- PDPC guidance bars collecting NRIC numbers or copies unless the law requires it or identity must be verified to a high degree of fidelity ([PDPC](https://www.pdpc.gov.sg/guidelines-and-consultation/2020/02/advisory-guidelines-on-the-personal-data-protection-act-for-nric-and-other-national-identification-numbers)).
- Private organisations must stop using NRIC numbers for authentication by **31 December 2026** ([Baker McKenzie](https://www.bakermckenzie.com/en/insight/publications/2026/02/singapore-pdpc-to-ban-nric-authentication-use-by-end-2026)).
- PDPA penalties reach 10% of Singapore turnover or S$1 million ([CMS](https://cms.law/en/int/expert-guides/the-impact-of-gdpr-in-non-eu-countries/singapore)).

### Money must flow from a licensed provider straight to the seller

MAS treats providers that "process only data (e.g. payment instructions) and not money" as outsourcing, not as regulated payment services ([MAS FAQ](https://www.mas.gov.sg/-/media/MAS/Fintech/Payment-Services-Act/Payment-Services-Act-FAQ-11-May-2020.pdf)). But merchant acquisition can arise "regardless of whether the service provider comes into possession of the money" ([WongPartnership](https://www.wongpartnership.com/upload/EmailEDM/Navigating%20the%20Payment%20Services%20Act.pdf)), and one chambers note records MAS's example that "online marketplace operators offering payment services" need a licence ([Covenant Chambers](https://www.covenantchambers.com/articles/note-on-payment-services-act)). The payment design therefore decides the regulatory burden.

| Model | How money moves | Effect for QuinTaste | Verdict |
|---|---|---|---|
| A. Platform collects | Buyer pays QuinTaste's account; QuinTaste pays sellers | Likely a licensable money-transfer or merchant-acquisition service. Above S$3m a month for one service or S$6m for two, a Major Payment Institution licence with safeguarding is required ([MAS](https://www.mas.gov.sg/regulation/payments/standard-payment-institution-licence)) | Avoid |
| B. Licensed provider, seller sub-accounts | Buyer pays through the provider; the provider settles to each seller; QuinTaste sends instructions and takes commission through the provider | Likely outside the Payment Services Act for QuinTaste (lawyer to confirm) | Recommended |
| C. Direct PayNow | Buyer pays the seller; the app records the order | No licensing, but no refunds, screenshot fraud returns, and the seller's phone number or name is exposed | Reject |
| D. Platform resells as principal | QuinTaste buys and resells | Loses the FSSA intermediary exclusion | Reject |

Buyer wallets or stored credits would add e-money or account-issuance questions, so the app should not offer them.

Two licensed providers fit Model B:

| | Stripe Connect | HitPay Platforms |
|---|---|---|
| Licence | Major Payment Institution from **1 July 2026** ([Stripe](https://stripe.com/en-sg/legal/singapore-disclosures)) | States MAS licence PS20200643 ([HitPay](https://hitpayapp.com/blog/best-payment-solution-online-marketplaces-singapore)) |
| PayNow price | 1.3% ([Stripe docs](https://docs.stripe.com/payments/paynow)) | 0.9% (minimum S$0.20) under S$100; 0.65% + S$0.30 from S$100 ([HitPay](https://hitpayapp.com/blog/hitpay-transaction-fee)) |
| Platform charges | Under "You handle pricing": $2 per monthly active account plus 0.25% + $0.50 per payout; the currency is not stated ([Stripe](https://stripe.com/en-sg/connect/pricing)) | Not published; commission deducted automatically per payment |
| Seller onboarding | Connected accounts need the PayNow capability | Each seller completes HitPay's own verification in its dashboard; not yet available by API ([HitPay docs](https://docs.hitpayapp.com/platforms/overview)) |
| Payout | Hold until handover not confirmed; ask Stripe | Direct to the seller's bank, next business day |
| Refunds and disputes | PayNow refunds up to 90 days; no chargebacks; QR codes expire after 1 hour | Not documented in sources reviewed |
| Fee on a S$40 PayNow order | S$0.52 plus payout charges | S$0.36 |

Pick Stripe Connect if Stripe confirms that Singapore connected accounts can hold payouts until handover under direct or destination charges. That hold is what makes the OCHA B6 and CASE-style buyer protection real. Pick HitPay if next-day payout without a hold is acceptable and HitPay confirms how refunds are recovered after payout. Either way, keep the hold short and predictable, because late payouts preceded Cyberchef's collapse.

### Tax stays the sellers' job until fees pass S$1 million

QuinTaste must register for GST only when its own taxable turnover (commission and fees, not sellers' sales) exceeds **S$1 million** a year, or is expected to within 12 months ([IRAS](https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/gst-registration-deregistration/do-i-need-to-register-for-gst)). No IRAS duty for food marketplaces to report seller income was found. Platform workers keep their own records for five years ([IRAS](https://www.iras.gov.sg/taxes/individual-income-tax/self-employed-and-partnerships/tax-obligations-of-platform-workers/filing-responsibilities-of-platform-workers)), so a downloadable sales statement for each seller is a useful service, not a duty.

## The redesigned Market is a pre-order shop with labels it can defend

### Keep the evidence engine, retire the haggling

The paused build already contains the hardest parts. These carry over:

- the label, seal and date-mark photo set, which serves licensed sellers of prepacked goods directly;
- structured ingredient text with Contains and May contain choices, matched against buyers' avoid lists;
- the seller-declared labelling convention;
- buyer–seller chat;
- reports and disputes routed to the admin case queue;
- feedback.

These retire:

- onboarding of individual sellers;
- offers and haggling, because businesses sell from fixed price lists;
- the seven-day date-mark cutoff, replaced by a firm rule that nothing sells past its date mark;
- the "Bought in Singapore" confirmation, which becomes the sourcing attestation.

The offer, reserve, pickup, handover and feedback flow becomes the order state machine below. Existing individual listings should be delisted with notice, and their exchange records kept under the retention policy.

### Every listing carries structured food facts

Every listing must be at least vegetarian, with no meat, fish, seafood, fish sauce or roe. Vegan, no egg, no dairy, no onion and garlic (five-pungent-free) and no root vegetables (Jain-style) are optional seller declarations. Each must agree with the ingredient text.

| Field | Made to order or cooked | Prepacked | Check the app runs |
|---|---|---|---|
| Name, photos, price including mandatory fees | Required | Required | Price shown with all mandatory fees |
| Portion or net quantity | Required | Required | — |
| Full ingredient text | Required | Required, as on the label | Warns when egg, dairy or honey appears under "Vegan", or onion, garlic, shallot, leek or chives under "No onion and garlic"; asks the seller to confirm compound items such as spice mixes, stocks and sauces |
| Allergens (SFA list: gluten cereals, crustacea, eggs, fish, peanuts, soybeans, milk, tree nuts, sulphites) | Contains and May contain | Contains and May contain | Allergens named in the ingredient text must appear under Contains |
| Storage and consume-by guidance | Required | Date mark required | Delist automatically when the date mark passes |
| Label photo, lot ID, directions for use | — | Required (lot ID and directions mandatory on labels since 30 Jan 2026) ([SFA](https://www.sfa.gov.sg/docs/default-source/food-manufacturing-and-storage/a-guide-to-food-labelling-and-advertisements.pdf)) | Photo legible; lot ID entered |
| Licence number and SAFE grade | Licensed lane | Licensed lane | Copied from verification, not typed per listing |
| Lead time, cut-off, capacity, fulfilment | Required | Required | Caps enforced at checkout |

### Labels the app must and must not show

| Context | Must show | Must not show |
|---|---|---|
| Licensed seller | "Licensed kitchen", licence type and number, SAFE grade where graded, "Checked on SFA Track Records, [date]" | "SFA-approved", "SFA-compliant", "food-safety certified" |
| Home seller | "Home kitchen", "Identity verified", "Food Safety Course Level 1 on file". An info sheet line: "Home businesses don't need an SFA licence", with the course marked as a QuinTaste requirement | "SFA-licensed", "registered", "approved", "inspected", "hygiene certified", "verified safe" |
| Diet | "Vegan · Seller-declared" and similar. "Certified" only with a checked third-party certificate, showing issuer and expiry | "Certified vegan" or "Verified vegan" asserted by QuinTaste; diet badges applied automatically |
| Halal | "MUIS halal-certified", with certificate number, after a MUIS Verify check | "Halal", or the MUIS mark or an imitation, without verification ([MUIS](https://www.muis.gov.sg/halal/about/)); "Muslim-owned" presented as if it were halal |
| Location | Pickup area or postal sector; named public pickup points | Full home address before the order is ready; seller phone number; personal PayNow details |
| Price | Total including mandatory fees; delivery fee next to the price | Fees added only at checkout |
| Reviews | Ratings from completed orders, shown after five ratings, as Facebook does ([Facebook](https://www.facebook.com/help/915385548593204)) | Reviews from non-buyers; reviews selected by the seller; incentivised reviews |
| Promotion | Nothing at launch | Paid "Featured" placement |

### Block these listings and behaviours

| Block | Applies to | Basis |
|---|---|---|
| Catering, buffet, event, corporate, party-tray, "bento for N pax" and recurring bulk meal-prep listings | Home sellers | SFA catering ban; FSSA First Schedule item 8 |
| Wholesale, "for resellers" or café-supply listings | Home sellers | SFA ban on supplying licensed outlets |
| Food for temporary fairs or pop-ups | Home sellers | SFA ban; on 9 Sep 2026 SFA said only that it "will consider" a change ([MSE](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-home-based-food-businesses--participation-in-temporary-fairs/)) |
| Reselling another seller's food; licensed sellers listing home-made goods | All | SFA sourcing rules |
| Food brought back from travel or received by parcel | All | Personal consumption only ([SFA guidelines](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)) |
| Imported goods without an import licence or registration on file | Licensed sellers | SFA import rules |
| Meat, fish and seafood, including ready-to-eat raw seafood | All | Vegetarian scope; raw ready-to-eat seafood is banned for HBFBs |
| Alcohol | All | Online liquor supply needs a licence and age checks ([SPF](https://www.police.gov.sg/media-hub/news/2023/20231118_new_requirements_to_regulate_supply_of_liquor_online_or_through_telecommunication_services)) |
| Health supplements and medicinal claims | All | HSA remit ([HSA](https://www.hsa.gov.sg/health-supplements/overview/)) |
| Novel foods, insects and cultivated proteins without approval evidence | All | FSSA Part 5, in force since 28 Nov 2025 ([Rajah & Tann](https://www.rajahtannasia.com/viewpoints/first-tranche-of-food-safety-and-security-act-comes-into-force/)) |
| Chewing gum, unpasteurised milk, wild mushrooms | All | Shopee Singapore's prohibited list, kept as house policy ([Shopee](https://help.shopee.sg/portal/article/77151)) |
| Prepacked items past or with altered date marks | All | No sale after the date mark ([MSE](https://www.mse.gov.sg/latest-news/oral-reply-to-pq-on-standardising-date-labels-for-food/)) |
| Links, phone numbers, PayNow details or app files in chat and listings | All | Mooncake APK scam; Carousell blocks links and emails in chat ([MHA](https://www.mha.gov.sg/e-commerce-marketplace-transaction-safety-ratings/carousell/)) |

### Ordering runs on drops, slots and a held payment

The order model should mirror how Singapore sellers already work:

- **Lead times** of 4 days to 2 weeks, weekly cut-offs and slot drops ([Eatbook](https://eatbook.sg/home-bakers/)).
- **Festive sales** with "close once full" limits and deposits ([Carousell](https://www.carousell.sg/food-drinks/kueh-raya/q-196/)).

Each seller sets the lead time, the cut-off and a capacity for each drop and each pickup slot. A drop closes when full, and buyers can join a "notify me" list for the next one. There is no on-demand ordering at launch.

Fulfilment is seller-run:

- **Home pickup.** The exact address is revealed only when the order is marked Ready.
- **Public pickup point.** A named location such as an MRT station.
- **Seller-arranged delivery.** The fee is shown beside the price. Sellers must declare chilled packaging for perishable items, because SFA expects hot and cold chains to be kept ([SFA](https://www.sfa.gov.sg/food-retail/businesses-that-currently-do-not-need-licence-permit/food-delivery-businesses/requirements-for-food-delivery-businesses)).

Home sellers also get a per-order quantity ceiling and a per-slot order ceiling. These are QuinTaste policy, to be set after SFA answers the catering question, because SFA has published no number.

Two Stripe PayNow constraints become rules. A PayNow QR expires after one hour, so slot capacity is held for that hour at checkout. Refunds are possible for 90 days, so the pre-order horizon should be capped at 60 days, ManyChef's current limit, which keeps every dispute window inside the refund period ([Stripe docs](https://docs.stripe.com/payments/paynow)).

| State | Entered when | Buyer sees | Money |
|---|---|---|---|
| Paid | The payment provider's webhook confirms payment | "Paid · waiting for seller" | Captured; payout held |
| Confirmed | The seller accepts, or the order is accepted automatically within capacity | Date and pickup slot | Held |
| Ready | The seller marks it ready; the home address is released | Address, slot, reminder | Held |
| Handed over | The seller records the handover time (photo optional); the buyer confirms, or a fixed window passes (start with 48 hours, a QuinTaste policy) | "Collected" | Released to seller |
| Completed | Review window opens | Review prompt | — |
| Cancelled | The seller cancels before handover, or the buyer cancels before the cut-off | "Refunded" | Full refund |
| No-show | The buyer misses the slot and a grace period | The seller's policy, shown at checkout | As that policy states |
| Disputed | The buyer reports within the window | Case number | Payout paused if still held |

### Trust and safety depends on evidence and fast enforcement

**Reviews.** Only completed orders can be reviewed. Ratings cover taste, portion, packaging and "matched the diet label". Sellers can reply. Reviews cannot be gated, filtered by the seller or incentivised.

**Reports.** Report reasons map to clear actions:

- **Wrong diet label:** listing review.
- **Made me ill:** the seller is held pending review, and the buyer is pointed to SFA's feedback form.
- **Scam or payment problem.**
- **Harassment or doxxing:** handled as an Online Harm Notice, with a response inside 24 hours.

**Enforcement ladder.** Warning, then listing removal, then suspension, then removal. Suspension is automatic on an SFA stop or recall direction, and on an upheld illness report, following Hcook's barring rule.

**Recall.** One action delists every listing matching a product and lot, and messages every buyer whose order carries that lot, as SFA asks online sellers to do ([SFA guidelines](https://www.sfa.gov.sg/docs/default-source/food-retail/guidelines-for-selling-food-online-via-e-commerce-platforms.pdf)).

**Disputes.** Resolved within CASE's seven-day benchmark. Data on scam-flagged accounts is kept for at least 90 days, and there is a contact channel for law enforcement.

**Chat.** Chat filters block links, phone numbers and payment details. Allergen questions are never answered automatically.

**Seller terms.** These should make the seller the food business, merchant of record and supplier. Sellers warrant their licence or HBFB status and the accuracy of their diet claims, cooperate with recalls, and indemnify the platform. This mirrors Grab's merchant code, which requires valid licences, hygiene and adherence to customers' dietary instructions ([Grab](https://www.grab.com/sg/terms-policies/code-of-conduct-merchant/)). A lawyer should draft the terms.

### Launch in four phases

| Phase | Sellers | Verification | Ordering and payments | Trust and safety | Move on when |
|---|---|---|---|---|---|
| 0. Prerequisites | None yet | Register QuinTaste with a UEN; open a payment-provider platform account; submit the Singpass and Corppass linkup request | Lawyer confirms the payment flow; seller and buyer terms drafted | Delist C2C listings; written questions sent to SFA | Payment flow and terms signed off |
| 1. Curated pilot | Hand-recruited vegetarian and vegan licensed kitchens and home sellers, found through vegan fairs and community groups | Manual: ACRA dataset, dated Track Records screenshot, documents, Food Safety Course certificate, the payment provider's identity check | Drops, slots, pickup-first; payout after handover; 0% commission; no buyer fee | Block list, gated reviews kept private until five ratings, report queue, harm-notice channel, recall delist-and-notify | One reviewer handles verification and monthly re-checks reliably; repeat orders appear; disputes close within seven days |
| 2. Automate and open applications | Open applications with a waitlist | Singpass Myinfo, Corppass Myinfo Business, monthly ACRA job, re-checks at licence anniversaries | Festive batches and waitlists; seller sales statements; about 10% commission once orders clearly originate on QuinTaste | Public ratings, diet-label enforcement ladder, optional Singpass-verified buyers | Verification stays within service levels at the higher volume |
| 3. Expand with legal review | Licensed caterers | MUIS Verify for halal sellers; optional kitchen visits for a "visited" badge | Catering with a four-hour consume-by stamp; subscriptions for licensed sellers only; courier booking paid by sellers; label photo reading that pre-fills ingredients for the seller to confirm | Promoted listings only after an FSSA s 7 review and with screening of promoted content | — |

## Twelve questions need a lawyer, SFA or GovTech before launch

| # | Question | Why it matters | Ask |
|---|---|---|---|
| 1 | Does a seller sub-account flow, with payouts held until handover, keep QuinTaste outside Payment Services Act licensing, given that merchant acquisition can arise without possession of funds? | Decides the whole payment design | Payments lawyer; payment provider |
| 2 | Does the FSSA s 5(3)(a) exclusion cover QuinTaste, and which activities (buying stock, packing, storage, delivery) would end it? | Food-business status | Lawyer |
| 3 | At what point does a home seller's order become catering or "packed meals": group size, recurring meal-prep, quantity per order? | Sets home-seller caps and the block list | SFA |
| 4 | Are sealed, pre-packed home goods (jarred sambal, boxed cookies) "prepacked", requiring full labels that include the operator's address? | Label rules and home-address privacy | SFA |
| 5 | May QuinTaste check Track Records automatically, and does SFA offer a verification channel, including for import registrations? | Phase 2 automation | SFA |
| 6 | Is QuinTaste a consumer-law "supplier" of sellers' claims, and what warranties, indemnities and insurance should seller terms require? No insurance requirement was found | Liability for false diet claims | Lawyer; insurance broker |
| 7 | What do FSSA ss 7, 184 and 188 require before selling promoted placement? | Future revenue option | Lawyer |
| 8 | Which online-safety duties, notice forms and response times apply to a small platform's reviews and private chat? | Operational staffing | Lawyer |
| 9 | Which data protection officer, retention, Myinfo-attribute and address-disclosure rules apply? | Handling seller identity and home addresses | Lawyer |
| 10 | Can work-pass and Dependant's Pass holders sell as home businesses, and what proof should the app collect? A law-firm guide says work-pass holders generally cannot be sole proprietors and Dependant's Pass holders need a Letter of Consent ([CNP Law](https://www.cnplaw.com/cnplaw-business-guide-series-the-solo-business-owner/)) | Seller eligibility | Lawyer or MOM |
| 11 | May a private marketplace use Singpass Myinfo and Myinfo Business for seller onboarding, and are sole proprietors covered? | Phase 2 automation | GovTech |
| 12 | Can a home kitchen obtain MUIS halal certification? | Whether home sellers get a halal field at all | MUIS |

Two regulatory changes need ongoing monitoring. The FSSA's licensing Part and any s 104 "prohibited conduct" regulations could turn today's HBFB guidance into offences; the government expects traceability duties for key distribution nodes "by 2028" ([MSE](https://www.mse.gov.sg/latest-news/written-reply-to-parliamentary-question-on-product-recall---traceability-/)). Separately, HSA's July 2026 consultation proposed mandatory notification of health supplements, with obligations phasing in from 2028 ([NutraIngredients](https://www.nutraingredients.com/Article/2026/07/02/singapore-regulator-proposes-mandatory-health-supplements-notification/)).

## Conclusion

The redesign changes what Market is. It stops being a classifieds board where trust rested on photos of seals, and becomes a commerce product whose trust rests on government records, captured payments and structured food facts. The key design fact is the gap between the two lanes. Licensed kitchens can be checked against Track Records and ACRA, but home kitchens only against identity and their own promises. The home lane's safety therefore comes from what happens around each sale: held payouts, gated reviews, diet-label reports and fast suspension. QuinTaste's defensible edge is not discovery, where Instagram and free order tools already serve sellers. It is answering the vegetarian, five-pungent-free or Jain buyer's real question (what is in this, and who made it) with data no competitor structures.

The regulatory direction favours this design. FSSA regulations look set to turn today's HBFB guidance into offences, and a block list built now already anticipates them. The NRIC deadline at the end of 2026 rewards a Singpass-first, NRIC-free verification design. The one unproven assumption is demand, and the cheapest way to test it is a small curated pilot. Everything expensive (Singpass integration, commission, catering, promotion) should wait for that result.
