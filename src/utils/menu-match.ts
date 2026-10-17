import type { LivePlace } from "../types/discovery";
import type { PublishedMenu } from "../types/menus";
type MenuIdentity = Omit<PublishedMenu, "sections">;

const words = (value: string) => value.normalize("NFKD").toLowerCase()
  .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const street = (value: string) => words(value).replace(/\brd\b/g, "road")
  .replace(/\bst\b/g, "street").replace(/\bave\b/g, "avenue");
function unit(value: string) {
  const match = value.match(/#\s*(b?\d{1,3})\s*-\s*([a-z]?\d+[a-z]?(?:\s*(?:\/|-|to)\s*[a-z]?\d+[a-z]?)*)(?![a-z\d/-])/i);
  return match?.slice(1).map(part => part.toLowerCase().replace(/\s+/g, "").replace(/to|-/g, "/")
    .replace(/(^|[a-z/])0+(?=\d)/g, "$1")).join("-");
}
const postal = (value: string) => value.match(/\b\d{6}\b/g) ?? [];

export function menuMatchesPlace(menu: MenuIdentity, place: Pick<LivePlace, "placeId" | "name" | "address" | "opening">) {
  if (place.opening === "permanently-closed") return false;
  if (menu.googlePlaceId) return menu.googlePlaceId === place.placeId;
  const name = " " + words(place.name) + " ";
  if (![menu.name, ...menu.aliases].some(alias => name.includes(" " + words(alias) + " "))) return false;
  const expectedUnit = unit(menu.address), actualUnit = unit(place.address);
  if (expectedUnit && actualUnit && expectedUnit !== actualUnit) return false;
  const codes = postal(place.address);
  if (codes.length) return codes.length === 1 && codes[0] === menu.postalCode;
  const expectedStreet = street(menu.address.split("#")[0]);
  return !!expectedUnit && expectedUnit === actualUnit && (" " + street(place.address) + " ").includes(" " + expectedStreet + " ");
}

export function menuForPlace<T extends MenuIdentity>(menus: T[], place: Pick<LivePlace, "placeId" | "name" | "address" | "opening">) {
  const matches = menus.filter(menu => menuMatchesPlace(menu, place));
  return matches.length === 1 ? matches[0] : undefined;
}

