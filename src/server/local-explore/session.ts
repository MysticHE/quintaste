import { discardOwnerAvatars } from "../avatar/jobs";
import { randomBytes } from "node:crypto";
import { localScope, localToken, ownerIdentity } from "./http";
import { withLocalStore, tokenHash, LocalServiceError, localReviewerKey } from "./store";

export async function localSession(request: Request) {
  await localReviewerKey();
  const scope = localScope(request), native = request.headers.get("X-QuinTaste-Native") === "1";
  return withLocalStore(store => {
    const previous = localToken(request);
    const token = previous && /^[a-f0-9]{64}$/.test(previous) && store.owners[tokenHash(previous)]?.scope === scope ? previous : randomBytes(32).toString("hex");
    const identity = tokenHash(token);
    if (!store.owners[identity]) {
      if (Object.keys(store.owners).length >= 200) throw new LocalServiceError(507, "Local collections are full.");
      store.owners[identity] = { scope, createdAt: Date.now() };
    }
    const response = Response.json(native ? { mode: "local-development", token } : { mode: "local-development" });
    if (!native) response.headers.set("Set-Cookie", "qt_explore_" + scope + "=" + token
      + "; HttpOnly; SameSite=Strict; Path=/api/local-explore; Max-Age=31536000" + (new URL(request.url).protocol === "https:" ? "; Secure" : ""));
    return response;
  });
}
export async function deleteLocalOwner(request: Request) {
  await withLocalStore(store => {
    const token = localToken(request);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new LocalServiceError(401, "Local session unavailable. Retry.");
    // A revoked capability can retry deletion after a lost response or device-write failure.
    if (!store.owners[tokenHash(token)]) return;
    const owner = ownerIdentity(request, store);
    discardOwnerAvatars(owner);
    for (const [id, record] of Object.entries(store.cases)) if (record.owner === owner) delete store.cases[id];
    delete store.participation[owner + ":home"]; delete store.participation[owner + ":work"]; delete store.owners[owner];
  });
  return Response.json({ deleted: true });
}
