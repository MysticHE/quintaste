import { ownerIdentity } from "../local-explore/http";
import { LocalServiceError, withLocalStore } from "../local-explore/store";
export function avatarConfig() {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.AVATAR_IMAGE_MODEL || "gpt-image-2.5-sunburst";
  const enabled = process.env.NODE_ENV === "development" && process.env.AVATAR_ENABLED === "true" && !!key && ["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(model);
  const allowed = (process.env.AVATAR_ALLOWED_OWNERS || "").split(",").map((s: string) => s.trim()).filter((s: string) => /^[a-f0-9]{64}$/.test(s));
  return { key, model, enabled, allowed };
}
export async function avatarOwner(request: Request) {
  const url = new URL(request.url);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new LocalServiceError(403, "A secure connection is required for avatar photos.");
  }
  return withLocalStore(store => ownerIdentity(request, store), false);
}
export async function checkAvatarAccess(request: Request) {
  const owner = await avatarOwner(request), config = avatarConfig();
  if (!config.enabled) throw new LocalServiceError(503, "Avatar generation is not configured yet.");
  if (!config.allowed.includes(owner)) throw new LocalServiceError(403, "This device is not enabled for avatar generation.");
  if (!["gpt-image-2.5-sunburst", "gpt-image-2.5-flare"].includes(config.model)) throw new LocalServiceError(503, "Avatar generation is not configured yet.");
  return { owner, config };
}
