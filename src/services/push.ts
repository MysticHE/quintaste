import { communityRequest as call } from "./community-api";

/**
 * Phone alerts (server/community/push.mjs): the phone's Expo push token is registered for the signed-in member, who chooses
 * which kinds reach them. The web has no phone alerts; the phone version is push.native.ts.
 */
export const pushKinds = ["messages", "friends", "gifts", "dinners", "orders"] as const;
export type PushKind = typeof pushKinds[number];
/** "ok"; "store-app" when this build can't receive them (Expo Go on Android); "web". */
export type PushSupport = "ok" | "store-app" | "web";
export type PushResult = "on" | "denied" | "failed";
export const pushSupport = (): PushSupport => "web";
/** Asks for permission and registers this phone for member `userId`. */
export async function enablePush(_userId: string, _language: string): Promise<PushResult> { return "failed"; }
/** This phone stops getting the member's alerts. */
export async function disablePush(_userId: string): Promise<void> { /* No phone alerts on the web. */ }
/** Whether member `userId` turned alerts on on this phone. */
export async function pushIsOn(_userId: string): Promise<boolean> { return false; }
/** Registers the token again (it can change) when alerts are on; called once a session is restored. */
export async function refreshPush(_userId: string, _language: string): Promise<void> { /* No phone alerts on the web. */ }

export const pushSettingsKey = "/api/push/settings";
export const loadPushSettings = (signal: AbortSignal) => call<{ kinds: PushKind[]; off: PushKind[] }>(pushSettingsKey, { signal });
export const savePushSettings = (off: PushKind[]) => call<{ off: PushKind[] }>(pushSettingsKey, { method: "PUT", body: { off } });
