# Lotus Avatar L0: Lian, the sealed slot and the free first bloom

Built 19 October 2026 on branch `claude/awesome-ishizaka-490f14`. Phase L0 of the [Lotus Avatar plan](AVATAR_LOTUS_PLAN.md) (§2 steps 1–4, §3, §6, §9). No payments, credits, re-blooms or breeding.

## What members see

- **Lian is the default picture.** Every place the member's own picture shows (Me button, Me card, Your Avatar, the avatar library's "Lian" choice) shows Lian when no portrait is selected. Small pictures crop to her head and shoulders. Other members in Social and Market keep their initials: member portraits are not shared with other members yet, and showing Lian for everyone would make people indistinguishable.
- **Me → "Your own avatar" slot** (signed-in, age-checked members only): the Adult and Mini silhouettes behind frosted glass, sealed by an animated pink lotus bud (breathing glow, sway, drifting sparkles, lock badge). Reduced motion holds it still. It is hidden for guests and while the server has no lotus service.
- **/lotus, the free first bloom (once per account).** "Tap to bloom your lotus", the odds table on the same screen, and one Bloom button. The server decides and records the tier first; the app then plays the bloom: the bud spins and slows while pink → purple → blue → golden cycle at one steady pace (the same sequence for every result, so it never lingers on Golden), light gathers, and the lotus bursts open with petals and rays. Skip is always shown; reduced motion replaces the spin and burst with a cross-fade. No prices, countdowns, streaks or offers.
- **After blooming:** "Your <Tier> Lotus is waiting" on Me and /lotus, the seal now holds their lotus, and "What your lotus brings" lists the perks. Companions and the Golden lotus pond are in the café now; frames and auras are frosted previews that arrive with their own avatar. Odds stay one tap away. "Breeding your own avatar opens in a later update."
- **Rush Hour and My little café** read the account's server tier (`useGame` overlays it on the saved game). That tier's companions, accessories and the lotus pond skin unlock; higher ones stay locked. The tier is never saved on the device; the last tier the server confirmed is kept per account for offline play and removed with account deletion. The development-only tier preview is gone.

## Server

`server/lotus` (mounted at `/api/lotus` behind the shared community guard: signed-in, age-checked, unrestricted account; trusted origin for writes; no-store).

| Route | Result |
|---|---|
| `GET /api/lotus` | `tier`, `blooms`, `freeBloom`, latest `bloom`, `odds` (the table the server rolls against), `oddsVersion`, `pity` |
| `POST /api/lotus/bloom` `{requestId}` | 201 with the new state; 200 when the same `requestId` already bloomed (lost-response recovery); 409 `BLOOMED` for any other second attempt; 400 for a bad id; 429 after 20 attempts an hour |

- **Odds and pity** (`server/lotus/odds.mjs`): Pink 55%, Purple 28%, Blue 13%, Golden 4% in basis points. The roll is the first 48 bits of SHA-256 over `lotus-odds-v1:<seed>:<bloom number>`, so `decide(seed, number, counters)` replays any recorded bloom. Pity (for later re-blooms): at least Blue within 10 blooms in a row, Golden by bloom 20; each counter resets on a hit and pity only raises a result.
- **Recorded before the animation:** one transaction (advisory lock per account) inserts `lotus.bloom` (seed, roll, tier, pity applied, counters before) and updates `lotus.account` (tier, bloom count, counters), then answers.
- Missing tables answer 503 `UNAVAILABLE`, so the app hides the slot instead of failing.

## Schema step (owner approval needed)

`server/lotus/schema.sql` is additive and idempotent (schema `lotus`, tables `account` and `bloom`, a partial unique index allowing one free bloom per account; app may select/insert/update `account` and select/insert `bloom`; admin read-only). Rows go with the account. Per [the deployment runbook](DEPLOYMENT_RUNBOOK.md) the CI deploy stops when a schema file changes, so this needs the manual release: backup, apply with the operations role, then deploy. Rollback: restore the previous app image and leave the tables.

## Verification (local only)

- `node scripts/simulate-lotus-odds.mjs`: 100,000 free first blooms within 4 standard errors of 55/28/13/4 and chi-square below the 0.1% critical value; 100,000 pity blooms (5,000 members × 20) never 10 in a row below Blue or 20 below Golden; replay is deterministic.
  Latest run: 55.05 / 28.08 / 12.89 / 3.99%, chi-square 1.32.
- `.local/lotus-l0/check.mjs` (gitignored; retained Alice/Bob accounts, local database with the schema applied, local web export on :18948): 48/48 checks. Guests 401, untrusted origin 403, bad id 400; Lian on Me for guests and members; sealed slot with the pink bud; odds 55/28/13/4 before blooming and during the animation; no price or offer text; the bloom row (seed, roll, counters) exists in the database as soon as the response arrives and its seed replays to the same tier; the tier stays hidden until the animation ends; Skip ends it early; reduced motion fades; the headline and Me slot show the recorded tier; the same request id replays (200), a second bloom is refused (409) and exactly one bloom is stored; the café shows the tier pill and unlocks exactly that tier's companions (runs covered Purple, Blue and Pink). The script removes its blooms afterwards and keeps both accounts. Evidence and screenshots: `.local/lotus-l0/`.
- Not verified: the L0 gate "60 fps on a budget Android" needs a physical device. Headless Chromium with 4× CPU throttling measured 58 fps with no frame over 34 ms during the bloom; that is an approximation only. Native iOS/Android appearance is unverified.
