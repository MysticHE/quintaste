# Member recipes and shop links (18 October 2026)

Owner request: let members share recipes from Cook, and let an author who sells on Market link a recipe ingredient to their own Market item, so buyers can tap straight through to that item.

## What members see

- **Author (Cook > My Recipes > recipe):** the editor adds a **Category** choice (up to two), and under each ingredient a quiet **Link Shop Item** row. The row appears only when the author has items on sale in their own shop. It opens a picker of their items on sale, with a **Suggested** group (name match) above the rest. A linked line shows the item card with Unlink. Items that can't be linked are shown disabled with the reason: already linked to another line, or not declared vegan in a Vegan recipe. A linked item that is paused shows "Paused · Hidden from buyers"; a removed one shows "Unavailable".
- **Publication Review:** **Submit For Review** sends the draft, its photos and links. The status line reads one of: Private draft, Ready to submit, In review, Not approved (with the staff note), Published, Published · Update in review, Published · Update not approved, Hidden by QuinTaste, each with "· Changes not submitted" when the device draft is newer than what was sent. **Remove From Cook** withdraws it. For a signed-in member, deleting a draft or clearing the device collection (Privacy) first withdraws those drafts' recipes from Cook; if that fails (offline), nothing is deleted. Unticking a consent on a submitted draft starts a new revision, so later edits always show as "Changes not submitted".
- **Buyers (Cook):** published member recipes join Cook browse, search and categories. On the recipe page, a linked ingredient line ends with a small accent label (shop icon + price). It appears only while the viewer can open and buy that item: it is on sale, the shop is live, neither side has blocked the other and Market is switched on. Tapping it opens that exact Market item; Back returns to the recipe. When the author's shop is live, one line under the photo reads **By <author> · <shop>** and opens the shop. Recipe info shows "Member recipe · Ingredient claims are the author's", sponsorship when not None, and **Report Recipe**. Cook mode and Shopping have no labels.

QuinTaste does not check that a seller used their item in the recipe. Market's existing rules still apply ("QuinTaste doesn't take payment or check sellers").

## Server

- `server/recipes/` (`router.mjs`, `rules.mjs`, `published.mjs`, `schema.sql`), mounted at `/api/recipes` behind `featureGate('recipes')`. Reads admit guests; writes need a signed-in, DOB-checked, unrestricted member and a trusted origin (shared `communityRouter`).
- `GET /api/recipes?q=&category=&cursor=`: published recipes, 20 a page. `GET /api/recipes/member-<uuid>`: one recipe, with `shop` on linked ingredient lines visible to this viewer and the author's live shop. `GET /api/recipes/photos/<uuid>/<cover|step-N>`: live photos only.
- `GET /api/recipes/mine`, `PUT /api/recipes/mine/<draftId>` (submit; photos up to 2 MB per request, re-encoded and stripped; resubmitting the same revision while it is in review returns 409, so staff always publish what they opened), `DELETE /api/recipes/mine/<draftId>` and `DELETE /api/recipes/mine?keys=a,b` (withdraw). Withdrawal stays available while the `recipes` control is off.
- Rules checked on the server: rights and policy confirmed, diet, 1–2 categories, sponsorship, 1–40 ingredients, 1–30 steps, no links/emails/phone numbers/PayNow, vegetarian ingredients only, no egg/dairy/honey in a Vegan recipe unless the line names a plant-based version, cover photo required. Links: at most 10, one ingredient per item, only the author's own items that are on sale or paused, and a Vegan recipe only links items declared vegan. 20 submissions a day, 40 shared recipes per member.
- Reports: `POST /api/community/reports` accepts `kind: 'recipe'` for published recipes (subject `recipe:member:<uuid>`) into the existing case queue.
- Schema `recipes.recipe` keeps a `live` version and a `pending` version (`pending_state` review/declined), so a published recipe stays up while an update waits. `recipes.photo` keeps each version's photos. Rows cascade on account deletion. New control `recipes` is inserted **disabled**; staff turn it on in Operations.

## Staff

Admin **Content > Member recipes** (`admin/src/lib/content-member-recipes.ts`, `components/content/MemberRecipes.tsx`): In review / Published / Declined / Hidden. Each card shows the author, diet, categories, sponsorship, photos, ingredients, steps, open reports and each linked shop item with its price and status. Actions need a reason and a recent security-key check, and are audited as `content.member-recipe.<publish|decline|hide|restore>`. Publish checks the submitted revision, so a newer resubmission is never published unseen. Decline needs a note (shown to the author). Staff never edit member wording.

## Deployment

Schema change: back up, then apply `server/recipes/schema.sql` with the operations role (after community, market and content schemas), deploy app and admin images together, then enable `recipes` in Operations. Rollback: previous images; leave the tables.

## Evidence and gaps

Local API check (`.local/member-recipes/api-report.json`): 31 checks against Docker `quintaste-dev-db` with the retained Alice/Bob accounts, staff publish/decline/hide run under the `quintaste_admin` role. Browser check on a local web export at 375 wide: a guest sees the price label only on the linked line and the author/shop line, the label opens the exact item and Back returns to the recipe, and the recipe appears in Cook. Signed in as Alice, the editor shows Link Shop Item, the picker suggests the matching item, linking shows the card with Unlink, and a Vegan recipe disables the non-vegan item with its reason. Fixtures removed afterwards; accounts kept. Not covered: the admin console UI in a browser with a staff security key, physical devices, and production.
