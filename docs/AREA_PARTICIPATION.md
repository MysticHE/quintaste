# Area participation

Owner decisions, 17 October 2026 (PRD QT-013 to QT-015, journey J03): members opt in per layer to count their Home or Work planning area. Participation unlocks two things: areas with more members get their menus checked first, and areas show gathering suggestions ("Plan A Gathering Here"). The minimum disclosed group is **10** (owner lowered the PRD's proposed 20); bands are 10+, 20+, 50+ and 100+, updated weekly. Under 10 is "Not enough yet", never zero. Home and Work are separate layers and are never added together.

## Privacy rules
- Saving a Home or Work address never joins. "Count Me In" in Me > Location > Home/Work needs one confirmation and joins only that layer.
- The planning area is computed on the device from the saved point (`src/utils/planning-area.ts`); only the area code is sent. No address, unit or coordinates leave the device.
- Only signed-in, age-checked, unrestricted accounts are counted, once per layer. Leaving deletes the row and applies from the next weekly snapshot.
- The snapshot stores bands only, never exact counts. Old weeks are kept for 12 weeks.

## Implementation
- Server: `server/areas/` (`schema.sql`, `router.mjs`, `snapshot.mjs`, generated `planning-areas.json`). Mounted at `/api/areas` behind `featureGate('areas')`; `ops.control` key `areas` defaults to off. The snapshot job runs at start and every six hours and publishes once per Singapore (Monday) week under an advisory lock.
- Routes (members only): `GET /api/areas` latest snapshot; `GET /api/areas/me`; `PUT /api/areas/me/:layer` `{ area, confirmed: true }`; `DELETE /api/areas/me/:layer`.
- Client: Social > Areas tab (`src/screens/meet/Areas.tsx`), map (`src/components/areas/AreaMap.tsx`), Location editor switch (`src/components/areas/AreaParticipationRow.tsx`). The old development-only Area Participation screen was removed.
- Map: OneMap basemap tiles (Default in light, Night in dark; zoom 11 at full view, 12 when zoomed) under URA Master Plan 2025 planning-area outlines drawn with react-native-svg. No Google Maps key or native map module. Count bubbles sit at each area's centre (no people pins); the member's own area has a Home/Work marker. Zoom in/out, pan when zoomed, and a locate button.
- Geometry: `node scripts/build-planning-areas.mjs <geojson>` regenerates `src/data/planning-areas.ts` and `server/areas/planning-areas.json` from data.gov.sg "Master Plan 2025 Planning Area Boundary (No Sea)" (Singapore Open Data Licence, dataset updated 27 Feb 2026). Re-run when URA publishes new boundaries.
- Attribution shown under the map: "Map: OneMap © Singapore Land Authority · Areas: URA Master Plan 2025".

## Verification (local only, 17 October 2026)
- API with retained Alice/Bob: 13/13 (guest denied, confirmation required, invalid area/layer, untrusted origin, per-layer independence, account isolation, cleanup).
- Snapshot with 60 disposable fixture users, then removed: 7/7 (20 → 20+, 10 → 10+, 9 hidden, restricted and non-age-checked excluded, Work separate, published once per week).
- Browser (web export with accounts on, signed in as Alice): Home address → Tampines detected, confirmation sheet, join stored as `TM` only, Areas map with bubbles and Home marker, locate/zoom, area card, Plan A Gathering Here prefill. Light and dark checked.

## Deployment
Live since 17 October 2026 in app/preview `20261017-area-participation1`: schema applied with the operations role after backup, `ops.control` `areas` = true (audited), first weekly snapshot published. Rollback: set `areas` off, then restore `deployment-backups/20261017-area-participation1`; keep the additive tables.

## Not done
- Menu-research prioritisation must read `community.area_snapshot` in the QT editorial pipeline; that pipeline is outside this repository.
- Physical-device gestures (pan on iOS/Android inside the page scroll) and screen-reader use of the map are unverified; the Active Areas list is the accessible equivalent.
- Bubbles of neighbouring areas can overlap at full-island zoom; zooming in separates them.
