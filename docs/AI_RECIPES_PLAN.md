# AI recipes: request a dish, import a video — setup and phases (19 October 2026)

Owner direction, 19 October 2026: members get recipes two new ways, both AI-powered, both published to the same public Cook feed: (1) describe the dish they want and the app sources real recipes and writes the QuinTaste version; (2) paste a video link (YouTube, TikTok, Instagram, Facebook) and the app reads the video itself, not just the caption, and drafts the recipe in the app's structure. Runs on the current VPS with Gemini through the Cloudflare AI Gateway; the Gemini key lives only in Cloudflare.

## 1. Recommended setup

| Part | Choice | Why |
|---|---|---|
| Model | Gemini 2.5 Flash (video, audio and text in one call, JSON schema output, Google Search grounding); Gemini 2.5 Pro only for low-confidence retries | Reads the video frames and speech directly; cheapest capable model; one provider for both features |
| Model access | Cloudflare AI Gateway, Google AI Studio provider, BYOK: the Gemini key is stored in the gateway, the VPS sends only the existing gateway token | No new secret on the VPS; per-request logs, caching, rate limits and a spend ceiling in one dashboard |
| Video intake | YouTube by URL (Gemini fetches it, nothing downloaded); TikTok, Instagram, Facebook by fetching the public MP4 and sending it inline (≤ 20 MB); member file upload as the fallback when a platform blocks fetching | No ffmpeg or yt-dlp needed in Phase 1, so no Compose change; the upload path cannot be blocked by platforms |
| Jobs | Postgres table `recipes.ai_job`, in-process worker in the app server (same pattern as the avatar worker), one job at a time per process, idempotent by link | Fits the VPS today; the same table and worker move to separate containers when volume needs it |
| Publication | Jobs that pass checks publish straight into `recipes.recipe` as live member recipes with origin and credit; low-confidence results go to staff review in Admin > Content > Member recipes | Reuses the feed, recipe pages, reactions, hide/restore, reports and the nutrition section; no new content store |
| Nutrition | Server-side estimator (`server/nutrition/estimate.mjs`) from the reviewed table; unmatched lines go to a Gemini resolver that proposes a table key and gram weight | Every AI recipe gets figures and badges; numbers stay table-based and auditable |
| Checks | Vegetarian only (meat or fish rejects the job), five-pungent and egg/dairy/honey tags from ingredients, 1–8 servings, 1–40 ingredients, 1–30 steps, step references resolve, confidence threshold, duplicate link reuse | Same bar as member recipes; nothing publishes that the app cannot render |
| Credit | Video recipes name the creator and link the original; each step keeps a timestamp into the source ("watch at 1:23"); requested recipes list the pages used | Facts in our words plus credit and links; no re-hosting of video, frames or creator text |
| Limits | Per member: 3 jobs a day free (Plus raises it); per job: 10-minute video, 20 MB inline; global: monthly spend ceiling in the gateway, plus a daily job cap in `ops.control` notice | Cost stays bounded at any user count |

Expected cost: about US$0.005 per minute of video with Flash, a few cents per requested recipe (search grounding plus page reading). 20,000 jobs a month is roughly US$100–300.

## 2. Phases to production

**Phase 1 — Working feature (this build).** Schema, job API, in-process worker, Gemini client through the gateway, video import (YouTube by URL; TikTok, Instagram, Facebook by public MP4 fetch), request-a-dish with Google Search grounding, validators, nutrition estimate, publication into the feed with origin and credit, Cook tab entry ("Get a recipe"), job status list, quotas, feature control `ai_recipes`.

**Phase 2 — Trust and quality.** Second-pass verification against the video (corrections and confidence per field), Gemini ingredient resolver feeding the nutrition table with owner approval on Telegram, creator takedown and opt-out list, member reports into the case queue, staff console list of AI recipes with origin and cost, dedup across members by video id and content hash, long videos (chunking) and member file upload for blocked platforms.

**Phase 3 — Reach and scale.** Native share sheet (share a TikTok or Instagram post straight into QuinTaste), remote push notifications when a recipe is ready, Plus quotas and billing, worker moved to its own container with ffmpeg and yt-dlp for 20 MB+ videos, then to a Singapore cloud region when daily jobs pass a few thousand.

Phase 1 is production-usable behind the feature control; Phases 2 and 3 are what make it trustworthy at scale and marketable as Plus.

## 3. Storing the Gemini key (owner step)

Owner decision, 19 October 2026: the key is entered in the staff console, not in Cloudflare (Cloudflare's BYOK rejected both the AI Studio key and the Vertex service account).

1. Admin console → **Integrations** → "Gemini · AI recipes" → paste the Google AI Studio key (from https://aistudio.google.com/app/apikey) → reason → **Save key**. The console first asks Google for the model list with that key (no generation, no cost); a key Google rejects is not stored, and the message says why (invalid, project restricted or billing not linked, quota).
2. Then **Operations** → enable `recipes` (the member recipe feed the AI recipes publish into) and `ai_recipes`. Both can be turned off at any time; running jobs stop at their next check.

How it is protected: the key is encrypted with AES-256-GCM under `/docker/quintaste/admin-secrets/provider-secret-key` (32 random bytes, mode 0400, mounted read-only into the app and admin containers only), stored in `ops.provider_secret` with the provider name as associated data; the app role can only read the row, staff roles write it; the console shows only the last four characters; saving, replacing and removing are audited without the value; the app never logs it and redacts `AIza…` from any provider error it records. A database copy alone does not reveal the key. The Cloudflare gateway path remains as a fallback when no key is stored.

## 4. Known limits in Phase 1

- Residency: Google AI Studio processes requests in Google regions, not guaranteed Singapore (PRD QT-059 asks for Singapore processing); the owner chose the AI Studio key. Moving to Vertex AI in `asia-southeast1` later is a config change plus a service-account token in the gateway.
- Platform fetching for TikTok, Instagram and Facebook depends on their public pages and can fail; the job then asks the member to upload the saved video (Phase 2 UI) or try YouTube.
- Videos without speech and with fast cuts produce lower-confidence recipes; those go to staff review rather than straight to the feed.
- No cover photo: AI recipes show the category tile until a photo path is decided (creator thumbnails are not reused).
