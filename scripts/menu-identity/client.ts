import { setTimeout as delay } from "node:timers/promises";
import { isRecord, validPlaceId } from "../menu-research-files";
import type { IdentityLedger } from "./ledger";
import type { IdentityRequestGate } from "./rate-limit";
import { IDENTITY_FIELDS } from "./types";
import type { Reservation, Resolution, TransientPlace } from "./types";

type Lookup = { place?: TransientPlace; reservation: Reservation; httpStatus: number | null; status?: Resolution["status"] };

function parsePlace(raw: unknown): TransientPlace | undefined {
  if (!isRecord(raw) || !validPlaceId(raw.id)) return;
  if (raw.displayName !== undefined && (!isRecord(raw.displayName) || typeof raw.displayName.text !== "string"
    || raw.displayName.text.length > 500)) return;
  if (raw.formattedAddress !== undefined && (typeof raw.formattedAddress !== "string" || raw.formattedAddress.length > 1000)) return;
  return raw as TransientPlace;
}

export async function lookupIdentity(key: string, placeId: string, ledger: IdentityLedger,
  isStopped: () => boolean, gate: IdentityRequestGate): Promise<Lookup> {
  for (let attempt = 0; ; attempt += 1) {
    if (isStopped()) throw new Error("Identity pass interrupted before request; prior reservations remain counted.");
    const reservation = await ledger.reserve(placeId);
    await gate.enter(isStopped);
    if (isStopped()) throw new Error("Identity pass interrupted before fetch; reservation remains counted.");
    let response: Response;
    try {
      response = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId), {
        method: "GET", headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": IDENTITY_FIELDS },
        signal: AbortSignal.timeout(20000), cache: "no-store", redirect: "error",
      });
    } catch {
      return { reservation, httpStatus: null, status: "network-error" };
    }
    if ([401, 403].includes(response.status)) {
      await response.body?.cancel();
      await ledger.complete({ placeId, queriedAt: reservation.at, completedAt: new Date().toISOString(),
        requestNumber: reservation.number, httpStatus: response.status, status: "http-error", candidates: [] });
      throw new Error("Google rejected Places access (HTTP " + response.status + "); lookup pass stopped.");
    }
    if (response.status === 429) gate.cooldown();
    if ([429, 503].includes(response.status) && attempt < 1) {
      await response.body?.cancel();
      await delay(3000);
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); return { reservation, httpStatus: response.status, status: "http-error" }; }
    try {
      const text = await response.text();
      const place = text.length <= 131072 ? parsePlace(JSON.parse(text)) : undefined;
      return { reservation, httpStatus: response.status, ...(place ? { place } : { status: "invalid-response" as const }) };
    } catch { return { reservation, httpStatus: response.status, status: "invalid-response" }; }
  }
}
