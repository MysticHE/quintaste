# Staff content console (18 October 2026)

Live since release **20261018-content-admin1** (app, preview and admin). See the deployment runbook entry for verification and rollback.

The admin console's **Content** section (`/console/content`) replaces the old Editorial review page. Staff can open every post members see, edit QuinTaste-owned content and hide or restore anything. Owner, operator and reviewer roles hold the `content` capability. Every change needs a reason (at least 10 characters), a security-key check within the last 5 minutes, and is written to `staff.audit` as `content.<kind>.<action>` with target `<kind>:<id>`.

## What staff can do

| Tab | Source | View | Edit | Hide / restore | Other |
|---|---|---|---|---|---|
| Places & menus | Packaged catalogue + QT Manager overlays; staff-created places | Details, hours, photo, every dish, member reports, staff history | Name, branch, address, postal code, other names, map point, diet, allium-free claim, hours, photo (upload); each dish's name, category and price | Place (hides its menu and reviews); single dishes | Add places and dishes; revert to original; delete staff-created places |
| Recipes | 18 bundled recipes, QT Manager recipes, staff-created | Full recipe | Everything: name, description, cuisine, time, servings, categories, one pot, diet, contains, ingredients, steps, timers, photo, sources | Yes | Add recipes; revert; delete staff-created |
| Events | QT Manager external events, staff-created | Full event | Every field | Yes | Add events; revert; delete staff-created |
| Place reviews | Members | Text, rating, photos, open reports | Never (member words) | Yes (author still sees it) | — |
| Gatherings | Members | Details, seats, organiser reports | Never | Yes (stops new joins; organiser still sees it) | — |
| Market | Members | Items with photos, ingredients, labels; shop review text | Never | Remove item (cancels open orders and tells buyers) / restore (returns paused); hide or restore review text | Shops stay in Market sellers |

## Staff edit wins

Owner decision (18 October 2026): a staff edit overrides packaged and bot content until staff clear it. The bot never writes `content.item`; staff never write the editorial store. The console flags **Newer data below** when the packaged or bot record changed after the staff edit (the edit stores the original's hash in `data.base`). Place saves keep only fields that differ from the original, so bot updates to untouched fields still reach members.

## Data contract

`server/content/schema.sql` (apply with the operations role after a backup):

- `content.item(kind place|menu|recipe|event, id, origin edit|staff, hidden, data jsonb, version, updated_by, updated_at)`. Writes check `version` so two staff cannot overwrite each other.
  - place edit: changed fields plus `base`; `photo: null` / `hours: null` clear them. A staff place carries all identity fields plus `sourceUrl`, gets an id `staff-<slug>-<random>`, and appears in Explore only once it has a dish.
  - menu: `{ items: { "sectionId/itemId": { name?, category?, price?, hidden? } }, added: MenuItem[], base }`. Added dishes form an "Added by QuinTaste" section sourced from the place's source link.
  - recipe / event: the complete record plus `base`. Bundled recipe edits reach the app through `GET /api/editorial/staff-recipes`; bot and staff-created recipes and events through the existing `/api/editorial/*` lists.
- `content.asset(sha256, bytes, width, height)`: photos uploaded in the console, re-encoded by sharp (metadata stripped, at most 1600 px, under 690 KB) and served at `/api/catalogue-photos/<sha256>.jpg` after the packaged and bot photo folders.
- Member moderation columns: `community.place_review.hidden_at/hidden_reason`, `social.gathering.hidden_at/hidden_reason`, `market."order".review_hidden`.
- Places withdrawn through the old Editorial review (`ops.content_decision`) were migrated to hidden staff items, so they can now be restored. `ops.content_decision` is no longer read.

## Where it is applied

- Expo routes: `src/server/staff-content.ts` (10-second cache; a failed read reuses the last copy for 5 minutes, then fails closed) feeds `venue-catalogue.ts` and `menu-delivery.ts` (`/api/catalogue`, `/api/menus`).
- Express: `server/staff-content.mjs` feeds `server/editorial/router.mjs`, `server/catalogue-places.mjs` (reviews and place reports accept staff places, refuse hidden ones), and member hide filters in place reviews, gatherings and shop reviews.
- The console reads packaged and bot content before staff changes from `GET /api/staff-base` on the app's internal port 3001 (`CONTENT_INTERNAL_PORT`). The public port answers 404 for that path and Traefik never routes to 3001.
- Uploads and content edits go through `/api/content/*`, which has its own Traefik router with an 8.25 MB body limit (`deploy/admin.compose.yml`); other staff routes keep 32 KB.

## Not covered

Staff cannot rewrite member posts, Market shops (use Market sellers) or Social people/groups. Native-device appearance of staff-edited content is unverified.
