import { avatarStates, type Avatar, type AvatarFrames } from "../types/avatar";
export const avatarImageLimit = 220000;
export function avatarImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= avatarImageLimit
    && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
export function readAvatar(value: unknown): Avatar | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<Avatar>;
  if (v.sample === true && v.id === "sample-standard-v2") return { id: v.id, sample: true, recipe: "standard-v2", createdAt: 0, frames: { base: "sample" } };
  if (typeof v.id !== "string" || !/^[a-f0-9-]{36}$/.test(v.id) || v.recipe !== "standard-v2"
    || typeof v.createdAt !== "number" || !Number.isFinite(v.createdAt) || !v.frames || !avatarImage(v.frames.base)) return null;
  const frames: AvatarFrames = { base: v.frames.base };
  for (const state of avatarStates) if (avatarImage(v.frames[state])) frames[state] = v.frames[state];
  return { id: v.id, frames, recipe: "standard-v2", createdAt: v.createdAt };
}
export const sampleAvatar: Avatar = { id: "sample-standard-v2", sample: true, recipe: "standard-v2", createdAt: 0, frames: { base: "sample" } };
export const avatarExport = (avatar: Avatar | null) => avatar ? { id: avatar.id, recipe: avatar.recipe, createdAt: avatar.createdAt, sample: !!avatar.sample, frames: Object.keys(avatar.frames) } : null;
