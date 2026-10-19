# Lotus Avatar L2: credit re-blooms, breed entitlements and two-form breeding

Built 19 October 2026 on branch `claude/sad-satoshi-b3778f`. This is phase L2 and the non-billing half of L1 of the [Lotus Avatar plan](AVATAR_LOTUS_PLAN.md) (§2–§7, §9). It builds on [L0](LOTUS_L0.md) and the Rush Hour credit ledger ([GAME_ACCOUNT_PROGRESS.md](GAME_ACCOUNT_PROGRESS.md)).

Not built: store billing (US$1.99 breed and US$9.99 Golden). That needs App Store and Play products, receipt checks and a development build. No store price appears anywhere yet.

## What members see

- **/lotus after blooming:**
  - Breed path:
    - Under 600 credits: a ring around the lotus fills with café credits ("320 / 600 credits"), with a Play pill.
    - At 600 or more: a gold "Breed Your Avatar · 600 café credits" pill.
    - With a breed ready: "Breed Your Avatar · Your breed is ready".
    - While breeding: "Breeding Your Avatar · See progress".
  - "Re-bloom · 150" pill, the credit balance and the pity counter ("Blue or better within N blooms · Golden within N blooms").
  - Both spends ask first. The re-bloom confirmation shows the odds again.
  - The re-bloom plays the same bloom animation, with Skip and reduced motion. It ends with "Your lotus grew to Blue!" or "Pink bloomed · your Purple Lotus stays".
  - Once bred, the stage shows the Adult form wearing the lotus perks. The frame and aura perk cards change from frosted previews to "On your avatar".
- **/lotus-breed:**
  1. Selfie step: a guide (face centred, even light, just you), Choose Photo and Take Selfie pills.
  2. Consent sheet naming OpenAI via Cloudflare, with privacy details.
  3. "Breed My Avatar" pill, then progress: Adult form → Mini form → Expressions (n of 4). Progress resumes after a reload or on another device.
  4. Reveal: Adult form first, an Adult | Mini switch, perks popping on one by one. Then Use Adult, Use Mini or Keep Lian.
  5. "Try Again With A New Selfie · N Free" and Report.
  - Guests are told to sign in.
- **Me:** the slot says "Breeding your avatar…", "Your breed is ready" or "Your <Tier> Lotus avatar". The avatar library labels lotus results "Adult Form" and "Mini Form".
- **Perk layers (device-composited):** each tier adds to the one below.
  - Purple: purple portrait frame and Mochi in its chef hat.
  - Blue: also the water-ripple aura and Ripple. The aura is still with reduced motion.
  - Golden: sparkle frame and Golden Dewdrop in its crown.
  - A re-bloom upgrades perks instantly with no new generation.

## Decisions taken while building (owner may revisit)

- **A re-bloom keeps the better lotus.** The plan says the old lotus is replaced only if the member keeps the new one. Every tier includes the perks below it, so a lower result can never be the better choice. The server therefore keeps the higher tier automatically (`keepBetter`, server/lotus/odds.mjs), and nobody is offered a downgrade.
- **A Golden lotus cannot re-bloom** (409 `TOP_TIER`). A re-bloom could not improve it.
- **One unused or running breed at a time.** Buying a breed with credits is refused while one is ready or running (409 `HAS_BREED`), so a second tap never spends twice. A member who already bred can buy another breed later.
- **Breeding uses the existing `avatars` control.** There is no separate control, and the staff console is unchanged. Pausing avatars pauses breeds too.
- **Breed allowance (configurable in server/avatar/config.mjs):**
  - 3 attempts per account per UTC day: one breed and two free tries.
  - 10 attempts per day across the server.
  - It is separate from the portrait allowance (2 per account, 5 global). Master accounts are counted, not limited.
  - Final values wait for the cost spike (plan §5 step 6).
- **The Adult base reuses the live portrait art direction** and its fixed framing (crown 7%, eye line 39%, chin 68%). Aligning with QT Gamer's style guide is still an L3 art review.
- **Routes are flat** (`/lotus`, `/lotus-breed`). The root stack builds `initialRouteName` from URL segments, which fails for folders with their own layout. A reload of `/saved/filters` hits the same error today; that is a separate follow-up.

## Server

| Route | Result |
|---|---|
| `GET /api/lotus` | L0 fields plus `credits` (null when the game service is missing), `prices` {rebloom 150, breed 600}, `breeds` {available, held, used}, the latest `breed` (status, free tries left, Adult/Mini library ids, latest attempt) and `generation` |
| `POST /api/lotus/rebloom` `{requestId}` | 201 new state, with `bloom` = the bloom this request rolled. 200 for a repeated requestId. 409 `NOT_BLOOMED`, `TOP_TIER` or `NOT_ENOUGH_CREDITS`. 429 after 60 an hour |
| `POST /api/lotus/breeds/credits` `{requestId}` | 201 with one breed granted. 200 for a repeated requestId. 409 `NOT_BLOOMED`, `HAS_BREED` or `NOT_ENOUGH_CREDITS` |
| `POST /api/avatar/lotus/breeds` `{requestId, consent: "cloudflare-openai-lotus-v1", photo, breedId?}` | 202 with the attempt. 200 for a repeated requestId. `breedId` makes it a free try. 409 `NO_BREED`, `NO_REGENERATIONS`, `LIBRARY_FULL`, `BUSY` or `NOT_BLOOMED`. 429 `ALLOWANCE`. 503 when another generation runs or breeding is off |
| `GET /api/avatar/lotus/breeds?requestId=` | The attempt: status, completed (0–6), total, message |

- **Re-bloom:** the 150-credit spend (game.ledger kind `lotus_rebloom`, source `bloom:<requestId>`) and the bloom row are written in one transaction, using the same `decide` (odds and pity) as L0.
- **Credit breed:** the 600-credit spend (kind `lotus_breed`, source `breed:<requestId>`) and the entitlement grant (`credits:<requestId>`) are written in one transaction.
- **Uploads:** the selfie goes through the avatar router, behind the 5.6 MiB edge route. That router already requires an adult account, an unrestricted account and the trusted origin, and applies the upload throttle and the two-parser limit.
- **Admission** uses the portrait admission lock. Portraits and breeds share one generation at a time across the server (`admitGeneration`, server/avatar/repository.mjs).
- **Generation (server/lotus/generate.mjs, prompts.mjs):** the shared avatar worker runs six calls in this order:
  1. Adult base from the selfie, plus the two style references (high quality).
  2. Mini base from the Adult base (high).
  3. Blink and talk for each form (medium).
  - The selfie is removed from the encrypted payload as soon as the Adult base exists.
  - Each base must pass a framing gate: a transparent cut-out, crown in the top fifth, centred, reaching the lower edge.
  - Interrupted work is never retried automatically.
- **Success, in one transaction:** both forms are saved to `avatar.saved` (encrypted, account-bound, recipe `lotus-v1`, frames base/blink/open), the breed records them, and a first breed consumes its entitlement.
- **Failure:** the attempt stops and a first breed releases its entitlement. A free try that fails does not count.
- **Library changes:** the library lists `recipe` and `form`. The app can select a lotus form but never save one; only the server makes them.

## Schema step (owner approval needed)

Apply in this order with the operations role, after a backup. The CI deploy stops on schema changes.

1. `server/game/schema.sql`:
   - A ledger trigger moves `game.profile.credits`.
   - A guard refuses any other change to credits (older app images keep working, because their update sets the value the trigger already wrote).
   - Before enforcing, the file checks that every balance equals its ledger sum, and refuses to apply if one differs.
2. `server/lotus/schema.sql`:
   - Re-bloom check: a re-bloom row needs its credit spend.
   - `lotus.breed_balance`: the app role can read it but has no write privilege. It moves only through the SECURITY DEFINER trigger on the insert-only `lotus.breed_ledger`. That trigger refuses a credit grant without its spend, a hold with nothing available, a second hold, and any settle without a hold. A held breed settles once.
   - `lotus.breed` and `lotus.job`.
   - `GET /api/lotus` works before this step: L0 fields keep working and breed fields are empty.
3. Deploy app and preview.

Rollback: restore the previous app image and leave the tables. Older images ignore them, and the credit trigger is compatible with them.

## Verification (local only, no paid calls)

- **Typecheck and lint:** `npx tsc --noEmit`, `npm run typecheck:server` and `npx expo lint` pass.
- **`node scripts/simulate-lotus-odds.mjs` passes:**
  - 100,000 first blooms within 4 standard errors of 55/28/13/4. Latest chi-square 2.94.
  - 100,000 pity blooms: never 10 below Blue, never 20 below Golden.
  - Replay is deterministic.
  - New: 100,000 blooms as members re-blooming until Golden with `keepBetter`. The lotus is never lowered, everyone reaches Golden by bloom 20, at most 2,850 credits and about 1,915 on average.
- **`.local/lotus-l2/check-api.mjs`, 63/63** (gitignored; retained Alice/Bob; local DB; stub provider via `AVATAR_PROVIDER_LOCAL_URL`, which is loopback-only and ignored in production):
  - Guards: guest 401, untrusted origin 403, bad id 400.
  - 10 concurrent re-blooms with 450 credits: at most 3 succeed, each spends 150 once.
  - 8 concurrent re-blooms with one request id: one bloom and one spend.
  - Recorded re-blooms replay from their seeds. Golden refuses re-blooms.
  - 6 concurrent breed purchases: exactly one grant and one 600 spend. A repeated id never spends again.
  - 4 concurrent breed starts: one admitted, holding the entitlement.
  - Six calls run in order with the right quality. Success consumes the entitlement and saves both forms.
  - Bob cannot read or regenerate Alice's breed or forms. The app cannot forge a lotus form.
  - A failed free try does not count. Two free tries count; a third is refused.
  - Failed, mis-framed and timed-out breeds return the entitlement. The daily allowance is enforced before anything is held.
  - The app role cannot change credits, write breed balances, forge a grant or re-bloom, or rewrite ledgers.
  - Final credits equal the ledger sum and breed balances equal the breed ledger.
  - No encrypted payload is left behind.
  - The script restores both accounts' previous progress and the local `avatars` control.
- **`.local/lotus-l2/check-browser.mjs`, 14/14** (Playwright-managed headless Chromium, local web export on :18948):
  - Re-bloom with odds in the confirmation, the result line and one spend.
  - Breed purchase, selfie upload, consent naming OpenAI via Cloudflare, progress, and resume after a reload.
  - Reveal; Use Mini sets the account avatar; the bred stage shows perks; the guest sign-in prompt.
  - No page errors. Screenshots are in `.local/lotus-l2/`.
- **Not verified:**
  - Real provider output: likeness, Mini style quality, real framing pass rate and the cost of six calls. Any real call needs the owner's approval.
  - Native iOS/Android camera and appearance.
  - Store billing (L1).
  - The "+30 · your lotus grew" line on Rush Hour results (plan §7) is not added.
