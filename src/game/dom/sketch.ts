/**
 * Sketch cards (docs/game/RECIPE_LEVELS_PLAN.md §8.6): a recipe level's ingredient or dish whose picture is not approved yet
 * plays as a plain card with its initials, clearly unfinished, until the painted picture arrives. Colours come from the
 * playfield's tokens; the card is an SVG data URL so the shelf and the Phaser canvas can both draw it.
 */
import { DISHES, STATIONS, type StationKind } from "../content/dishes";
import { ITEMS } from "../content/items";
import { token } from "./styles";

const initials = (name: string) => name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** One Sketch card: a dashed rounded card for an ingredient, a dashed bowl for a dish, a dashed jug for a station (240 by 320). */
export function sketchUri(name: string, kind: "ingredient" | "dish" | "station") {
  const card = token("--card"), edge = token("--panel-edge"), ink = token("--ink-2"), [w, h] = kind === "station" ? [240, 320] : [256, 256];
  const shape = kind === "dish"
    ? `<ellipse cx="128" cy="150" rx="104" ry="70" fill="${card}" stroke="${edge}" stroke-width="8" stroke-dasharray="18 12"/>`
    : kind === "station" ? `<rect x="40" y="24" width="160" height="272" rx="36" fill="${card}" stroke="${edge}" stroke-width="8" stroke-dasharray="18 12"/>`
    : `<rect x="20" y="20" width="216" height="216" rx="40" fill="${card}" stroke="${edge}" stroke-width="8" stroke-dasharray="18 12"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${shape}` +
    `<text x="${w / 2}" y="${kind === "dish" ? 170 : h / 2 + 22}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="64" fill="${ink}">${esc(initials(name))}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/** The art map with a Sketch card for every registered ingredient and dish that has no picture. Built-in art is untouched. */
export function withSketches(art: Record<string, string>): Record<string, string> {
  const out = { ...art };
  for (const it of Object.values(ITEMS)) if (!out[it.art]) out[it.art] = sketchUri(it.name, "ingredient");
  for (const d of Object.values(DISHES)) if (!out[d.art]) out[d.art] = sketchUri(d.name, "dish");
  for (const k of Object.keys(STATIONS) as StationKind[]) if (!out[STATIONS[k].art]) out[STATIONS[k].art] = sketchUri(STATIONS[k].name, "station");
  return out;
}
