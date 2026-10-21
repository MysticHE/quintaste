# Cooker creator library, nutrition-first recipes, international claims and Event sources — plan (21 October 2026)

Owner request, 21 Oct 2026: build a real database library of vegetarian and vegan recipe creators across the platforms where they
publish, prioritise recipes whose nutrients we can derive, show health benefits from international standards (not only HPB), and
widen QT Event. This plan records the owner's decisions, the data model, the five phases and the limits. Status: **Phase 1 built
and checked locally (21 Oct 2026); nothing deployed.**

## Phase 1 as built (21 Oct 2026)
- Schema `server/creators/schema.sql`: `creators.creator`, `creators.channel`, `creators.recipe_source`, view `creators.score`; seeds
  the 26 trusted creators (3 Singapore, 18 Asia, 5 worldwide) with their websites. Applied twice to the local dev database cleanly.
- Server: `server/creators/bot-router.mjs` mounted at `/api/creators/bot` (`POST /library`, `POST /sources`, signed); the signature
  check moved to `server/bot-signature.mjs`, shared with the AI recipes bot routes. A recorded page never moves backwards (published
  stays published unless withdrawn; a shortlist or rejection never replaces a draft) and keeps its first recipe id. 12 local route
  checks pass.
- Admin: Catalogue > Creators (`admin/src/lib/creators.ts`, `admin/src/components/content/Creators.tsx`): Active / Paused /
  Blocked / To invite, search, add, edit, pin, pause, block, channels, invite flag; every change audited. Checked in the local console.
- Bot: `ops/qt-team/creators_client.py`; Cooker reads the library (best creators lead the shortlist and get the ranking boost,
  written pages and blocked hosts are skipped) and records every page it shortlists, rejects, drafts or sees published. When the app
  cannot serve the library, Cooker keeps today's behaviour (checkpoint pages and the trusted list). 237 bot tests pass; the Python
  client was checked against the Node routes locally.
- Release order: the schema file stops the CI deploy (schema gate), so it ships as a manual release: backup, apply the schema with
  the operations role, deploy the app, then `deploy_veg_kitchen.py` for the bots (the bots also run safely before the schema).

## 0. Owner decisions (21 Oct 2026)

| Question | Decision |
|---|---|
| Platform access | Use the open-source crawlers that work without an account (owner asked for open-source crawling, set up effectively). See §2 for what that covers. |
| Health benefits | Register-backed only: international authorised claims plus vegetarian and vegan "nutrients to watch" education. No disease wording (the 19 Oct rule stands). |
| Creators | Credit and link now; invite creators later (every creator carries an invite flag; outreach needs the owner's approval of the message). |
| Region | Singapore and Asia first, then worldwide. |

Unchanged rules that apply throughout: five pungent vegetables excluded as the author wrote the recipe (owner, 17 Oct); the recipe bar
(4.5 stars from 20 ratings, 30 minutes, 12 ingredients, 8 steps, everyday Singapore ingredients; owner, 18 Oct); recipes are adapted in
our own words with credit and a link; members' text never names a social platform (owner, 21 Oct, AI recipes); bots never sign in,
create accounts, solve CAPTCHAs or bypass a challenge page.

## 1. Why

- Cooker searches from scratch every round, and in 8 evening rounds it redrafted the same two pages 7 and 5 times (fixed 21 Oct,
  baf07f4). A library lets it start from known good creators and remember every page.
- Most top-rated Asian recipes use garlic or onion, so few pages pass the bar. Knowing which creators publish allium-free food
  (Buddhist vegetarian, Jain, Woon Heng, Tzu Chi) raises the pass rate.
- Nutrition figures exist only when ingredients are measured. Ranking measurable recipes first makes the Cook nutrition badges cover
  more recipes.

## 2. Platform access: what works and what we use

Checked 21 Oct 2026 (sources at the end).

| Platform | Tool | Works without an account? | Use |
|---|---|---|---|
| Creators' websites | Existing recipe-page reader (`recipe_quality.assess`, schema.org Recipe) | Yes | **Main recipe source** (rating, times, ingredients, sometimes nutrition). |
| YouTube | YouTube Data API v3 (official, free daily quota) + yt-dlp (already on the VPS) for descriptions and captions, no video download | Yes (API key) | Channel search, subscriber counts, video descriptions and captions. |
| Instagram | Instaloader (maintained, v4.15.3, Jul 2026) | Yes, public profiles | Profile name, bio, followers, external link, recent post captions (many hold the full recipe). Slow pace, no login. |
| TikTok | yt-dlp metadata for a known public video link | Yes, per link | Description and stats of videos we already have a link to (from the creator's site or link page). No search crawling. |
| TikTok (search) | TikTokApi (davidteather) | Needs a session cookie, a browser and usually proxies; TikTok flags it as a bot | **Not used**: it works by getting past TikTok's bot detection. |
| Xiaohongshu, Douyin, Bilibili, Weibo | MediaCrawler | Needs logged-in accounts; its disclaimer forbids commercial use | **Not used.** Creators there are reached through their blog or YouTube. |
| Facebook | No maintained tool | — | Page link recorded only. |
| Link pages (Linktree and similar) | Existing page reader | Yes | Finds a creator's other channels. |

Pace limits (proposed): Instaloader at most 200 profiles a day with a pause between requests and a 24-hour stop on any block (same
rule as Google Maps); YouTube within its free quota; yt-dlp at most 300 links a day. Every fetch goes through the existing egress
guard and is logged.

## 3. Data model (Phase 1)

New schema `creators` in the app's PostgreSQL (additive, repeatable, applied by hand with the operations role after a backup).

- **`creators.creator`**: id, name, kind (person / organisation), country, languages, diets (vegan, vegetarian, five-pungent-free,
  Buddhist, Jain), cuisines, region rank (Singapore, Asia, worldwide), website, status (active / paused / blocked), pinned,
  invite (not-yet / ready / invited / declined), notes, source of discovery, created and updated times.
- **`creators.channel`**: creator, platform (website, youtube, instagram, tiktok, facebook, xiaohongshu, pinterest, other), handle,
  url, followers, posts, last checked, checked by (scout / staff), and the page that showed it.
- **`creators.recipe_source`**: page key (host + path), url, creator, platform, recipe name, Cooker recipe id, status (shortlisted /
  rejected / drafted / held / published / withdrawn), bar result and reasons, nutrition coverage (share of weight matched), first and
  last seen.
- **`creators.score`** (view): per creator, recipes passed, published and held, average nutrition coverage, last success.

Access: staff read and edit through the admin console (capability `content`); the bot reads and writes through signed routes like the
AI recipes bot (`/api/creators/bot/*`), never directly. No personal data beyond what the creator publishes as a public profile.

## 4. Phases

### Phase 1: creator library (this release)
1. `server/creators/schema.sql` (tables above) and the server module with staff and bot routes.
2. Admin > Content > Creators: list with search and filters (region, diet, platform, status), creator page with channels and recipe
   sources, edit, pin, pause, block, invite flag.
3. Seed: the 26 trusted creators (`ops/qt-team/trusted_creators.json`) and the recipe pages Cooker has already drafted or published.
4. Bot client: Cooker records every shortlisted, drafted and published page in `recipe_source` (replaces `recipeSources` in the
   checkpoint, which stays as the fallback while the server is unreachable).

### Phase 2: creator scout (weekly)
- A new scout stage (QT Cooker profile, outside the 6–10 pm recipe window, about 20 minutes a week) finds creators by web search
  ("vegetarian recipe Singapore", "素食 食谱", "Buddhist vegetarian recipes", "Jain recipes", "vegan Malaysian"), link pages and
  YouTube search, Singapore and Asia first.
- Fills channels and counts with Instaloader, the YouTube Data API and yt-dlp; marks diets from the creator's own words.
- Ranks creators: recipes that passed the bar, share of measurable recipes, allium-free share, region, recency. Weak creators drop to
  paused after three months with no passing recipe.

### Phase 3: Cooker uses the library and ranks by nutrition
- The shortlist searches the top creators first (their sites, channels and recent captions), then the open web.
- Ranking adds **measurability**: at least 90% of the ingredient weight matched to the nutrition database
  (`server/nutrition`), or a published nutrition panel. Unmeasurable recipes ("a handful", "to taste" for main items) rank last.
- Ranking adds **nutrient value**: recipes that are a source of iron, calcium, protein, fibre, zinc, iodine, omega-3 (ALA), B12 or
  vitamin D rank higher.
- Recipes from Instagram captions or YouTube descriptions count when they give measured quantities; they are credited to the creator
  and rewritten in our own words.

### Phase 4: international health claims
- An allow-list file of authorised claims with the nutrient condition each needs and its register:
  - EU Regulation 1924/2006 and the EU register of authorised health claims (EFSA-assessed), the strictest list.
  - US FDA nutrient content claims (percent Daily Value) and authorised health claims.
  - FSANZ Standard 1.2.7 (Australia and New Zealand) food-health relationships.
  - Health Canada nutrient content and function claims.
  - Codex CAC/GL 23-1997 as the shared template; HPB stays as Singapore's list.
- Each recipe shows a claim only when it meets that register's nutrient condition per serving, with the register named. A claim
  allowed by one register but not another is shown with its register (for example "EU: iron contributes to normal formation of red
  blood cells").
- **Nutrients to watch** (education, not claims), from the Academy of Nutrition and Dietetics position on vegetarian diets, the
  British Dietetic Association and The Vegan Society: B12, iron with vitamin C, calcium, iodine, zinc, omega-3 ALA, vitamin D and
  protein. A recipe that is a good source of one links to the short explainer.
- Excluded everywhere: disease, weight-loss, "detox", "alkalising", "boosts immunity" or "anti-inflammatory" wording, scores and
  "healthy" as a bare word.

### Phase 5: QT Event
- **Organiser library** on the same model (`creators.creator` with kind organisation and a role of event organiser, or a sibling
  table if staff prefer them apart): channels, posting cadence, track record.
- **Sources**: Eventbrite (official API), Peatix, Meetup, OnePA community-centre courses, NLB events, cooking schools, vegan cafés
  that run workshops, Buddhist temples and societies, the vegetarian and vegan societies.
- **Recurring events**: an official recurrence rule ("first Saturday of the month") becomes dated occurrences for the next 90 days,
  rechecked monthly.
- **Festival lookahead**: the lunar table (`src/data/lunar.ts`) drives searches before Nine Emperor Gods, Vesak, Guan Yin days and
  the 1st and 15th of each lunar month.
- **Member tips**: "Suggest an event" files to the staff case queue; Event verifies it before listing.
- **Schedule**: while Explorer is stopped, Cooker and Event run every round in the 6–10 pm window instead of every other round.

## 5. Guardrails
- No sign-in, account creation, CAPTCHA solving, proxies or bot-detection workarounds on any platform.
- Public data only; a creator can ask to be removed (staff block), and blocked creators are never searched again.
- Recipes always rewritten in our words, credited and linked; photos never reused without permission.
- Every claim traces to a register entry and a computed nutrient level; the allow-list version is recorded per release.
- Deploy only when the owner asks; schema changes are applied by hand after a backup.

## 6. Open items for the owner
- A YouTube Data API key (Google Cloud project with the YouTube Data API enabled), stored on the VPS outside the code. Needed for
  Phase 2.
- Approve the outreach message before any creator is invited.
- Confirm the pace limits in §2.

Sources: [Xpoz: open-source social media scrapers, what still works in 2026](https://www.xpoz.ai/blog/guides/open-source-social-media-scrapers-what-still-works-2026/),
[MediaCrawler](https://github.com/NanmiCoder/MediaCrawler), [MediaCrawler login guide](https://instagit.com/NanmiCoder/MediaCrawler/how-to-use-cookie-based-login-in-media-crawler/),
[TikTok API overview](https://getlate.dev/blog/tiktok-api).
