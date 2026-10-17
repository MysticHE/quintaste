import { timingSafeEqual } from "node:crypto";
import { readSmallJson, BodyError } from "../read-json";
import { localEnabled, LocalServiceError, localReviewerKey, tokenHash, type LocalStore } from "./store";
import type { LocalOwner } from "../../types/explore-local";

const rate = new Map<string, { at: number; count: number }>();
function allow(key: string, maximum: number) {
  const now = Date.now(), previous = rate.get(key);
  if (!previous || now - previous.at >= 60000) { rate.set(key, { at: now, count: 1 }); return; }
  if (previous.count >= maximum) throw new LocalServiceError(429, "Too many requests. Retry in a minute.");
  previous.count++;
  if (rate.size > 1000) for (const [id, entry] of rate) if (now - entry.at >= 60000) rate.delete(id);
}
export const localScope = (request: Request): LocalOwner => {
  const owner = request.headers.get("X-QuinTaste-Owner");
  if (owner !== "guest" && owner !== "profile") throw new LocalServiceError(400, "Choose a local collection.");
  return owner;
};
export function localToken(request: Request) {
  const bearer = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("Authorization") ?? "");
  if (request.headers.get("X-QuinTaste-Native") === "1") return bearer?.[1];
  const name = "qt_explore_" + localScope(request);
  return (request.headers.get("Cookie") ?? "").split(";").map(part => part.trim()).find(part => part.startsWith(name + "="))?.slice(name.length + 1);
}
export function ownerIdentity(request: Request, store: LocalStore) {
  const token = localToken(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new LocalServiceError(401, "Local session unavailable. Retry.");
  const identity = tokenHash(token), owner = store.owners[identity];
  if (!owner || owner.scope !== localScope(request)) throw new LocalServiceError(401, "Local session unavailable. Retry.");
  allow("owner:" + identity, 90);
  return identity;
}
export async function requireReviewer(request: Request) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  const key = await localReviewerKey();
  if (!token || !timingSafeEqual(Buffer.from(token), Buffer.from(key))) throw new LocalServiceError(403, "Review access required.");
}
export async function localJson(request: Request) {
  try { return await readSmallJson(request, 750000); }
  catch (error) { if (error instanceof BodyError) throw new LocalServiceError(error.status, "Check the submitted information."); throw error; }
}
export async function localRoute(request: Request, action: () => Promise<Response>, allowEmptyOwner = false) {
  try {
    if (request.headers.get("X-QuinTaste-Client") !== "explore") throw new LocalServiceError(403, "Request not allowed.");
    const origin = request.headers.get("Origin"), target = new URL(request.url);
    if (origin && origin !== target.origin) throw new LocalServiceError(403, "Request not allowed.");
    allow("global", 600);
    if (allowEmptyOwner) localScope(request);
    const emptyOwner = allowEmptyOwner && process.env.NODE_ENV === "development" && !localToken(request)
      && request.headers.get("X-QuinTaste-Records") === "none";
    if (!emptyOwner && !await localEnabled()) throw new LocalServiceError(503, "Local Explore services are unavailable.");
    const response = emptyOwner ? Response.json({ deleted: true }) : await action();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch (error) {
    const known = error instanceof LocalServiceError;
    return Response.json({ error: known ? error.message : "Local Explore services are unavailable." }, {
      status: known ? error.status : 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
