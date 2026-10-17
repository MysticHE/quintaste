# Greendot branch-specific menu sources — proposal, 18 October 2026

Checked about 2:45 am SGT on 18 October 2026. **This is a proposal only:** no published menu,
section `sourceUrl`, publisher, bot code or VPS state was changed. The exact per-branch data is in
[`data/menu-research/greendot-branch-sources-2026-10-18.json`](../../data/menu-research/greendot-branch-sources-2026-10-18.json)
(repository-root-relative). Live app revision `aadde24d8ea9…`: 13 Greendot venues, 25 menu sections
(12 ordering + patisserie pairs, plus Jewel ordering only).

## What was established

1. **The recorded sources are the right official channel, but not every way of reading them is branch-specific.**
   Greendot's own outlet list on `orders.greendot.sg` names all 13 of our branches with the
   *exact* StoreIDs we record, and pickup is enabled for all 13. Asia Square and J8 have delivery
   disabled. Jewel appears as "Greendot Plus @ Jewel Changi Airport".
2. **The `StoreID` URL parameter does not select the outlet.** Every StoreID URL returns the same
   default-outlet page: Greendot @ Star Vista, 78 products. A real browser was redirected the same
   way: the Jewel link landed on Star Vista's StoreID.
3. **Outlet switching is not permitted for automated capture.** The site switches outlets through
   `/Home/ChooseOutlet` and other `/Home/...` endpoints. `robots.txt` disallows `/Home/` (and
   `/Product/`) for all agents, with `Crawl-delay: 300`.
4. **Our dish IDs prove which outlet a page belongs to.** Item IDs end in `-clone-N`, a per-outlet
   suffix (Star Vista 34, Jewel 16, Westgate 14 …). Results on the default page:
   - **Star Vista:** 63/64 dishes match by exact ID and price. The one absent dish is Char Siew
     Wanton Noodles (SGD 8.90–12.80).
   - **Every other branch:** 0 matches.

   So the 17–18 Oct Explorer holds were correct. Last night's Westgate name-and-price
   "matches" (47/56) would have been wrong-branch evidence.
5. **No price-bearing official alternative was found.** `www.greendot.sg/food-menu/` lists dish
   names without prices. The Greendot Plus × Lotus PDFs are image-only. `www.greendot.sg` rejects
   plain automated requests (ModSecurity 406), which was not bypassed.

## Per-branch outcome

| Branch | Dishes (ordering + patisserie) | Automated official capture | Delivery-platform alternative |
|---|---|---|---|
| Star Vista | 64 + 8 | **Yes**: default outlet, 63/64 exact | foodpanda `s4ib` |
| Seletar Mall | 18 + 8 | No | foodpanda `av68` |
| Asia Square | 51 + 6 | No (pickup only) | none found |
| Bedok Mall | 51 + 6 | No | foodpanda `s7de` |
| Bukit Panjang Plaza | 64 + 8 | No | foodpanda `yyug` |
| J8 | 50 + 6 | No (pickup only) | foodpanda `y9dy` (Junction 8)\* |
| Jurong Point | 50 + 6 | No | foodpanda `u5su` |
| Northpoint | 50 + 6 | No | foodpanda `v0ej` |
| Paya Lebar Square | 63 + 22 | No | foodpanda `s9cw`; GrabFood `SGDD05305` |
| One Raffles Place | 50 + 6 | No | foodpanda `s5zu`; GrabFood `SGDD05316` |
| Tampines 1 | 50 + 8 | No | foodpanda `ugho` |
| Westgate | 50 + 6 | No | foodpanda `v3du` |
| Jewel (Greendot Plus) | 53 | No | none found; official PDFs image-only |

\* Greendot's own site has delivery disabled for J8, so that listing may be stale.

The delivery-platform alternatives **could not be measured** without bypassing protections:
- **foodpanda:** answers plain requests with a PerimeterX CAPTCHA (HTTP 403). Not bypassed.
- **GrabFood:** returns HTTP 200, but the menu loads client-side and is not in the page HTML.

They would also be a channel change from merchant pickup to delivery. Delivery prices often
differ, the platforms use their own item IDs (name-only mapping) and the publisher only patches
prices on the same source and channel. Switching to them means new sections or an editorial
re-mapping, not a URL swap.

## Recommendation

1. **Keep every recorded `sourceUrl`.** They are the correct official per-outlet channel; do not
   switch to foodpanda or Grab.
2. **Twelve branches need a monthly operator capture.** A person selects each outlet in the
   site's own outlet picker and saves the rendered menu, as was done for the 15 October research
   and the Zhen Xiang capture. Before it is used as evidence, check that the selected outlet name
   and address and the item `-clone-N` suffix match the branch. Patisserie sections need the
   same treatment: the 17 Oct Manager review saw the Westgate patisserie page showing
   Paya Lebar Square. That was not independently re-tested here.
3. **Star Vista can be verified automatically, apart from one dish.** The new shared-page guard
   currently holds it conservatively, because the page bytes match every other StoreID's. An
   exception is safe only if the capture itself proves the outlet, for example outlet suffix
   `clone.34` or the selected-outlet header. That is a separate bot change for owner approval.
4. **Jewel needs a manual source.** Either an operator capture with Greendot Plus @ Jewel
   selected, or an operator transcription of the official image-only Greendot Plus × Lotus menu,
   with its source date. Until then all 53 dishes stay held, and they remain published unchanged.

## Requests made

All requests were single fetches to robots-allowed paths, with no retries, alternate user agents
or CAPTCHA handling:

- `orders.greendot.sg`: 4 GETs plus robots.txt and 1 browser page load. No `/Home/` or
  `/Product/` call.
- foodpanda: robots.txt and 1 GET (CAPTCHA, stopped).
- GrabFood: robots.txt and 1 GET.
- `www.greendot.sg`: 1 GET (406, stopped). Content came from the bots' existing 17 Oct cache.
- QuinTaste `/api/menus`: 13 read-only GETs.

No Google calls were made, and no model or Firecrawl budget was used.
