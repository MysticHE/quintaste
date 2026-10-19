export const avatarStates = ["base", "blink", "mid", "open"] as const;
export type AvatarState = typeof avatarStates[number];
export type AvatarFrames = Partial<Record<AvatarState, string>> & { base: string };
/** standard-v2: a four-frame portrait. lotus-v1: an Adult or Mini form from a lotus breed (base, blink and talk frames). */
export type AvatarRecipe = "standard-v2" | "lotus-v1";
export type AvatarForm = "adult" | "mini";
export type Avatar = { id: string; frames: AvatarFrames; createdAt: number; recipe: AvatarRecipe; form?: AvatarForm; sample?: boolean };
export type AvatarJob = { id: string; status: "working" | "complete" | "failed" | "cancelled"; completed: number; message?: string; avatar?: Avatar };
export type AvatarAvailability = { available: boolean; reason: "ready" | "setup" | "device" | "signin"; deviceCode?: string; role?: 'master'|'member'; unlimitedUsage?: boolean };
export const avatarConsentVersion = "cloudflare-openai-selfie-v2";
