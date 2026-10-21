# AI Recipes

Current state, 21 October 2026. Members get a recipe two ways: describe a dish, or give a video (a link or a file from their phone). The recipe is written in QuinTaste's structure, checked, credited to its source and published to the Cook feed, or sent to staff review when it is unclear. Wanted recipes (`docs/COOK_DISCOVERY_PLAN.md`) use the same worker and always wait for staff review.

## 1. Two engines, one switch

| Engine | Who writes the recipe | Status |
|---|---|---|
| **Gemini** | The app server calls Gemini itself (`server/ai-recipes/gemini.mjs`) | Built and deployed. Default. |
| **QT bots** | QT Videomaker, a Hermes profile in the QT bot team, through `ops/qt-team/ai_recipes_bridge.py` | Deployed 21 Oct (release 20261021-bots1, bridge service running). Switch off: the live test showed the bots cannot watch video yet (§4). |

The switch is the **AI recipes by QT bots** control (`ai_recipes_bots`) in Admin > Operations. Off: Gemini writes new jobs. On: the QT bots do. Owner decision, 21 Oct: no automatic fallback between engines, so a bot failure fails the job and the result shows whether the bots work. Turning the switch off returns new jobs to Gemini. Jobs already with the bots are still finished when they answer.

Both engines feed the same checks and the same save step, so members see the same recipe page either way.

## 2. How a job runs

1. The member's request is queued in `recipes.ai_job`. Limits: 3 a day per member, 2 at once, a daily total across everyone in the `ai_recipes` control note (`daily=N`, 500 when unset).
2. The worker in the app server claims it. Several app replicas can share the queue.
3. **Video:** an upload is used as is. A link is downloaded with yt-dlp (pinned in the app image, no cookies or accounts), up to 20 minutes and 60 MB. YouTube blocks server downloads, so Gemini reads YouTube by its link.
4. **Writing:**
   - Gemini watches the video twice (draft, then a check against the video), or researches the dish with Google Search grounding.
   - QT bots: the app keeps the video on its disk and queues a task in `recipes.ai_bot_task`. The bridge claims it through signed routes, downloads the video and runs Hermes. Video tasks use the `video` toolset (`video_analyze`). Dish requests use the `web` toolset. The bridge posts the recipe JSON back. Videos over 30 MB, or in a format Hermes cannot read, are shrunk to 480p MP4 first.
5. **Checks (both engines):** vegetarian only, Vegan and five-pungent tags from the ingredients, 1–8 servings, up to 40 ingredients and 30 steps, step ingredients must exist, confidence below 0.6 goes to staff review.
6. **Photos:** real frames from the video file at each step. Gemini also reviews each frame and draws missing steps. The bots engine takes frames at the seconds the bots name, without a review or drawings. A YouTube video's own thumbnail becomes the cover.
7. **Nutrition** from the ingredient table. Gemini teaches the table unknown ingredient names. The bots engine leaves unknown names for the hourly nutrition refresh.
8. Saved to `recipes.recipe` as a live member recipe with origin and credit, or as pending for staff review.

## 3. Gemini setup (current)

- Model `gemini-3.8-flash` (`AI_RECIPES_MODEL`), falling back to `gemini-flash-latest` when Google retires a name. Step drawings use `gemini-3.1-flash-lite-image`.
- Key: Admin > Integrations > "Gemini · AI recipes". It is encrypted in `ops.provider_secret` under the provider-secret key file, the app role can only read it, and the console shows the last four characters. Without a stored key the app uses the Cloudflare AI Gateway. Video files and drawings need the stored key.
- Residency: Google AI Studio does not guarantee Singapore processing (PRD QT-059).

## 4. QT bots setup (done 21 Oct 2026) and live test

Order matters:

1. Back up, then apply `server/ai-recipes/schema.sql` with the operations role. It is additive and idempotent: it adds `recipes.ai_bot_task` and the `ai_recipes_bots` control, off.
2. Deploy the app and admin.
3. Run `python ops/qt-team/deploy_videomaker.py`. It creates the `qt-videomaker` Hermes profile with the same model as QT Cooker. It installs `qt-ai-recipes-bridge.service`, which runs the bridge in the Hermes container. Its output says whether Hermes lists `video_analyze` for the profile.
4. Turn on **AI recipes by QT bots** in Admin > Operations and try one dish request and one video.

The bridge signs with the key the bots already use for editorial publishing. The signed path keeps the two uses apart. Each bridge handles one task at a time. More bridges can run together, because each task goes to exactly one.

Live test, 21 Oct 2026, 03:34 to 03:38 UTC (switch on for four minutes, four videos under the owner's account, switch off after):

| Video | Result | Where it stopped |
|---|---|---|
| TikTok (Tiffy Cooks) | Failed | Download: TikTok refused the server ("Unexpected response from webpage request"). |
| Instagram (Tiffy Cooks reel) | Failed | Downloaded and handed to the bots. Hermes `video_analyze`: "Codex Responses does not support video_url input". |
| Facebook (Xiao's Kitchen) | Failed | Same as Instagram. |
| YouTube (vegan mapo tofu) | Failed | Download: YouTube asked the server to sign in ("confirm you're not a bot"). |

What this shows:
- The app side works end to end: handoff, signed claim, video download by the bridge, bot answer, job failure with the reason in `botError`, cleanup. Nothing reached Gemini.
- The bots' model is reached through the ChatGPT Codex sign-in, and Codex does not accept video input in Hermes. The bots answered honestly and wrote no recipe. Making the bots read video needs either a video-capable provider for Hermes's vision work, or turning the video into still frames and a transcript first (Codex reads images).
- TikTok and YouTube block the server's downloads; Instagram and Facebook downloaded. Member uploads avoid the download step.

Other behaviour: a task nobody claims fails after 10 minutes when no bridge is polling, otherwise after 3 hours in line; a claimed task has 30 minutes to answer.

## 5. Open items

- Owner: whether the bots engine becomes the default after testing, and whether Gemini code is then removed.
- Bots engine: video reading (see §4), then step drawings, frame review and nutrition name learning.
- Payments for the AI Cook plans are not connected (`paymentsLive = false`).
- Not built: share sheet into QuinTaste, push notice when a recipe is ready, creator opt-out list.
