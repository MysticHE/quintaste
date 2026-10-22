/**
 * Small builders shared by the content files (dishes, items, levels and each chapter's file under content/chapters), so a chapter
 * can be written in its own file without importing the tables it adds to.
 */
import type { Dish, Slot, Stage, StationKind } from "./dishes";
import type { GameItem, GameLabel, ItemTag } from "./items";
import type { Order } from "./levels";

export const slot = (key: string, label: string, accepts: string[], optional = false): Slot => ({ key, label, accepts, optional });
/** A dish cooked on one station. */
export const one = (id: string, name: string, art: string, station: StationKind, stages: Stage[], remember: string, recipeId?: string): Dish =>
  ({ id, name, art, recipeId, remember, parts: [{ id, name, station, stages }] });

export const fresh = (id: string, name: string, art = id, tags?: ItemTag[], note?: string): GameItem => ({ id, name, art, tray: "fresh", tags, note });
export const pantry = (id: string, name: string, art = id, tags?: ItemTag[], label?: GameLabel, variant?: "A" | "B"): GameItem =>
  ({ id, name, art, tray: "pantry", tags, label, variant });

/** Orders for a chapter's levels: ids carry the chapter's prefix, so they never clash with another chapter's. */
export function orders(prefix: string) {
  let seq = 0;
  const o = (guest: string, dish: string, at: number): Order => ({ id: prefix + ++seq, guest, dish, at });
  /** Two guests who share one pot of `dish`. */
  const share = (a: string, b: string, dish: string, at: number): Order[] => { const first = o(a, dish, at), second = o(b, dish, at); return [{ ...first, party: first.id }, { ...second, party: first.id }]; };
  return { o, share };
}
