# Platform requirements: startup intro and Expo Go preview

Written 19 October 2026. This records setup that any host must reproduce: a scaled-up VPS, another cloud or a container platform. Read it before moving, resizing or re-creating the `preview` service, and before changing the app's native splash, icon or audio configuration. [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) stays the operating procedure for the current VPS; this file is the list of requirements behind it.

## 1. Startup intro (inside the app)

The app ships everything the intro needs. No server is involved, but the native configuration must survive any rebuild (EAS or local).

| Requirement | Where | Why |
| --- | --- | --- |
| Native splash shows the plain brand background only (`assets/splash-blank.png`, light `#fffaf7`, dark `#29212d`) | `app.json` → `expo-splash-screen` | The Mochi Chef drops in from above an empty screen. A mascot on the native splash would show twice. |
| Opaque app icon `assets/icon.png`; Android adaptive foreground `assets/adaptive-icon.png` on `#ffe6d6` | `app.json` | iOS rejects transparent icons. Expo Go shows this icon on its own loading screen. |
| `expo-audio` plugin with `microphonePermission: false`, `recordAudioAndroid: false`, `enableBackgroundPlayback: false` | `app.json` | The plugin's defaults add microphone, RECORD_AUDIO and background-audio permissions that a 2-second intro must not request (store review risk). Re-check with `npx expo config --type introspect` after any SDK upgrade: Android should list only `MODIFY_AUDIO_SETTINGS` for audio. |
| `expo-haptics` | `package.json` | Light taps on the first two landings. Included in Expo Go. |

How it behaves (source: `src/components/splash/`):
- **Mounting:** `SplashIntro` mounts at the root of `src/app/_layout.tsx`, outside sign-in restore and every provider. It starts as soon as the code runs, after only two local reads: the device setting `@quintaste/intro-settings` (AsyncStorage) and the Nunito ExtraBold font.
- **Bounce:** it always plays to the end (`motion.ts`: landings at 520, 1050 and 1360 ms, settled at 1650 ms, wordmark visible by 2300 ms).
- **Hover:** if the app is not ready by then, the mochi rocks side to side on its feet until the root layout calls `markAppReady()`. That happens when preferences, fonts, the collection and navigation are ready, or when sign-in restore fails. It is capped at 15 s, so it can never block the app.
- **Off the JavaScript thread:** all motion is Reanimated 4 CSS keyframes. They run on the browser compositor or the phone's UI thread, so app loading cannot make them stutter. Keep it that way: do not move the bounce back to JS-driven shared values. Inside keyframes, use one transform entry per type; pivot with `transformOrigin` (`FEET_ORIGIN`), because a translate-rotate-translate pivot loses one translate.
- **Sound:** `assets/sounds/mochi-intro.wav` is synthesised to the landing times by `python -I scripts/make-intro-sound.py assets/sounds/mochi-intro.wav`. If the motion timings change, edit the times in that script and regenerate. Sound mixes with other audio and stays quiet in silent or vibrate mode. Browsers may block it before the first tap.
- **Settings:** the Sounds and Reduce Motion switches (Accessibility) are mirrored to the device key by `rememberIntroSettings`, because the intro runs before any account loads. The system reduce-motion setting also applies.
- **Mascot:** the Mochi Chef always keeps its original closed happy eyes (owner decision). Animate the body or the blush only.

## 2. Expo Go preview server

The `preview` service is not a static file host. It is Metro (`expo start --go`, `CI=1`, so no file watching) behind `deploy/preview-gateway.mjs`. **Metro compiles bundles on demand, the first time each is requested after the process starts.** Every deploy, restart or new instance therefore begins cold.

### What happened on 19 October 2026

The release `20261019-ci32-8a3e2c3` restarted the preview at 03:51:37 UTC. With `cpus: 0.75` and `--max-workers 1`, Metro then took **183 s** for the server render bundle, **187.5 s** for Android and **188 s** for web. The gateway passes `/status` through to Metro, so health checks timed out (5 s, start period 90 s) and the container showed unhealthy. Expo Go on the owner's phone failed to load the preview link: Traefik drops containers that are not healthy, so the preview route disappeared mid-build. It recovered without a restart once bundling finished: afterwards the manifest answered in 0.6 s and the 10.4 MB Android bundle downloaded in 3 s. Root causes: with one worker Metro transforms in its main thread, so `/status` stalls for the whole build; and a request to `/` without an `expo-platform` header started a server render plus a web bundle that competed with the phone's Android build (all three finished within 5 s of each other).

### Requirements on any host

1. **Prewarm after every start, before users arrive.** Request the Android and iOS manifests (`expo-platform: android|ios`, `accept: application/expo+json,application/json`), then download each manifest's launch bundle URL, one platform at a time. Allow about 300 s per request. Count a deploy as done only when these return 200. The preview no longer serves web (see 8), so there is no web bundle to warm; the production web entry is checked separately. *Status: live since 19 Oct 2026 (release `20261019-ci33-f3f27b4`): `deploy/preview-prewarm.sh`, run by `deploy/ci-deploy.sh` after the live checks. It warns (Actions annotation `Preview not warm`) instead of rolling back. Measured on that deploy at `cpus: 0.75`, one worker: Android 77 s, iOS 62 s, then manifest 0.6 s and bundle 2.7–3.7 s from outside. The container stayed healthy throughout.*
2. **Liveness is not readiness.** A cold start is normal. The liveness check must keep passing while Metro builds, and traffic must stay off an instance until its prewarm finishes. Today the gateway answers `/status` itself (`packager-status:running`, header `x-preview-status: busy`) when Metro misses a 3 s reply but is alive and answered within the last 10 minutes; a longer stall reports 503. The Compose `start_period` stays 90 s: raising it would not have helped, because the container is already healthy before the first bundle request and Docker counts every failure after the first success. On other platforms:
   - Kubernetes: a readiness probe gated on the prewarm, and a liveness probe with a long initial delay.
   - ECS, Azure Container Apps or Cloud Run: a health-check grace period, and only shift traffic after the new revision is warm.
   - Never let a platform kill or replace the container for being slow during its first build.
3. **No scale to zero.** Keep at least one warm instance. A scale-from-zero start costs the full cold build (about 2.5 minutes for both platforms on 19 Oct 2026).
4. **Every replica needs its own prewarm.** Metro caches in-process, so each new instance is cold. Prefer one instance. If you run more, warm each before adding it to the load balancer, and don't spread one device's manifest and bundle requests across replicas built from different images.
5. **CPU and memory.** Live on 19 Oct 2026: `cpus: 0.75`, `mem_limit: 1800m`, `NODE_OPTIONS=--max-old-space-size=1400`, `--max-workers 1`. Owner-approved next caps (prepared, applied only by a manual Compose release): preview `cpus: 1.5` with `--max-workers 2`, db `cpus: 0.5` → `0.75`, app stays 0.75, admin unchanged. Evidence: cgroup throttling at 04:0x UTC was preview 93% of periods since start, db 5.6% over 32 h, app 3.8%. Same-machine local Docker test (preview image of f3f27b4, same limits and env): one worker at 0.75 CPU, Android 131 s + iOS 128 s, `/status` only answered through the gateway's busy fallback (3.2 s); two workers at 1.5 CPU, Android 78 s + iOS 63 s (about 45% less), `/status` direct in under 0.32 s, peak 766 MiB, no OOM. VPS after the manual release `20261019-full1` (19 Oct 2026, preview 1.5 CPU, 2 workers, db 0.75 CPU): Android bundle 45 s, iOS 35 s (was 77 s and 62 s), container healthy throughout; CI redeploy `20261019-ci39-ff1a412` warmed the same way. The 0.75 is our own per-container cap, not the plan size: on 19 Oct 2026 the VPS had 2 vCPUs (AMD EPYC 9354P) and 8 GB RAM, shared by about 23 containers from several projects. The caps stop one project starving the others. Load average was about 1, so there is idle CPU most of the time. The preview needs CPU only while building; idle, it uses about 0%. Cold build time scales roughly with CPU. Keep the heap below the container limit.
6. **Public URL.** `EXPO_PACKAGER_PROXY_URL` must be the exact public HTTPS origin (`https://${PREVIEW_HOST}`). Expo Go uses `exps://${PREVIEW_HOST}`. TLS terminates at the proxy (Traefik today) and forwards to port 8080.
7. **State.** Mount `./preview-expo-state` at `/home/node/.expo` so Expo settings persist across restarts, and keep the `/tmp` and `/app/.expo` tmpfs mounts. The image must hold the exact release (no live source mounts): `CI=1` never reloads, so new code always means a new image and a cold start.
8. **Hardening carries over.** Keep `cap_drop: [ALL]`, `no-new-privileges`, the pid limit and the gateway's path allowlist (`/`, `/status`, manifests and bundles only). Only native traffic reaches Metro: `/` without an `android`/`ios` platform redirects to the web app, and `entry.bundle` requires `platform=android|ios`.

### When this server is no longer needed

Installed builds (EAS or app stores) load their own embedded bundle and never contact Metro. Once members use installed builds, the preview server is only for testing, and requirements 1–4 matter only to testers. The intro in section 1 applies to every build.

## Checklist for a move or resize

- [ ] `app.json` splash, icon, adaptive icon, and the `expo-audio` plugin flags unchanged. `npx expo config --type introspect` shows no RECORD_AUDIO, FOREGROUND_SERVICE or UIBackgroundModes audio.
- [ ] Preview prewarm runs after every start and gates "deploy done".
- [ ] Health check start or grace period covers the measured cold build. Readiness waits for the prewarm.
- [ ] Minimum one warm instance. No scale to zero. Each replica warmed before receiving traffic.
- [ ] Preview CPU and memory sized, and the cold build time measured on the new host (record it here).
- [ ] `EXPO_PACKAGER_PROXY_URL` and `PREVIEW_HOST` match the new public HTTPS hostname. Expo Go opens `exps://<host>`.
- [ ] `.expo` state volume, tmpfs mounts and container hardening carried over.
- [ ] First Expo Go open after a deploy shows "Bundling" only briefly, then the Mochi Chef intro.
