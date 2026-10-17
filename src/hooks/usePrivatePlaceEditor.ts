import { useEffect, useRef, useState } from "react";
import { useFood, localId } from "../state/Food";
import { useAutosave } from "./useAutosave";
import type { FoodDocument, PrivatePlace, PrivatePlaceKind } from "../types/food";
import type { LocationSuggestion, SearchPoint } from "../types/location-search";
import { privatePlaceFor, privatePlaceKind, readPrivatePoint, removePrivatePlace, savePrivatePlace } from "../utils/private-places";
import { followDefaultLocation } from "../utils/discovery-settings";

export type PlaceTarget = { id?: string; kind: PrivatePlaceKind };
type Draft = { label: string; address: string; details: string; point?: SearchPoint; postalCode?: string };
export const placeKindName = (kind: PrivatePlaceKind) => kind === "home" ? "Home" : kind === "work" ? "Work" : "";
export function findPlace(places: PrivatePlace[], target: PlaceTarget) {
  return target.id ? places.find(place => place.id === target.id) : target.kind !== "custom" ? privatePlaceFor(places, target.kind) : undefined;
}
const samePoint = (a?: SearchPoint, b?: SearchPoint) => a?.latitude === b?.latitude && a?.longitude === b?.longitude;

/** Edits one place whose kind is fixed by the row that opened it, so Home can never turn into Work. Saves once an address is chosen. */
export function usePrivatePlaceEditor(target: PlaceTarget) {
  const { doc, update, readable } = useFood();
  const [initial] = useState(() => findPlace(doc.privatePlaces, target));
  const [id] = useState(() => initial?.id ?? localId("private"));
  const kind = initial ? privatePlaceKind(initial) : target.kind;
  const [draft, setDraft] = useState<Draft>(() => ({ label: initial?.label ?? placeKindName(kind), address: initial?.address ?? "",
    details: initial?.details ?? "", point: readPrivatePoint(initial?.point), postalCode: initial?.postalCode }));
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const latest = useRef(draft), serial = useRef(0), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = async (change: (current: FoodDocument) => FoodDocument) => {
    const mine = ++serial.current, current = () => alive.current && mine === serial.current;
    setBusy(true); setError("");
    try {
      const okay = await update(change);
      if (!okay && current()) setError("Could not save. Your changes are still here.");
      return okay;
    } catch (problem) {
      if (current()) setError(problem instanceof Error ? problem.message : "Could not save.");
      return false;
    } finally { if (current()) setBusy(false); }
  };
  const persist = (next: Draft) => {
    const label = kind === "custom" ? next.label.trim() : placeKindName(kind);
    if (!readable || !label || !readPrivatePoint(next.point) || !next.address.trim()) return Promise.resolve(true);
    return run(current => {
      const before = current.privatePlaces.find(place => place.id === id);
      const places = savePrivatePlace(current.privatePlaces, { id, kind, label, address: next.address.trim(), details: next.details.trim(),
        point: next.point, postalCode: next.postalCode, isDefault: before?.isDefault ?? !current.privatePlaces.length });
      const isDefault = places.find(place => place.id === id)?.isDefault === true;
      return { ...current, privatePlaces: places,
        discoverySettings: isDefault && !samePoint(readPrivatePoint(before?.point), next.point) ? followDefaultLocation(current.discoverySettings) : current.discoverySettings };
    });
  };
  // Typing is debounced so the whole collection is not rewritten on every keystroke; a chosen address saves at once.
  const autosave = useAutosave(persist);
  const change = (patch: Partial<Draft>, save = true, immediate = false) => {
    const next = { ...latest.current, ...patch }; latest.current = next; setDraft(next); setError("");
    if (save) autosave.change(next, immediate);
  };
  return { ...draft, kind, saved: doc.privatePlaces.find(place => place.id === id), busy: busy || autosave.saving, error, readable,
    choose: (item: LocationSuggestion) => {
      if (item.kind !== "address") { setError("Choose a street address or postal code."); return; }
      change({ address: item.address, point: { latitude: item.latitude, longitude: item.longitude }, postalCode: item.postalCode }, true, true);
    },
    changeAddress: (address: string) => change({ address, point: undefined, postalCode: undefined }, false),
    setLabel: (label: string) => change({ label }), setDetails: (details: string) => change({ details }),
    retry: () => autosave.change(latest.current, true),
    makeDefault: async () => (await autosave.flush(), run(current => ({ ...current, privatePlaces: current.privatePlaces.map(place => ({ ...place, isDefault: place.id === id })),
      discoverySettings: followDefaultLocation(current.discoverySettings) }))),
    // Write any pending edit first so the unmount flush cannot re-add the removed place.
    remove: async () => (await autosave.flush(), run(current => ({ ...current, privatePlaces: removePrivatePlace(current.privatePlaces, id) }))) };
}
