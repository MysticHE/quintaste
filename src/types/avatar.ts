export const avatarStates = ["base", "blink", "mid", "open"] as const;
export type AvatarState = typeof avatarStates[number];
export type AvatarFrames = Partial<Record<AvatarState, string>> & { base: string };
export type Avatar = { id: string; frames: AvatarFrames; createdAt: number; recipe: "standard-v2"; sample?: boolean };
export type AvatarJob = { id: string; status: "working" | "complete" | "failed" | "cancelled"; completed: number; message?: string; avatar?: Avatar };
export type AvatarAvailability = { available: boolean; reason: "ready" | "setup" | "device" | "signin"; deviceCode?: string; role?: 'master'|'member'; unlimitedUsage?: boolean };
export const avatarConsentVersion = "cloudflare-openai-selfie-v2";
