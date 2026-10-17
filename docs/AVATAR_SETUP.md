> **16 October avatar production update:** The avatar service now has a dedicated authenticated Cloudflare integration, encrypted temporary payloads and PostgreSQL jobs/budgets. Current deployment and acceptance evidence are in [AVATAR_PRODUCTION.md](AVATAR_PRODUCTION.md). This supersedes historical statements below that avatar generation is development-only or requires an OpenAI key on the VPS. Other AI/phase gates remain unchanged.

# Animated selfie avatars

**16 October VPS update:** The key-entry steps below apply to the laptop development pilot. The deployed app needs its key in `/docker/quintaste/runtime.env`; `.env.local` is not uploaded. The production avatar routes remain blocked and the key is absent. See [OPENAI_SETUP.md](OPENAI_SETUP.md) for the checked status, secure key location and remaining production work. This document stays local.

Implemented 15 October 2026 for the user-approved Roast Room portrait approach. This is a four-frame 2D portrait with a 3D appearance: neutral, blink, half-open mouth and open mouth. The app animates saved frames locally. Talking preview is a demonstration loop; it is not speech-synchronized lip movement.

Me > Your avatar offers photo selection, native camera, explicit OpenAI consent, private preview, Pause/Play, talking preview, Save, Undo and discard. A clearly labelled fictional sample works without a key. Saving changes only the current device collection; guest and local profile identities remain separate. There is no public avatar publishing or account sync.

## Add the key later

Setup is prepared with an empty key and generation disabled. Do not paste a key into chat or use an EXPO_PUBLIC_ variable.

1. Add an OpenAI project API key to OPENAI_API_KEY in the ignored .env.local file. Restrict its permissions to the Images operations required by the project and configure project usage alerts. Verify model access/organization verification in the OpenAI dashboard.
2. Start Expo and open Me > Your avatar > Show device code. Each browser/native installation and guest/profile scope has its own code.
3. From this repository, approve that code:
   node scripts/configure-avatar.mjs allow DEVICE_CODE
4. Enable the development pilot:
   node scripts/configure-avatar.mjs enable
5. Restart Expo, then use Check connection. Configuration changes are read only by the restarted process. Run node scripts/configure-avatar.mjs status to check presence without printing secrets.
6. Generate once, inspect all four frames for likeness/alignment/transparency and measure actual billed usage before increasing access. No paid live test was run during setup because the user will add the key later.

To stop new generations, run node scripts/configure-avatar.mjs disable and restart Expo. Revoke a compromised project key in OpenAI as well. In-flight provider work may still be charged.

The default fixed model is gpt-image-2.5-sunburst, quality high, 1024 x 1024, one image per call. gpt-image-2.5-flare is the only alternative allowed by configuration. Both model access and generated quality need a live test; the built-in image-generation session used for the approved samples does not guarantee identical API output.

## Mobile connection

The new photo API requires HTTPS, with an HTTP exception only for localhost/127.0.0.1/::1. A phone using a LAN HTTP address cannot upload selfies. Configure EXPO_PUBLIC_API_URL with the trusted HTTPS origin serving the same API. This variable is a public URL, never a secret. The server must see the HTTPS request URL; do not bypass this by accepting arbitrary forwarding headers.

The current backend is a **development pilot**, not a public image service. Keep the Expo development server on a trusted machine/network. Do not expose Metro to the public internet as the production backend. Existing local profiles are not verified production accounts; generation deliberately rejects NODE_ENV=production. A production release needs a deployed authenticated backend, shared durable job/budget storage, TLS, private object storage, retention/deletion operations and a reviewed deployment boundary. These were not silently replaced with local profile names.

## Implemented controls

- API key, provider prompts, style references and OpenAI calls live in server modules. No API key input or OpenAI credential exists in the mobile UI.
- Random owner capabilities are scoped to guest/profile. Web uses HttpOnly/SameSite cookies; native uses SecureStore. Explicit server-side hashed owner approval is required to spend. Knowing the displayed hash alone does not grant access.
- Origin/custom-header checks, owner authorization on create/read/delete, no-store responses, bounded uploads and per-owner/global request rate limits reuse the existing local API boundary.
- JPEG/PNG/WebP still photos only, at most 4 MiB and 25 megapixels. Decode and re-encode to at most 1024 pixels strips metadata; SVG, URLs, unreadable and animated inputs are rejected. Source photos are not written to server disk or application storage. OS picker caches and OpenAI retention are separate.
- One working job per owner, five retained jobs per process. A durable, locked ledger reserves all four calls **before** contacting OpenAI: 8 calls per owner and 20 calls globally per UTC day (two/five avatar attempts). Failed and cancelled attempts keep their reservation. These are call ceilings, not a dollar spending guarantee.
- A client request ID allows polling/recovery without re-uploading. Duplicate requests cannot reserve or pay again within the ledger day. Lost previews after a server restart are not automatically regenerated. Provider requests have no automatic retry and a three-minute timeout per frame.
- Cancellation prevents remaining calls, including when the upload response was lost. It is best effort for a provider call already started. Leaving the editor requests cancellation; offline cleanup may fail, so server previews expire after 15 minutes.
- Preview frames remain in server memory for at most 15 minutes. Successful frames are normalized to bounded WebP images, saved locally only on Save. Export includes avatar metadata/frame names, not the source photo or image bytes. Deleting the current collection clears its saved avatar and revokes pending server access.
- Fixed provider destination, model allowlist, fixed prompts, no arbitrary image URL fetch, redirects rejected, bounded provider responses and generic errors prevent client-controlled forwarding and secret/error-body exposure.
- Reduce Motion, background visibility and screen focus stop animation. A missing expression uses the base portrait; an unreadable base uses the existing chef.

## Verification and remaining gates

Run npm run typecheck, npm run lint and npm run test:avatar. Security tests use synthetic photos, a fake key and an intercepted provider; they make no OpenAI network calls. The seven grouped security checks and seven browser journeys pass, covering consent, Save/Undo/reload, lost-response recovery without another POST, cancellation, storage failure and Reduce Motion. TypeScript and Expo lint pass. The scoped browser axe scan reports zero violations and no page errors. Android expect-signature manifest and bundle return HTTP 200, with server provider code, prompts and private keys excluded. Browser results and native transport evidence are in .impeccable/review/avatar-*.json; avatar-gates.json records the checks.

Live model acceptance, real billed cost, native camera/permission handling, device rendering, VoiceOver/TalkBack, production authentication and public deployment remain unverified. The original PRD's manual Adult/Mini controls, full mesh/rig and on-device-only skin/hair extraction remain outside this user-selected implementation; see PRD_COVERAGE.md.

Dependency audit on 15 October 2026 reports 32 advisories (20 high, 12 moderate), inherited through the existing Expo/React Native toolchain. Sharp is not listed. No forced SDK downgrade or incompatible major upgrade was applied. The braces and node-forge advisories list no patched version; decode-uri-component has a 0.5.0 fix but the current Expo dependency range does not accept it. Review these as part of the SDK upgrade before public deployment. This setup is not a claim of absolute security.

## References and provenance

- [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Sunburst model](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
- [OpenAI API data policy](https://developers.openai.com/api/docs/guides/your-data)
- [Roast Room source](https://github.com/nateherkai/roast-room), MIT style references under server-assets/avatar with source/license records.
- Fictional sample prompts and origins: assets/avatar/provenance.json. Reusable generation recipe: ../skills/standard-avatar.
- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [decode-uri-component advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
