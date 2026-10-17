# Account setup and avatar UX — 16 October 2026

**Review correction:** the initial acceptance below missed stale subscribed session state. [The follow-up review fixes](REVIEW_FIXES.md) replace hydration with a checked subscription refetch and cover offline guest access, timer reconciliation across account remounts, profile updates and accurate Retry controls. Its regression evidence supersedes the earlier assertion that navigation alone established complete eligibility state.

Local documentation only. The owner's current instructions supersede the earlier multi-screen Google handoff, mandatory guest-copy decision and avatar cancellation UI.

## User journeys

- Returning Google user: Continue with Google → provider authentication → original app destination. New Google users confirm age once with a date picker before entering the app. No app-code confirmation or manual Finish action in the new client.
- Username signup: choose the username method → display name, DOB, username and password → save eight recovery codes → automatic sign-in and original destination. Credentials remain in component memory only until sign-in. If recovery-code preparation fails, continue to recovery settings without recreating the account.
- Existing adult accounts skip eligibility, including direct links to the former age-check route. A successful eligibility POST is followed by explicit session hydration; refresh retries do not request DOB again. Server validation still rejects malformed, impossible, future and under-18 dates and retains only the eligibility result.
- Android uses the native date spinner; iOS a native picker sheet; web the browser date input. The Expo SDK 57 compatible package is 9.1.0 and included in Expo Go. Profile bio and avatar are optional, outside the required sign-in path.
- Guest data import is optional in Me. It copies local guest data into the current account on this device, retaining guest originals and giving existing account notes precedence. It is not cloud food sync. No automatic import or empty-data interruption.
- Avatar selection saves automatically. One focused-screen success notice dismisses after four seconds; idle autosave labels are hidden. Errors remain actionable. Privacy details expand on request; affirmative consent and processor disclosure remain.
- Active generation has progress and no cancellation action. Native route/back removal is blocked while busy; leaving or reloading the client does not delete the job. The account-scoped request ID resumes polling without another generation POST. Failed storage restoration blocks new generation until recovery. Server DELETE rejects queued/working jobs with 409; completed temporary previews can still be cleaned up. Expiry, operational/security stops and account deletion remain possible.

## Persistence and security

Expo CLI's anonymous UUID was stored in preview `/home/node/.expo` tmpfs. Each replacement container generated a different manifest `extra.scopeKey`, changing Expo Go's local storage namespace. Deployment now preserves only the existing public UUID in the host-mounted `preview-expo-state/state.json`. It does not copy Expo credentials. Do not rotate this UUID or remove the mount on routine deploys. Existing session signing secrets, database, avatar key and encrypted library stay in place.

Sessions now last 30 days and renew after 12 hours of active use. Sign-out still revokes the session. Expiry, cleared app data, revoked accounts or a different app installation may still require sign-in. Old abandoned Expo scopes are not migrated; the scope active at deployment is preserved.

Native Google auto-return uses an exact allowlisted callback URI and a separate 256-bit browser-return secret. Token redemption needs both that secret and the app-held proof. A party holding only the original launch link/proof cannot collect a victim's session. Flow/ticket redemption remains atomic, short-lived, origin checked and rate limited. Callback secrets are hashed; handoff tickets remain encrypted. Existing Google signature/issuer/audience/nonce checks, pinned master Google subject, account isolation and quota policy remain. The previous manual handoff is retained only for already-shipped older clients.

## Verification and limits

Local browser fixture: `.local/account-ux-qa/browser.json`, nine passing groups across sign-in, import, avatar feedback/consent/resume, responsive library, fresh Google signup and username signup. DOB/password were absent from persistent browser storage. A destination-loss race found during username registration was corrected by retaining the destination in memory across the account navigation remount.

Typecheck, lint, production web export and Android/iOS Hermes compilation passed. Eighteen isolated production-server groups passed, including callback-secret theft/replay rejection, eligibility validation and persistence, recovery code creation, session survival across a fresh server process, sign-out revocation and active cancellation rejection. Five live browser checks passed using a synthetic account, which was deleted. Release `20261016-account-ux1` is live and healthy; both native manifests preserve the predeployment scopeKey, both bundles contain current UX markers, and live web-bundle bytes match the tested export. Evidence is under `.local/account-ux-deploy/` and `.local/account-ux-native/`; see the deployment runbook for the reconciled release. No customer photo, paid generation or customer credential was used. Browser fixtures and bundle transport do not establish physical Android/iOS picker, browser handoff or camera acceptance.

The Impeccable context check also reported older product/config metadata and a missing buildPath. These tooling metadata findings were left unchanged; this task does not migrate the design tooling schema.
