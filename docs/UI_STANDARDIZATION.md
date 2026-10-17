# Mobile controls and automatic settings

**VPS deployment, 16 October 2026:** Release `20261016-ui-standard1` is live for the app and Expo preview; see [current deployment](DEPLOYMENT_RUNBOOK.md). Live browser checks passed for settings persistence and failure/Retry, the five supplied surfaces and real account-profile autosave/reload/Retry. The temporary synthetic account was deleted and no paid generation was performed. Android manifest and bundle returned HTTP 200 with new UI markers; physical-device acceptance remains outstanding. Evidence and seven live screenshots are in `.local/ui-standardization-deploy/`. This supersedes the initial local-only deployment/account-write limitations below.

User direction: 16 October 2026, five supplied Android screenshots. Applies to the shared Expo app, including root-stack settings and the existing Cook, Explore, Social and Market surfaces.

## Research and decisions

- [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views) recommends a 48 × 48 dp touch target. Keep that target while reducing label size, border weight and padding. Compact never means a smaller essential tap target.
- [Material button guidance](https://developer.android.com/develop/ui/compose/components/button) differentiates filled, tonal, outlined and text actions by importance. Use a solid themed primary action, a single thin outline for secondary actions and a quiet text action for optional navigation. Existing semantic palette families remain authoritative.
- [Material typography](https://m3.material.io/styles/typography/applying-type) separates labels from headlines. Button labels use 16-unit Nunito SemiBold, with 18-unit leading icons. Section headings use 18, screen titles 23, body 16 and supporting text 13. Text scales with the existing device/user settings and wraps rather than clipping.
- [Material text-field documentation](https://github.com/material-components/material-components-android/blob/master/docs/components/TextField.md) supports persistent labels and contextual error/help text. Labels sit above the field; placeholders remain examples. Fields and action controls use a common 12-unit corner radius and a single border/padding layer.
- Automatic settings are an explicit owner requirement. Selections persist immediately; profile text uses an ordered 400 ms queue with blur/exit flushing. No separate Save/Apply action is needed for preferences, exclusions, accessibility, notification choices, private addresses or profiles. Saving/failure/retry states stay visible.

## Implementation contract

Shared controls use 48-unit minimum targets, 12-unit corners, one-unit outlines, 8-unit control-group gaps and 12-unit content gaps. The existing compact density now applies to every route. Both legacy/compact typography maps resolve the same source tokens. Primary buttons have one padding layer; busy states keep their labels alongside the spinner. Icons precede labels. Larger type may increase height.

Food choices/appearance/accessibility persist via an ordered preference queue. Failed writes keep current selections and expose Retry; unreadable saved preferences block overwrites until reload succeeds. Account/profile isolation uses the existing owner-keyed provider. Notification settings merge only the changed keys into the current document, preserving timer permission state; invalid quiet-hour text never overwrites a valid saved time.

Selecting a canonical private address saves one stable record automatically. Unit details and later edits update that record; incomplete address text does not replace a resolved address. Custom places also require a name. Address selection never opts into area participation. The explicit Add another place action starts a fresh form.

Social profile drafts may persist while incomplete only when invisible. Visibility still requires a valid completed adult-declared profile; invitation/member/capacity/block guards remain. Changing an active profile to an incomplete state pauses visibility. Account profile writes validate the current account identity before sending; account deletion retains its explicit confirmation.

Avatar selection and completed generation save automatically through the existing private library/editor. Photo permission, provider consent and Generate remain explicit actions. Generation is never an automatic consequence of a setting change. Paid retry, cancellation, library ownership and deletion confirmation remain separate existing behaviors.

Cases use an icon-only refresh with an accessible label and one New report action. Social's empty state uses Set up profile and a quieter Browse sample profiles text action. Creation, publication, sending, destructive confirmations and consent remain deliberate actions.

## Verification boundary

Current evidence belongs in `.impeccable/review/ui-standardization-*.json` and `ui-standard-*.png`. Browser evidence validates React Native Web, storage behavior and representative layouts; physical Android/iOS appearance, native keyboard/permissions and screen readers require device acceptance. No production deployment or paid provider generation is implied by this local redesign.

The [browser report](../.impeccable/review/ui-standardization-browser.json) passes 11 grouped checks: persistence/reload, rapid independent food selections, preference write failure/Retry, corrupt-load protection, appearance/accessibility, notification times, stable private-address editing, local profile text, avatar selection, Social profile drafts/visibility and representative responsive layouts. It covers 320/375/768/1440 widths, dark/enlarged type and all three palettes. Nine scoped accessibility scans have zero violations and browser runtime errors are zero. The horizontal Market category strip is intentionally scrollable; offscreen categories are excluded from viewport-overflow failures.

The [state report](../.impeccable/review/ui-standardization-state.json) passes four groups covering incomplete invisible drafts, invalid visibility/invitation guards, deliberate visibility changes and stable private-place identity/postal preservation. [Final gates](../.impeccable/review/ui-standardization-gates.json) record TypeScript/Expo lint exit 0 and no detector findings. [Android transport](../.impeccable/review/ui-standardization-native.json) returns manifest/bundle HTTP 200 with the new control/autosave markers. No Android device is attached. Connected account-profile autosave is source/typechecked; live account writes and real provider generation were not exercised.
