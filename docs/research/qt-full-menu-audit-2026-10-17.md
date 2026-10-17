# QT whole-menu audit correction ? 17 October 2026

The owner requested review of the whole 68-dish Zhen Xiang menu after a Telegram
report showed one filtered dish. The live menu already contained 68 dishes;
the earlier bot publication rechecked only one price. This was a workflow and
reporting defect, not a missing-menu import.

## Implementation

- Removed the 50-dish context truncation. The full inventory supplies the
  denominator; explicit assignments contain up to 80 dishes and resume by exact
  section/item IDs. A one-dish response cannot satisfy a 68-dish assignment.
- Separate legacy venue visits, per-dish review, full-menu verification and
  production publication. A successful worker response cannot mark a menu fully
  verified. Only independently approved evidence for every dish can do so.
- Reuse shared source captures. Verified items require exact source/channel,
  matching name and SGD price evidence; unsupported items remain held. Source
  cache reads are dated and are not described as new merchant confirmation.
- QT Manager separately approves the accuracy of a per-dish audit. Correct
  holds on two dishes or other venue fields do not discard the other 66 valid
  findings. Overall venue/publication holds remain effective.
- Save monthly item fingerprints and progress. Continue unprocessed chunks;
  retry held findings after seven days, and restart verification next month.
  Do not repeatedly publish unchanged menu prices.
- Telegram menu reviews open an unfiltered menu, show verified/total, held and
  pending counts and a full-menu link. One screenshot shows the first page;
  it does not imply all 68 dishes fit in one image. Audit-only reports have no
  meaningless revert button because they did not alter the live app.

## Real source comparison

Source checked 17 October 2026:
https://www.foodpanda.sg/restaurant/fqw9/zhen-xiang-su-shi-zhen-xiang-vegetarian-325-woodlands-st-32

A full public web-reader capture was imported into the shared evidence cache
with explicit acquisition metadata. The previous partial capture is archived.
This was not recorded as a fresh Firecrawl download. Direct public HTTP access
returned 403; no restriction was bypassed. Both live bot roles used saved
source evidence instead of extracting independently for every dish.

Explorer accounted for all 68 existing IDs: 66 matched the captured names and
unchanged delivery-channel SGD prices. Two existing names were absent:

- Crispy Vegetarian Roasted Chicken Rice Set ??????
- Vegetarian BBQ Char Siew Fried Rice ???????

Those dishes remain in the app with unresolved source-match holds. Do not infer
discontinuation. The source additionally lists Sambal Petai ???? (SGD16.80)
and Sambal Petai Rice Set ????? (SGD8.50); identities require editorial
reconciliation, not automatic replacement of the two absent names. Ordering
hours 07:00?20:30 do not verify dine-in hours. No cover or ingredient claim was
changed.

## Acceptance and deployment

Final acceptance passed at **19:29 SGT**. Evidence:
[data/menu-research/qt-full-menu-audit-2026-10-17.json](../../data/menu-research/qt-full-menu-audit-2026-10-17.json).

- **98 tests passed locally and on VPS**; all 24 guarded release file hashes
  match and both role profiles match their deployed definitions.
- Real Explorer plus two Manager calls accounted for all 68 dishes; final
  independent approval retains **66 verified, two held, zero pending**. This
  menu is fully assessed but not fully verified. No price changes were needed.
- The live API still returns exactly the same 68 IDs, names and prices.
  Editorial revision and owner removals are unchanged; zero production writes.
- Telegram message **43** was corrected in place. The returned message confirms
  66/68, the two actual held names and the full-menu link. Its actual browser
  screenshot shows empty search, All dishes selected and **68 dishes**.
- The supervised listener is active. There is no immediate duplicate review
  due for this venue; verified proofs remain saved and held items back off.
- Monthly model usage is **29/2,000** (three calls for this acceptance work);
  the 80% alert, 01:00?05:00 SGT window, image limit and zero-Google policy are
  unchanged. The three recorded extraction requests were one cached menu, one
  cached blocked Instagram response and one secondary-directory fetch; there
  was no per-dish extraction loop. Manager also inspected public evidence;
  do not interpret extraction-log counts as all web-tool activity.
- Source freshness is qualified: the original upstream public-reader fetch
  timestamp is unknown. The inspection date must not replace original source
  verification dates or be called fresh merchant confirmation.
The first real run exposed an overly broad Manager hold that downgraded all
68 findings. Its receipts are retained; the corrected Manager review reuses the
same Explorer packet and source capture instead of repeating extraction.

Bot-only guarded deployment preserves the concurrent app/preview
`20261017-filter-cleanup1`, account data, all owner removals, policy, Google
ledger and nightly schedule. Rollback snapshots are in the Hermes container at
`/opt/data/qt-team/operator-tests/menu-coverage-20261017` and
`/opt/data/qt-team/operator-tests/menu-coverage-v2-20261017`.
Restore code/role definitions only; do not restore old live editorial or
checkpoint state over subsequent owner actions.

Earlier ?22/174 locations reviewed? means historical checklist visits and spot
checks. It does not establish 22 fully verified menus. Preserve those timestamps
as `explorerAttempted`; use `explorerReviewed` only for fully verified menus.

At this checkpoint **zero of 174 bot monthly menus are fully verified** under
the corrected all-dish standard. One menu has a complete 68-item assessment
with two holds. This does not erase earlier human research or published app
menus. Future nightly batches continue the saved inventory.
