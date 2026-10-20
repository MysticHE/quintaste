# Lotus avatar: monetised self-avatar plan

**Status:** proposal, 18 October 2026. Nothing is built.

**Owner decision, 18 October 2026:** free first bloom and a paid breed; the paid roll (Option B) is not chosen.
- Breed: US$1.99 store tier or 600 credits.
- Re-bloom: 150 credits.
- Golden Lotus: US$9.99, a direct unlock straight to Golden.

Odds, pity and perk details remain untested proposals.

**Owner brief (18 October 2026):**
- Every signed-in member starts with the QuinTaste mascot as their avatar.
- They can generate their own AI avatar from a selfie, sold for $1.99.
- Before purchase, a lock layer shows an animated pink lotus.
- An animated lotus roll (pink, purple, blue or golden) decides the tier, and the chosen lotus "breeds" the animated avatar.
- Every tier gives the same two forms: Adult and Mini (the cute version). Higher tiers unlock more accessories and pets.
- The design should make members want to save up for it, and it links into Rush Hour.

Related:
- [Game plan](GAME_PLAN.md): Rush Hour, café credits, QT Gamer art pipeline.
- [Production avatar generation](AVATAR_PRODUCTION.md): today's four-frame cloud portrait pipeline.
- Prototype and concept art: the "Lotus Avatar" artifact page.

## 1. The one rule this plan has to work around

The brief puts the random lotus roll *after* the $1.99 payment, which makes it a paid random reward.

| Source | What it says |
|---|---|
| PRD 1.4 §05 | "Paid random rewards" are out of scope |
| PRD QT-056 | Paid cosmetics must be "direct purchases with no randomness" |
| PRD QT-057 | No loot boxes |
| Apple guideline 3.1.1 and Google Play's payments policy | Paid random items are allowed only if the odds are shown before purchase |
| Singapore (MHA, Gambling Control Bill debate, 2022) | Chance-based loot boxes are not treated as gambling while prizes cannot be cashed out |
| Singapore (MHA/GRA, February 2026) | Drafting blind-box odds rules (standard odds, disclosure, guaranteed rarity, age limits). I could not confirm whether they reach apps. |

**Chosen model (owner, 18 October): "free bloom, paid breed", plus a direct Golden unlock.**
- Members roll their lotus for free, so the tier is known before any money changes hands.
- The $1.99 (or saved credits) buys one thing they can already see: breeding their avatar from *their* lotus.
- Re-rolls cost only earned credits, which can never be bought.

This keeps the anticipation, the reveal and the urge to save. It also keeps QT-056/057 intact, so no PRD change or gambling review is needed.

US$9.99 Golden Lotus is a direct purchase of a known item (no chance), so it also fits QT-056. Option B in §8 is kept for the record only.

## 2. The member journey (recommended)

| # | Moment | What the member sees | Why it pulls |
|---|---|---|---|
| 1 | Sign in | Avatar is **Lian**, the QuinTaste mascot (a lotus-bud spirit in a peach apron), everywhere a profile picture appears | Friendly default; nobody starts faceless |
| 2 | Me → avatar card | Beside Lian, a **"Your own avatar"** slot sealed by an animated **pink lotus bud**: pulsing glow, floating and swaying petals, sparkles and rising sparks, small lock badge (the Adult and Mini silhouettes behind frosted glass were removed on 20 Oct 2026: on phones they read as a grey backdrop). On the Lotus screen the motion follows the game's Play your way setting | Curiosity; the slot is clearly *theirs* |
| 3 | First bloom (free, once) | "Tap to bloom your lotus." The bud spins, cycles pink → purple → blue → gold and slows, then **bursts open** into the result with petals and light rays. Odds sit on the same screen. | The thrill of the roll, at no cost |
| 4 | Lock layer shows their lotus | The seal now holds *their* bloom: "Your **Golden Lotus** is waiting", plus the perks that tier unlocks (accessories, pet) shown as frosted previews | Ownership: the reward already feels theirs (endowment) |
| 5 | Grow it or bloom it now | One screen with equal paths:
- **Breed now · US$1.99** (store billing)
- **Unlock Golden · US$9.99**, shown only when their lotus is not Golden
- **Grow with credits**: a progress ring around the lotus (for example "320 / 600 credits"); every Rush Hour clear ends with "+30 · your lotus grew" | The saving path is visible, steady and honest; paying is a shortcut, not a wall. Golden is offered on this screen only, never as a pop-up after a roll |
| 6 | Optional re-bloom | "Re-bloom for 150 credits" (earned credits only). The same odds are shown, with a pity counter: "at least Blue within 10 blooms · Golden guaranteed by bloom 20". The old lotus is replaced only if the member keeps the new one. | A long-term goal for keen players, never money |
| 7 | Selfie | Short consent sheet naming the processor; guide overlay (face centred, even light); photo picker or camera; quality check before upload | Clear and quick |
| 8 | Breeding | The lotus closes around the photo and pulses while "Breeding your avatar…" shows step progress (Adult form → Mini form → expressions). It can resume after reload, and is never charged twice (existing rule). | A calm wait with visible progress |
| 9 | Reveal | The lotus opens: **Adult form** first, a swipe to the **Mini form**, then tier perks pop on one by one (accessory, pet). Choices: Use Adult, Use Mini, or Keep Lian. | Payoff; both forms are equal quality at every tier |
| 10 | Afterwards | Wardrobe shows tier perks as owned. Later re-blooms can **upgrade perks without regenerating** the face. | Ongoing reason to play and save |

**Guardrails (all screens):**
- **Odds:** always one tap away, and on every roll screen.
- **No near-miss tricks:** the roll animation never fakes "almost Golden".
- **Skippable:** a Skip button on every animation. Reduce motion swaps spins for fades.
- **No pressure:** no countdowns, "limited time Golden" or streaks.
- **No upsell after a roll:** the US$9.99 Golden offer never appears as a pop-up right after a disappointing roll. It sits as an equal option on the "Your lotus" screen.
- **No credit sales:** credits are never sold, and no screen implies they can be bought.
- **Clear price and terms:** the price and the fact that every tier makes the same two forms are stated before purchase.
- **Adults only:** the app is 18+ already, and Mini style stays an appearance of an adult profile (PRD 1.3).

## 3. Tiers

The Adult and Mini forms are identical in quality at every tier. Tiers only add perks, and each tier includes the perks below it.

| Lotus | Odds (proposal) | Pet (wearing its accessory) | Extra |
|---|---|---|---|
| Pink | 55% | None: your avatar alone | — |
| Purple | 28% | + Mochi (the steamed bao bun from companion board A06) in a chef hat | Purple portrait frame |
| Blue | 13% | + Ripple (a sky-blue rabbit with droplet-tipped ears) with its wave scarf | Water-ripple idle aura |
| Golden | 4% | + Golden Dewdrop (a shimmering golden droplet sprite) in a lotus crown | Golden lotus pond decor in My little café; sparkle frame |

- **Pets (owner, 18 October):** Pink has no pet; pets start at Purple. Blue's Ripple is a sky-blue rabbit and Golden's pet is Golden Dewdrop; no fish pets.
- **Pity:** at least Blue within any 10 blooms, and Golden guaranteed by bloom 20. Both counters reset on a hit.
- **Free companion:** Sprout, the free companion from the boards (A06), stays free for everyone (QT-047 "free basics").
- **No pay-to-win:** accessories are cosmetic; pet skills have equal value across all pets, including free Sprout (§3b).

## 3b. Pets: accessories, wardrobe and game helpers (owner direction, 18 October 2026)

**Accessories belong to the pets, not the avatar.**

| Lotus | What you get |
|---|---|
| Pink | Your avatar alone |
| Purple | Mochi wearing the chef hat |
| Blue | Ripple, whose wave scarf is part of its design |
| Golden | Golden Dewdrop wearing the lotus crown |

Higher tiers keep every pet below them, so a Golden member owns all three.

**Wardrobe:**
- Members equip and change accessories on any pet, any time.
- More accessories arrive over time: tier items, items earned in Rush Hour (for example the lotus clip for clearing Level 5) and later items bought with earned credits.
- Paid accessories would need their own decision under QT-056.

**Worn, not pasted on:**
- Every accessory is drawn fitted to every pet: its size, angle, overlap with ears and contact shadow.
- In the game, each fit is a Spine attachment on the pet's head or neck bone, with front and back pieces, so it moves with the pet.
- QT Gamer drafts each fit from the pet and accessory references, then an artist approves it.
- Art grows as pets × accessories, so keep the pet roster small and add accessories in batches.

**Pet skills: sidegrades, not upgrades (owner direction, 18 October 2026).** Pets help in Rush Hour with real skills: extra time, or entertaining waiting guests so their hearts last and they do not leave.

| Pet | Skill (tap once per Rush service) | Effect |
|---|---|---|
| Sprout (free for everyone) | Deep breath | Freezes every guest's hearts for 5 seconds |
| Mochi (Purple) | Cheer up | Hops to the guest with the fewest hearts and entertains them: +1 heart |
| Ripple (Blue) | Bubble show | Bubbles entertain the whole counter: hearts drain at half speed for 10 seconds |
| Golden Dewdrop (Golden) | Golden minute | Adds 10 seconds to the round timer |

- **Equal value:** each skill is worth roughly 8–10 seconds of saved time.
  - Golden Lotus is sold for US$9.99, so no pet may be stronger than Sprout, the free one.
  - Rarity is cosmetic.
  - Tune the values in play-tests until no pet is the obvious best.
- **The player's call:** one tap per service, chosen by the player, never automatic. One pet joins each service.
- **Rush only:** Calm has no timer or hearts.
- **Time and patience only:**
  - Skills never fix a wrong ingredient, read a label, cool the wok or mark a rule conflict, so the lesson stays the player's.
  - A fast wrong serve still never beats a correct one (QT-054).
- **Accessories stay cosmetic,** with no stats.
- **Server replay:** each skill use is an action in the run's event log, with deterministic effects, so the server replays it before credits settle (QT-055).
- **Effect on takings:** saved patience can raise the quick tip slightly. Every member has a skill of equal value, so this is not pay-to-win.

## 4. Prices and saving (proposals)

| Item | Price |
|---|---|
| First bloom | Free, once per account |
| Breed (own avatar, both forms, tier perks) | US$1.99 store tier, or 600 earned credits |
| Golden Lotus | US$9.99 store tier. Skips straight to Golden and includes the breed. If the member already bred at a lower tier, it upgrades their perks to Golden and includes one new breed from a fresh selfie. Direct purchase, no chance. |
| Re-bloom | 150 earned credits; never sold for money |
| Regeneration after a failed or low-quality result | Free, up to 2 per breed |

**How long saving takes:** 600 credits is about the first-clear credits of Levels 1–20 (30 each), so an engaged player can unlock without paying in two to three weeks. Payers skip the wait.

**Golden value:**
- US$9.99 is about 5× the breed, so Golden perks must feel clearly premium: the crown, Golden Dewdrop, the café lotus pond and the sparkle frame.
- Credit players still reach Golden through re-blooms, guaranteed by bloom 20 (about 2,850 credits).
- Watch Golden conversion and refunds, and be ready to test US$6.99.

**Not for sale:** credits stay earned-only, single-account and non-cashable (QT-056). Only the breed and Golden Lotus are sold.

## 5. Generation pipeline changes

Today: one selfie becomes four cloud-generated frames (base, blink, half-open mouth, open mouth) with `gpt-image-2.5-sunburst` through the Cloudflare AI Gateway. Inputs are encrypted and temporary, quotas are per account and global, there is one job at a time, and nothing can be cancelled or paid twice.

Changes:
1. **Two forms from one selfie.**
   - The Adult base is edited from the selfie.
   - The Mini base is edited from the *Adult base*, not from the selfie again, so the two stay the same person.
   - Each form gets base, blink and talk frames: 6 calls instead of 4. Use high quality for the two bases and medium for expressions.
2. **Fixed framing:** head and shoulders, the top of the head at a fixed height, centred, transparent background. Accessories can then be placed by anchor points read from the cut-out rather than generated per member.
3. **Perks are layers, not generations.**
   - Accessories and pets are authored once per tier: QT Gamer drafts them in the Rush Hour style, then an artist approves.
   - They are composited on the device, so tier upgrades are instant and generation cost does not depend on tier.
4. **One art direction.** Avatar prompts share QT Gamer's style guide so members look at home in Rush Hour and My little café.
5. **Quality gate.**
   - Automatic checks: one face, transparent cut-out, framing.
   - Up to 2 free regenerations.
   - The existing Report action stays.
6. **Cost guard.**
   - Provider cost per breed must stay well under the net store revenue: about US$1.39–1.69 at a 15–30% store fee.
   - Measure the real cost of 6 calls in the spike before setting the final price.
   - Paid breeds use the existing per-account and global admission controls, with their own allowance.
7. **Privacy (unchanged and stated).**
   - The selfie is encrypted, used once and deleted after the Adult base.
   - The consent sheet names OpenAI via Cloudflare as the processor.
   - Face data is never used for marketing (Apple 5.1.2(vi)).
   - Mini style never appears on Social profiles or in store screenshots (PRD 1.3).

## 6. Payments

- **Store billing:** two consumable products through Apple In-App Purchase and Google Play Billing:
  - `lotus_breed` at the US$1.99 tier: one breed.
  - `lotus_golden` at the US$9.99 tier: Golden tier plus one breed.
- **Merchant of record:** Apple and Google, including GST. The Small Business Program and Play rate is 15%.
- **Server-side receipt check:** the server grants a breed entitlement into a PostgreSQL ledger.
  - The grant is idempotent per transaction, so it can never be granted twice.
  - The entitlement is consumed only when a breed succeeds; a failure returns it.
- **Library:** an Expo SDK 57-compatible billing library with a config plugin, chosen in the spike against the SDK 57 docs. Store billing does not work in Expo Go, so a development build is required.
- **Web:** web purchases come later. At launch, web shows "Breed in the app" and the credit path.
- **Refunds and restore:**
  - On a store refund, an unused entitlement is revoked. A generated avatar stays, because its cost was already incurred.
  - Restore is by account, because avatars and tiers live on the server.
- **Server-side odds:** odds and pity are decided by the server and recorded with a seed before the animation plays. The client only animates a result it already received.

## 7. Links into the game

- **Rush Hour:**
  - The member's avatar is the chef in the dialogue panel and on the results screen.
  - Their tier pet sits on the shelf perch and can give order cues (QT-047).
  - Results show "+30 · your lotus grew" while saving.
- **My little café:** the avatar, pet and tier decor appear in the café; Golden adds the lotus pond.
- **Economy:** Rush Hour credits fund the credit path and re-blooms, which gives a clear reason to play the next level without streaks or energy (QT-057).
- **Production:** QT Gamer produces the lotus, accessory and pet sprites through the same reviewed pipeline as game art.

## 8. Option B: pay, then roll (not chosen, kept for the record)

Pay US$1.99, then roll for the tier, then breed.

- **What it needs:**
  - A PRD change to §05 and QT-056/057.
  - Odds shown before purchase (Apple 3.1.1, Google Play).
  - A guaranteed minimum (pity) across purchases.
  - No cash-out or trading.
  - A legal check against the 2026 blind-box rules.
  - Per-account spending limits with a re-roll warning.
- **Risk:**
  - Members can pay repeatedly to chase Golden, which is the pattern QT-057 was written to prevent.
  - It weakens the "compelling, not compulsive" promise of a food-values app.
- Option A (§1) gets the same excitement without this risk.

## 9. Build phases

| Phase | Scope | Gate |
|---|---|---|
| L0 | Lian as default avatar; lock tile with animated pink bud; free first bloom with server-recorded odds; tier perks visible as previews | Animation runs at 60 fps on a budget Android; odds and Skip are present |
| L1 | Breed with store billing (US$1.99): entitlement ledger, two-form generation, framing standard, perk layering | Receipt validation, no double grant or charge, generation cost measured, likeness and quality review |
| L2 | Credit path and re-blooms with pity (needs Rush Hour credit settlement, GAME_PLAN Phase B) | Ledger integrity tests; odds and pity verified over 100,000 simulated blooms |
| L3 | Perks in Rush Hour and My little café; QT Gamer accessory and pet sets | Art review; accessibility (reduce motion, captions) |

## 10. Measurement

- Funnel: lock-tile view → first bloom → breed (paid or credits).
- Paid share against credit share.
- Re-blooms per member, pity hits and actual tier distribution against published odds.
- Generation success rate, free regenerations used and cost per breed.
- Refunds, reports and complaints.
- Session length is never a target.

## 11. Owner decisions

1. **Randomness:** decided 18 October. Free first bloom, paid breed.
2. **Price:** decided 18 October.
   - Breed: US$1.99 or 600 credits.
   - Re-bloom: 150 credits.
   - Golden Lotus: US$9.99, breed included. Members who already have an avatar get the Golden perks plus one fresh breed from a new selfie (owner, 18 October).
3. **Odds and pity:** the values in §3.
4. **Mascot:** Lian, the lotus-bud spirit (concept art on the prototype page), or another design. Name and look need owner approval.
5. **Naming:** the brief says "Mini-me". PRD 1.3 renamed it **Mini style** to avoid child-appeal signals. Recommended: keep Mini style.
6. **Perks:** the accessory and pet roster per tier.
7. **Re-bloom after breeding:** can a better lotus upgrade perks later? Recommended: yes, with no new generation.
8. **Web purchase:** app-only at launch (recommended) or a web checkout later.
9. **Pet skills:** owner direction 18 October: real skills (time and patience), equal value across pets including free Sprout (§3b). Values to tune in play-tests.
10. **Accessory sources:** tier, earned in play, and later earned credits; paid accessories need their own decision.
