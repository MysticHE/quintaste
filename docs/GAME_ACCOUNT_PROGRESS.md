# Rush Hour account progress (Phase B)

Built 19 October 2026 on branch `claude/distracted-mirzakhani-a016fd`. Not deployed: it needs the manual schema release below. Sources: GAME_PLAN §9, §12.3, §12.7 and §14 (Phase B); PRD QT-055, QT-056 and §17 ("offline-started games are local practice").

## What changed

| Before | Now |
|---|---|
| Progress, credits, decor and café look lived only on the device (`FoodDocument.game`) | Signed-in, age-checked members' progress lives on the account (`server/game`); the device keeps a copy |
| Credits were granted by the app | The server replays each run's input log with the same simulation and grants credits from the replay |
| Staff `games` control had no effect and was locked in the console | `games` gates `/api/game`; the app shows the Game placeholder when it is off; staff can toggle it |

Guests are unchanged: their progress stays on the device and is never sent.

## How a member's run settles

1. **Start service** opens an attempt: `POST /api/game/runs` with an app-made id, the level, mode, companion, signature dishes and the rules version.
   - If that fails because the phone is offline, the service is **practice**. Results say so; nothing reaches the account.
   - An older app (different rules version) or a locked companion also gives practice, with its own message.
2. The simulation logs every input with the tick it happened on (`Run.actions`, `src/game/sim/engine.ts`).
3. **Finish:** the app queues the run on the device first (`@quintaste/game-sync-v1/<account>`), shows it at once, then sends `POST /api/game/runs/:id/finish` with the log and its result.
4. The server replays the log (`src/game/sim/replay.ts`) and refuses the run when:
   - the log could not come from a real service (out of order, an input while time was stopped, too long, never ends);
   - the replayed result differs from the claimed one (stars, score, served, coins, stamps);
   - it finished faster than real time (90% of simulated time, 5 s slack, measured on the server);
   - the level was not open on the account, the game changed since the run started, or it is over 7 days old.
5. Accepted runs settle with the app's own `applyResult`: 30 first clear, 8 replay, 20 first mastered.
6. Results show one of four states:
   - **settled:** `+N café credits`;
   - **pending:** `+N café credits pending`, saved on this phone until it is back online;
   - **practice:** started offline, not saved to the account;
   - **refused:** "couldn't be confirmed, so it earned no credits".
7. Pending runs settle on app resume, every minute while something waits, and on the next game visit. A short notice reports the outcome.

## Integrity (PRD QT-056 gate)

- **Balance:** kept on `game.profile.credits` with `CHECK (credits >= 0)`. Every change is a `game.ledger` row, unique per (account, kind, source).
  - first clear and mastered use `level:N`, so each is granted once per level ever;
  - a replay uses `run:<id>`;
  - a purchase uses `decor:<id>`.
- **Serialisation:** every write locks the member's profile row (`lockProfile`).
- **Local evidence (19 Oct):**
  - five retries and 100 concurrent identical settlements give one grant;
  - 20 concurrent different runs of one level give one first clear and 19 replays;
  - two concurrent 80-credit buys on 100 credits: one succeeds, the other gets `NOT_ENOUGH_CREDITS`;
  - 30 concurrent buys of one item charge once;
  - the ledger always sums to the balance.
- **Lotus Avatar spends:** use `postCredits(db, userId, -amount, kind, source)` from `server/game/ledger.mjs` inside `transaction()` after `lockProfile`.

## One-time device merge

On a member's first sync on a device, the app sends that device's earlier progress (`POST /api/game/import`). The server merges it once per account with `mergeGame` rules.
- **Credits and bought decor:** device credits never move to the account (owner, 23 October 2026: a device's record cannot be checked, so credits are only earned on the account); when the phone had more than the account, the first sync says so ("Café credits from this phone don't move to your account."). Decor bought on the device counts only up to what the device's clears could have earned: first clear, first mastered and at most 5 replays per level.
- **Locked looks and tiers:** a lotus tier and any locked look are dropped.
- **Later devices:** adopt the account's progress instead.

## Café look

Companion, accessories, decor layout, skin, name, menu, mode, signature dishes and seen finds save with `PUT /api/game/cafe` in the background. The server drops anything the account has not unlocked. Buying decor needs a connection (`POST /api/game/purchases`).

## Staff switch

- `GET /api/game/status` is public and outside the gate. The app caches the last answer and defaults to on.
- When `games` is off:
  - the Game tab shows the placeholder, and the café and play routes redirect;
  - `/api/game/*` answers 503 `SERVICE_PAUSED`;
  - queued runs wait.
- `admin/src/lib/management.ts` no longer blocks enabling `games`.

## Server notes

- The API loads `src/game` directly with Node's type stripping (`server/game/sim.mjs`, `ts-hooks.mjs`). Node 22.18 or newer is needed; `node:22-bookworm-slim` pulled since July 2025 has it.
- The Dockerfile copies `src/game` and `src/config/game.ts` into the runtime image.
- If type stripping is missing, `/api/game` answers 503 and runs stay pending. The server keeps running.
- Input logs are kept 30 days (`purgeRunLogs`, daily); results and the ledger stay. Game rows go with the account (cascade).
- Replay cost: 1–2.5 ms for a full service. The worst case, a Calm log that never ends and stops at the 30-minute cap, is about 6 ms.

## Release steps (manual, because of the schema)

1. Back up per the runbook §4, with zero active avatar jobs.
2. Apply `server/game/schema.sql` with the operations role. It is additive and idempotent. It turns `games` on once, only if staff never changed it (version 1), so the live game keeps running.
3. Deploy app/preview. The admin console needs a rebuild for the unlocked toggle.
4. **Order matters:** the new app reads `games`. Production seeds `games` off (version 1), so deploying the app before step 2 would show members the placeholder.
5. **Live checks:**
   - `/api/game/status` returns `{enabled:true}`;
   - `/api/game/progress` returns 401 for guests and 403 for an untrusted origin on writes;
   - a signed-in run settles;
   - the Android/iOS bundles contain `game/runs`.
6. **Rollback:** restore the previous image and leave the tables. Set `games` off only if the game itself must stop.

## Verification (local, 19 October 2026)

- **Static checks:** TypeScript (app and server) and lint pass.
- **Replay:** `node --import ./server/game/register-ts.mjs scripts/validate-game.ts --mode both` replays all 20 levels in Rush and Calm to identical results and refuses tampered logs. `--react 3.5` covers failed runs.
- **Image check:** the same replay suite passes inside `node:22-bookworm-slim` (Node 22.23).
- **API:** `.local/game-sync/api.mjs` passes 26/26 settlement and integrity checks with the retained Alice/Bob accounts.
  - A burst of 100 requests also hits the general limit of 60 account writes a minute (429), as intended.
- **Browser:**
  - `.local/game-sync/e2e-account.mjs` (13/13, production web export, 0 page errors): a member clears Level 1 in one browser profile, and a fresh profile shows Level 2 and the credits. An offline finish is pending and then settles once; an offline start is practice.
  - `.local/game-e2e/e2e.mjs`: the guest flow still passes (24/24, 0 page errors).
- **Cleanup:** Alice and Bob were kept; their game rows were removed after testing.

## Open

- **"Eligible replay":** has no daily cap. A scripted client playing in real time can still earn 8 credits per replay. This is an owner economy decision.
- **Two devices before Phase B:** progress from a second device made before Phase B is not merged (once per account).
- **Not yet verified:** physical phones, and production.
