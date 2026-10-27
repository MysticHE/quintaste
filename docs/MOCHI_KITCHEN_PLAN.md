# Mochi kitchen: new QT chefs and the public kitchen page (proposal, 27 October 2026)

**Status (owner request, 27 Oct 2026):** proposal only; nothing is built or deployed.

- **Role drafts:** [qt-storyteller.md](../ops/qt-team/roles/qt-storyteller.md), [qt-fixer.md](../ops/qt-team/roles/qt-fixer.md) and [qt-safety.md](../ops/qt-team/roles/qt-safety.md). They are not provisioned as Hermes profiles.
- **Related plans:** the [marketing video plan](MARKETING_VIDEO_PLAN.md) and the [Mochi Chef series](MOCHI_CHEF_SERIES.md). The team boundary is in the [QT team README](../ops/qt-team/README.md).

## 1. What it is

The QT bots appear as a brigade of Mochi Chefs on a public web page, at work in one kitchen. Everything on the page comes from things that really happened, so the page doubles as a trust signal. It is also the natural link in bio; where pre-launch viewers sign up is still an open decision in the marketing plan.

**Line:** *Our AI chefs keep the menus fresh. The owner has the last word.* / *AI 小厨师帮我们更新菜单，最后由店主把关。*

Never say the app is "run by bots". Staff handle reports about people, seller suspensions and Dining photo checks. A member reporting a person must never think a bot decided it.

## 2. The brigade

| Chef (page name, proposal) | Bot | Prop | Station | Hours | What the public sees |
|---|---|---|---|---|---|
| Head Chef · 主厨 | QT Manager | Tall toque, tasting spoon | The pass (centre) | Around the clock | Plates checked and sent back, by reason category |
| Scout · 探店 | QT Explorer | Map, magnifier, small backpack | Market door | Around the clock | Places added, and menus, hours and covers updated |
| Wok Chef · 炒锅 | QT Cooker | Wok | Stove | 6–10 pm | New recipes |
| Host · 活动 | QT Event | Clipboard, lantern | Front of house | 6–10 pm | Events listed |
| Artist · 画师 | QT Gamer | Brush, palette | Easel | On request | Count of owner-approved game art |
| Recipe Writer · 写菜谱 | QT Videomaker | Tablet | Recipe desk | When members ask | Count of recipes written for members |
| Storyteller · 说书 (new) | QT Storyteller | Clapperboard | Stage | Daily | Owner-approved 初一/十五 picks and episodes |
| Fixer · 修理 (new) | QT Fixer | Ticket rail, spanner | Ticket rail | Around the clock | "You told us, we fixed it" |
| Safety Chef · 安全 (new) | QT Safety | Food thermometer, checklist | Cold room | Recall check every 2 h | SFA recall notices it read, linked to SFA |

**Art:**

- Every chef is the same Mochi with the same face: closed happy eyes and a small closed smile. Chefs differ only by hat colour, apron and prop.
- QT Gamer draws the variants from `gamer/style.json`, with `assets/chef.png` as the face reference. The owner approves each one with the existing game-art Approve / Reject.
- A resting chef wears a nightcap; the eyes are already closed, so nothing changes on the face.
- **Tickets travel in a text bubble (owner, 27 Oct 2026):** a carrying chef's ticket floats above its head with the chef's hat badge and a tail. At the pass it is set down on the counter front, below the Head Chef, stamped and tucked into the tray, so it never covers a chef (`speech.js`). Mochi still never speaks in the videos.

## 3. The new chefs

### 3.1 QT Storyteller (build first; no app change)

| | |
|---|---|
| Job | 初一/十五 cards, Mochi episode drafts, and the page's diary lines |
| Inputs | Published catalogue rows with checked dates, lunar dates from `src/data/lunar.ts` (which runs through Dec 2028), the day's real counts, template slot limits and the list of live features |
| Output | HyperFrames variables files: English defaults plus a `zh.json` of the same shape. Also a shot list, post text for each channel, and diary lines |
| Tools | None: no web tools and no image or video generation |
| Schedule | Daily, 2–4 pm SGT. Lunar cards are drafted two days ahead, so the owner approves them the day before and posts them in the evening, following the Facebook group's rhythm |
| Approval | One Telegram sheet with Approve / Reject (same pattern as `gamer_requests`). Approved files go to `state/storyteller/approved/` |
| Rendering | On the owner's laptop, where HyperFrames is installed, one browser at a time. Not on the VPS, whose disk was about 83% used at the last check |
| Still to build | Profile, coordinator task builder, Telegram request type, and a 初一 template in `marketing/video` (it does not exist yet; ep01 is the drama) |

**Diary lines** publish without daily approval, but each line must pass a deterministic check: every place name and number in it must appear in that chef's feed items for the day. Lines that fail are dropped.

### 3.2 QT Fixer (needs an additive schema change)

**Job:** route members' place reports to Explorer rechecks; route anything about people or safety to staff.

**Read access:**

- The app's database role can read only `id, subject_id, created_at, kind` of `ops.case_record`, which is least privilege by design. So the bot routes live in the **admin service**, which already reads cases.
- They are signed like `server/bot-signature.mjs`, with a **separate key** from the editorial publisher key.
  - `GET /api/bot/cases?subject=place`: open place cases with the case id, place id, reason, details and date. The `|by:<reporter>` part of `subject_id` is never sent.
  - `POST /api/bot/cases/:id/triage`: adds a note and sets the status to `triaged`. Nothing else: no resolve, no dismiss.

**Notes:**

- `ops.case_note.author_id` must be a staff member. Bot notes need an additive table, `ops.case_bot_note(case_id, bot, body, created_at)`, which the case page shows as "QT Fixer".
- This is a schema change, so it goes through the manual release: backup, a rolled-back dry run with carriage returns stripped, then apply with the operations role.

**Hand-off to Explorer:**

- `state/fixer/rechecks.json`. The coordinator puts these first in Explorer's next Round, ahead of the Veg Kitchen and Mixed Kitchen waves, with the same evidence bar and QT Manager review.
- Closures and diet reports reuse the existing closure and diet-flag flows.
- The outcome comes back from the publication receipt, or from the held result. Fixer then writes the closing note and suggests `resolved`; staff close the case.

**Other details:**

- **Telegram:** one line in the daily summary, such as "Place reports: 3 sent to Explorer, 1 for you".
- **Schedule:** every Round in which new place cases exist. The model runs only then.
- **Privacy:** report text goes to the QT model provider. Update the privacy notice before switching Fixer on (QT-063, consent before AI processing).

### 3.3 QT Safety (when sealed items are live)

**Recall feed:**

- The coordinator fetches SFA's Food Alerts & Recalls RSS feed (`https://www.sfa.gov.sg/rss/annual-listing-food-alerts`) every 2 h, with no model.
- The feed gives only the title (product, brand, pack size), date and link; batch and expiry details are on the linked notice page. For each new item the coordinator stores that page with `web_extract`, then runs the model task.
- The feed showed five alerts between 20 May and 26 Oct 2026, so model calls are rare.

**Market items:**

- A signed app-server route, `GET /api/market/bot/items`, returns live and paused items with these fields: kind, name, description, ingredients, contains, may contain, diets, lot, date mark, category and updated time.
- `GET /api/market/bot/items/:id/label` returns the label photo.
- Mount the routes beside the other bot routers, so the `market` switch does not hide recalls from staff.

**Cases:**

- Cases are filed through the admin bot route, `POST /api/bot/cases`, with subject `market:listing:<id>` and an idempotency key of the notice or problem id plus the item id.
- Recall matches are kind `harm`; scan findings are kind `report`. Severity follows the role file.

**Owner alert:** critical cases also go to the owner on Telegram straight away, with an **Open case** link to admin. There is no Remove button: staff act in admin, where removing an item cancels its open orders and messages its buyers.

**Schedule:** recall checks every 2 h, an item scan daily at 7 am SGT, and Market reports as they arrive.

## 4. The public feed

**Status (27 Oct 2026):**

- **Built:** the builder `ops/qt-team/kitchen_feed.py`, its installer `deploy_kitchen_feed.py` (a 15-minute timer), and the app
  routes in `server/kitchen/router.mjs`.
- **Checked locally:** on throwaway state, with a push to a local server using a throwaway key.
- **Not deployed:** the VPS and the live app are unchanged.

```
receipts and state on the VPS                 app server                        browser
state/publications/*.json  ┐
state/publication-outcomes ├─▶ coordinator builds ─▶ POST /api/kitchen/bot/feed ─▶ GET /api/kitchen/feed ─▶ /kitchen
state/checkpoint.json      │   kitchen-feed.json        (signed, ≤16 KB)            (public, max-age 60)
state/usage.jsonl (role +  │   every 15 min
  time only)               ┘
```

**Allowed sources and what is taken from them:**

| Source | Taken | Dropped |
|---|---|---|
| Publication receipts | Record kind and id, changed field names, publish time | Before/after values beyond counts, source URLs, hashes |
| Publication outcomes | Counts of approved and held by reason category | Proposal text, reviewer text, place names of held items |
| Checkpoint and role windows | Per-chef state and next shift | Queue contents |
| `usage.jsonl` | The role and time of the latest call | Prompts, costs, models, token counts |
| Fixer outcomes | Places fixed after a report, by field | Report text, case ids, anything about the reporter |
| SFA feed | Notice title, date, SFA link | Any Market item or seller |

**Rules:**

1. **Only verified receipts count.** A model's statement, an outbox file or an approved but unpublished batch never becomes a feed item.
2. **30-minute delay.** Each push re-reads live state, the same way `telegram_reporter.verify_current` does, and drops items that were reverted or deleted since.
3. **No people.** No members, sellers, reporters, staff or Market items.
4. **Nothing negative about a business.** Held and sent-back counts carry a fixed reason category only, with no place name. Closures and event cancellations appear as counts only, never as a named "closed" line.
5. **Small.** The last 40 items plus today's counts must stay at or under 16 KB, the proxy's default body limit. That keeps this off the Compose change list.
6. **Fixed wording.** The page renders lines from fixed English and 中文 templates for each item type. Only Storyteller diary lines are model-written, and they pass the check in §3.1.

**Sent-back categories** are mapped by the coordinator, never written by the model: price not on the menu · hours unclear · branch unclear · diet not proven · photo rights unclear · date not confirmed · other.

**Chef states:**

| State | Rule |
|---|---|
| working | The role's window is open, and its last call or tick was within 60 minutes |
| reviewing | Head Chef only: a publication review is running |
| resting | Outside the role's window (Cooker and Event outside 6–10 pm SGT), or nothing has run in 60 minutes. The page shows the next shift |
| waiting | Items are waiting for the owner on Telegram (count only) |

If the feed is more than 2 h old, the page shows *Kitchen update delayed · last update 3 h ago* and freezes every chef as resting. A broken pipeline never looks like busy chefs.

**Example:**

```json
{
  "version": 1,
  "generatedAt": "2026-10-27T08:15:00Z",
  "delayMinutes": 30,
  "chefs": [
    { "id": "scout", "state": "working", "since": "2026-10-27T07:58:00Z" },
    { "id": "wok", "state": "resting", "nextShift": "2026-10-27T10:00:00Z" }
  ],
  "today": { "published": 9, "sentBack": 2, "fixedFromReports": 1, "waitingForOwner": 3 },
  "sentBack": [{ "reason": "price-not-on-menu", "count": 1 }, { "reason": "hours-unclear", "count": 1 }],
  "items": [
    { "chef": "scout", "type": "menu-prices", "at": "2026-10-27T06:40:00Z", "place": "Example Vegetarian", "n": 12, "route": "/menu/example-id" },
    { "chef": "safety", "type": "sfa-notice", "at": "2026-10-26T02:00:00Z", "title": "Recall of …", "url": "https://www.sfa.gov.sg/news-publications/newsroom/…" }
  ],
  "diary": [{ "chef": "scout", "en": "…", "zh": "…" }]
}
```

**Line templates:**

| Type | English | 中文 |
|---|---|---|
| menu-prices | Checked {n} menu prices at {place} | 核对了{place}的{n}个菜价 |
| hours | Checked opening hours at {place} | 核对了{place}的营业时间 |
| new-place | Added {place} to Explore | 把{place}加入了探索 |
| cover | Added a cover picture for {place} | 为{place}添上了封面图 |
| recipe | New recipe: {title} | 新菜谱：{title} |
| event | Listed {title} on {date} | 上架活动：{title}（{date}） |
| fixed | Fixed {field} at {place} after a member's report | 根据会员反馈，修正了{place}的{field} |
| sfa-notice | Read SFA's notice: {title} | 阅读了新加坡食品局的通告：{title} |

## 5. The page

**Address:** a static `/kitchen` page served by the app server, outside the Expo app (which asks visitors to sign in), with `GET /api/kitchen/feed` beside it. It can move to its own domain later without changing the feed.

**Layout (designed for 390 px wide first, and working at 320):**

1. Header: logo, EN / 中文 toggle, and a *Be a tester* or *Get the app* button.
2. Kitchen scene: one illustrated room with each chef at its station and the pass in the centre. Today's counts sit on the pass ("9 plates out · 2 sent back").
3. Ticket rail: the feed, newest first. Each ticket shows the chef icon, the line, the time ("2 h ago") and *Open in app*.
4. How our kitchen works: three short lines. Chefs find and check; the Head Chef checks every plate; the owner has the last word.
5. Footer: *Reports about people are handled by our team. QuinTaste doesn't take payment or check sellers.*

**Motion (owner, 27 Oct 2026: a small game world):**

- **Code:** `server-assets/kitchen/world.js` (the world, rendering and input), `behaviour.js` (walking and tasks), `pose.js` (facing, body and hand motion), `chefs.js` (habits and spots) and `reactions.js` (taps and icons).
- **Art:** a QT Gamer turnaround (front, ¾, side, ¾ back and back; mirrored for the right), one hand sprite and nine face-free hat badges, approved by the owner on 27 Oct 2026. Request: `ops/qt-team/gamer/concepts-kitchen.json`.
- **Walking:** chefs walk the floor and turn step by step through eight directions. They hop as they walk, swing tiny hands and scale with depth.
- **Habits:** each chef has its own.
  - Scout roams and inspects.
  - Wok Chef tosses the wok and fetches from the fridge.
  - Host waves at the door.
  - Artist paints at the lotus picture.
  - Recipe Writer stirs the pot.
  - Head Chef keeps to the pass.
- **Telling chefs apart:** each wears its own badge on its chef hat, seen from every side (owner: on the hat, not the cheek; no faces on the badges). The eyes and smile never change.
- **Real tickets:** the chef carries the slip to the Head Chef, who stamps it.
- **Resting:** off-shift chefs walk to the nap nook under the window (owner, 27 Oct 2026: make it a cosy home). It has the game's coral rug and window plant, three velvet QT Gamer cushions and a bamboo steamer bed (`nook.js`); phones show two beds, wider screens four. Each bed has a plump picture and a matching sat-on picture (`*-sat.webp`, made from the plump one as a reference); all eight approved by the owner on 27 Oct 2026. Owner, 27 Oct 2026: a chef must sit comfortably in its bed, look realistic, and its face must never be hidden. So when a chef sits, the bed swaps to its sat-on picture with a soft squash, the chef sinks into the dent, and the bed's front rim (the sat-on picture masked below the dent) is drawn over the chef's base; the bed springs back when the chef's shift starts. Beds are a little wider than a chef so its sides bulge out round it. Without CSS mask support the rim stays off and the chef sits on top. The Head Chef rests at the pass; joining-soon chefs stay faded where they are; chefs beyond the free beds doze at home.
- **Taps:**
  - A tap gives the chef's signature reaction, then a spin, jump or wave.
  - Four quick taps make the chef dizzy.
  - A sleeping chef stirs with a "z" bubble.
  - Tapping the floor sends the nearest working chef to look.
  - Awake chefs turn to watch the pointer.
- **Reduced motion:** chefs stay home and a tap shows only a bubble.

**Look:** use the app's own tokens: the Coral & Peach palette, Fredoka headings and Nunito body text. Colours come only from CSS variables, and dark mode uses `prefers-color-scheme`. There are no directional accent borders. Tickets use full rounded borders.

**Build:** one HTML file, one CSS file and one small script, with no framework. Sprites are WebP. Aim for under 300 KB on first load. No cookies and no third-party analytics; server logs only.

**Accessibility:**

- The ticket rail is a plain list, and new tickets are not announced.
- Each chef has alt text, such as "Scout, the Mochi chef who checks places".
- Targets are at least 48 px, and the counts are text, not images.

## 6. Build order

| Step | Change | Release |
|---|---|---|
| 1 | Storyteller: profile, task builder, Telegram sheet, 初一 template | Bot only. New Hermes profile added beside the existing ones, leaving them untouched; owner approval required |
| 2 | Kitchen feed builder, `/api/kitchen/*` and the `/kitchen` page; QT Gamer draws the chef variants | App code only, through CI. No schema; under 16 KB, so no Compose change |
| 3 | Fixer: admin bot routes, `ops.case_bot_note`, recheck hand-off, privacy notice | Manual release (schema) |
| 4 | Safety: SFA feed reader, Market bot routes, case filing | App, admin and bot; reuses the step 3 case route |

Nothing is deployed or pushed until the owner asks. Run the existing qt-team suite (`python -X utf8 -m unittest discover -p test_*.py`) before every bot sync.

## 7. Open decisions (owner)

1. Chef page names and their 中文 names (§2 is a proposal), and Mochi's own 中文 name, which is already open in the series plan.
2. Address: `/kitchen` on the current host now, or wait for an own domain.
3. Whether sent-back counts are shown. Recommended: yes, by reason only.
4. Whether SFA notices appear on the page. Recommended: yes, linked to SFA, never tied to Market items.
5. Feed delay. Recommended: 30 minutes.
6. Whether the page carries the pre-launch tester sign-up, which is open in the marketing plan. Collecting emails needs a PDPA notice.
7. Privacy notice wording before Fixer and Safety send report text and item photos to the model provider.

## 8. Not doing

- No transcripts, prompts, model names, usage or costs on the page.
- No chatting with the chefs; the only text bubbles carry real tickets.
- No fake activity: when nothing happened, the chefs rest.
- No member, seller, reporter or Market item details anywhere on the page.
- No new bots just to fill stations. Explorer's tasks show as one chef's activities.
