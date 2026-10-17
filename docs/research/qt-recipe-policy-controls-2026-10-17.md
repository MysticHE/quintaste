# QT recipe eligibility and screenshot deletion

Verified 17 October 2026, 6:16 pm Singapore time. Hermes changes are live;
the app image remains `20261017-review-hardening1`. The separate one-hour
acceptance run is still in progress, scheduled to finish at 6:39 pm SGT.

## Owner rule

Bot-added recipes must exclude garlic, onions, shallots, spring onions,
leeks/chives and asafoetida, including derivatives and compound ingredients.
This is QuinTaste's owner-specific recipe eligibility rule. Vegetarian/Vegan
labelling by a source is insufficient. Unknown composition remains held.
Existing venue menus, events and bundled recipe samples were not reclassified.

Cooker and Manager instructions now state the rule. Deterministic checks cover
candidate review, image eligibility, recipe conversion and the final publication
boundary, including old pending batches. Ingredient names/IDs, dish names,
instructions and contains tags are scanned. The keyword guard is conservative;
source and Manager review remain necessary for hidden or unrecognised ingredients.

At 6:11 pm SGT, the production removal handler removed `garlic-chive-eggs`
and the garlic-containing `tomato-egg-stir-fry`. Both public detail endpoints
returned 404. Their evidence and removal audit remain; suppression prevents
automatic republication. The remaining bot recipe is
`sweet-potato-ginger-pandan-soup`.

Historical recipe sources (checked 17 October):
[garlic chive eggs](https://thewoksoflife.com/chinese-chives-eggs/) and
[sweet potato soup](https://dailycookingquest.com/sweet-potatoes-in-ginger-pandan-soup.html).
Do not interpret the earlier successful publication record as current approval
of the subsequently removed garlic-chive dish.

## Telegram controls

Recipe and event screenshots carry Open and **Delete recipe/event now** buttons.
One selection requests removal without a second confirmation. Only the paired
private-chat owner can act. Actions bind the exact record and reviewed hash,
expire after 30 days, retain idempotent receipts, reject stale content, and
suppress republication. A verified deletion clears the original keyboard.
Existing `/manage` keeps its confirmation flow. Venue screenshots have no delete
control. Legacy screenshots are associated only by exact recorded URL/title.

The existing reporter polls approximately once per minute. Removal happens when
the callback is processed; already-open app caches may take up to 15 minutes
online or 24 hours offline to expire. There is no promise of instant refresh on
every device.

## Verification and evidence

- 77 Python checks passed locally and on the VPS, covering eligibility, image
  exclusion, wrong-owner/stale/expired controls, replay and uncertain outcomes.
- The real production one-click handler removed the two owner-rejected recipes.
  This was an operator action authorised in chat, not a fabricated Telegram tap.
- Real Chromium captures were sent to Telegram at 6:13 pm SGT. Telegram echoed
  the expected buttons for messages 27 and 28 (events) and 29 (soup recipe).
  Existing event screenshot 7 was also updated. No event was deleted as a test.
- Publication also exposed a source-date validation error. Timezone-aware nested
  review timestamps are now converted to Singapore calendar dates before a fresh
  exact-payload Manager review. Original evidence and rejected payloads remain.
  Successful republication of that venue patch is still pending verification.
- Locks, schedule, Google ledger, budget, authentication and unrelated app changes
  were preserved. No new paid image or Google calls were introduced.

Machine receipts: `data/menu-research/qt-recipe-policy-controls-2026-10-17.json`.
Hermes local evidence: `evidence/2026-10-17/owner-recipe-controls/verification.json`.
VPS receipts and private rollback copies remain under
`/opt/data/qt-team/operator-tests/e2e-20261017T093920Z/`.
