import { avatarConsentVersion } from "../../types/avatar";
import { BodyError, readSmallJson } from "../read-json";
import { LocalServiceError } from "../local-explore/store";
import { avatarConfig, avatarOwner, checkAvatarAccess } from "./config";
import { normalizeSelfie } from "./images";
import { discardAvatarJob, getAvatarJob, startAvatarJob } from "./jobs";
export async function avatarStatus(request: Request) {
  const owner = await avatarOwner(request), config = avatarConfig(), allowed = config.allowed.includes(owner);
  return Response.json({ available: config.enabled && allowed, reason: !config.enabled ? "setup" : allowed ? "ready" : "device", deviceCode: owner });
}
export async function createAvatar(request: Request) {
  const { owner } = await checkAvatarAccess(request);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new LocalServiceError(415, "Use a supported photo upload.");
  let body: unknown;
  try { body = await readSmallJson(request, 5700000); }
  catch (error) { throw new LocalServiceError(error instanceof BodyError ? error.status : 400, "The photo upload could not be read."); }
  const value = body as { photo?: unknown; consent?: unknown; requestId?: unknown };
  if (!value || value.consent !== avatarConsentVersion || typeof value.requestId !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(value.requestId)) {
    throw new LocalServiceError(400, "Review the photo consent before generating.");
  }
  const photo = await normalizeSelfie(value.photo);
  try { return Response.json(await startAvatarJob(owner, value.requestId, photo), { status: 202 }); }
  catch (error) { photo.fill(0); throw error; }
}
export async function readAvatarJob(request: Request, remove = false) {
  const owner = await avatarOwner(request), id = new URL(request.url).searchParams.get("requestId") || "";
  if (!/^[A-Za-z0-9-]{16,80}$/.test(id)) throw new LocalServiceError(400, "Choose an avatar preview.");
  if (remove) { discardAvatarJob(owner, id); return Response.json({ deleted: true }); }
  return Response.json(getAvatarJob(owner, id));
}
