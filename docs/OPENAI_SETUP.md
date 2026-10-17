> **16 October avatar production update:** The avatar service now has a dedicated authenticated Cloudflare integration, encrypted temporary payloads and PostgreSQL jobs/budgets. Current deployment and acceptance evidence are in [AVATAR_PRODUCTION.md](AVATAR_PRODUCTION.md). This supersedes historical statements below that avatar generation is development-only or requires an OpenAI key on the VPS. Other AI/phase gates remain unchanged.

# OpenAI configuration and production status

Updated 16 October 2026. Local documentation only; excluded from releases and images.

## Chosen secret boundary

The original OpenAI API key belongs in the owner's Cloudflare account, not in this project's `.env.local`, the VPS `runtime.env`, an admin form or chat. The owner created account `5e0f948cf2161e20c0cdfe640c6cf48f`, gateway `quintaste`, and added an OpenAI Provider Key. The screenshot showed **Couldn't test key**; no specific error was supplied. That establishes a saved entry, not a validated connection.

Use alias `default`. Enable Authenticated Gateway. The VPS uses a separate Cloudflare token with **AI Gateway Run** permission, entered directly into:

```text
/docker/quintaste/admin-secrets/cloudflare-gateway-token
```

Do not grant AI Gateway Edit/Secrets Store management permissions to this runtime token. Cloudflare Run permissions are account-scoped and can invoke every gateway in that account, including stored provider keys. The token permits spending and is sensitive, even though it does not provide the original OpenAI key. Root/code-deployment access to the VPS can obtain or misuse this Run token. The independently controlled Cloudflare dashboard is the boundary keeping the original key outside this workspace/VPS, not encryption on the VPS.

Official references: [Cloudflare BYOK](https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/) and [gateway authentication and token scope](https://developers.cloudflare.com/ai-gateway/configuration/authentication/).

## Connection status

The deployed staff console is at https://admin-quintaste.srv1902914.hstgr.cloud/. Its owner-only Integrations page shows the non-secret account/gateway/alias, Run-credential presence and the result of a deliberately triggered connection check. It links to Cloudflare for key entry/rotation and has no OpenAI-key input or readback endpoint.

The fixed probe uses the provider-native Cloudflare OpenAI chat-completions endpoint, `gpt-4.1-mini`, a fixed non-personal prompt and an eight-token maximum. It may incur a small API charge, requires fresh staff MFA/reason and is limited to three checks per UTC day. Only safe status categories and HTTP status are stored, never response content or credentials. Provider authentication headers are deliberately absent so Cloudflare injects its stored provider key. The separate `cf-aig-authorization` header authenticates the gateway request.

At deployment verification, the Run-token file was empty and no live OpenAI call was performed. The existing Cloudflare warning is unresolved until an authenticated provider request succeeds. The dashboard does not infer success from the presence of a saved key or token.

## Customer AI remains disabled

A successful text probe does not activate the application's avatar generator or prove image-model permissions. The existing image pilot uses development-only local-owner authorization. Production `/api/local-explore` routes remain blocked and `AVATAR_ENABLED=false`. The admin feature control also refuses to enable AI before production acceptance.

Required work remains: account-bound create/read/cancel/delete authorization; durable jobs and atomic budget reservations; idempotency and recovery; bounded validated image uploads; metadata stripping; private media retention/deletion; provider-consent handling; controlled live image and billing tests; native-device acceptance. No general ChatGPT conversation feature is implemented by this connection check.

Keep the original provider key out of `EXPO_PUBLIC_` values, browser/mobile bundles, release archives, logs and model conversations. Local `.env.local` is never synchronized to the VPS. Earlier instructions suggesting `OPENAI_API_KEY` in `runtime.env` are superseded by the owner's Cloudflare isolation choice.

See [admin platform setup](ADMIN_PLATFORM.md), [VPS deployment](VPS_DEPLOYMENT.md) and [production readiness](PRODUCTION_READINESS.md).
