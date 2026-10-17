# Compact place details and community reviews

**17 October follow-up:** Reviews now support up to three optional photos stored in additive `community.place_review_photo`, atomic edits, metadata stripping, owner-only retention/removal, guarded reads and deletion cascades. Gallery ratings use a bounded aggregate endpoint. Google reviews remain separately attributed through Google Maps because no persistent Google review dataset was found. See [menu, gallery and reviews](MENU_GALLERY_REVIEWS.md) for the current UI, filter contract, upload limits and evidence.

The 17 October 2026 owner instruction replaces the long catalogue detail layout. The branch appears once in the heading, with a 176-point photo, diet/branch metadata, address and expandable hours. Directions, Menu and Save share one labelled action row; Share is in the header. Private note, Sources & credits, and Suggest an update are collapsed initially. Source dates, unknown hours, original photo credits/licences and research qualifications remain available. Existing place IDs, private-note keys, bookmarks and menu routes are preserved.

QuinTaste reviews use real accounts and PostgreSQL. Anyone can read; posting, editing, deletion and reporting require a signed-in, DOB-checked, unrestricted account. There is one review per account and canonical branch. A 1–5 integer rating is required; plain written text is optional, limited to 2,000 characters. Names are public; account IDs and email addresses are omitted from public responses. Private notes and private addresses are never sent with a review or share.

The page initially shows up to two community reviews, plus the member's own review once. See all reviews reveals the rest. Newest/highest/lowest sorting and 20-item keyset pages keep retrieval bounded; timestamp ties are broken by UUID. Restricted authors disappear from public reviews and aggregates. Mutual account blocks apply to member-visible reviews and aggregates. The approved 150 Green alias shares one canonical rating. No review implies a verified visit or ingredient certification.

Routes are mounted at `/api/place-reviews` under the existing menus control, using the shared community session/origin guard, account/IP API limits and a 20-write/hour member limit. Reports use the existing staff case queue and its three-report/day member limit. Staff can apply the existing account restriction to hide an author's reviews; no new automated moderation or merchant response capability is claimed.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/:placeId?sort=newest&cursor=...` | Rating/count/distribution, own review, public page and next cursor |
| PUT | `/:placeId/me` | Create or edit the current member's rating/text |
| DELETE | `/:placeId/me` | Delete only the current member's review |
| POST | `/:placeId/:reviewId/report` | Send a reason and optional details to the staff queue |

The additive migration is `server/place-reviews/schema.sql`. Apply with the operations role after backup. It creates `community.place_review`, three indexes and runtime-role grants; it does not modify existing tables or records. User deletion cascades to the member's reviews. Rollback restores the prior app/preview images and retains the review table/data. Do not drop it as a routine rollback.

Local evidence lives under `.local/place-detail-reviews/`: 36 real API checks, browser layout and interaction checks, before/after captures and release evidence. Per the owner's later instruction, the existing Alice/Bob local accounts and saved credentials are retained for reuse by future sessions; generated review/report/pagination fixtures are removed. Read [existing local test accounts](LOCAL_TEST_ACCOUNTS.md) before account-based QA. The validator defaults to reuse and requires an explicit option to create accounts. Browser/signed-bundle checks do not establish physical-device keyboard, gestures or screen-reader acceptance. Reviews currently apply to the owned catalogue place detail pages shown in the owner's screenshots; legacy Google-only details retain their separately attributed Google reviews.
