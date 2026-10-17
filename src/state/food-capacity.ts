import type { FoodDocument } from "../types/food";

// Leave headroom below Android's ~2 MiB per-row CursorWindow limit.
export const foodDocumentByteLimit = 1_500_000;
export class FoodCapacityError extends Error {
  constructor() { super("Collection storage is full. Remove photos or unused items before adding more. This change was not saved."); }
}
export function utf8Bytes(value: string) {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const point = value.codePointAt(index)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (point > 0xffff) index++;
  }
  return bytes;
}
export function serializeFoodDocument(document: FoodDocument) {
  const serialized = JSON.stringify(document);
  if (utf8Bytes(serialized) > foodDocumentByteLimit) throw new FoodCapacityError();
  return serialized;
}

export function removeCollectionPhotos(document: FoodDocument, selected: string[]): FoodDocument {
  const updatedAt = Date.now();
  return { ...document,
    recipes: { ...document.recipes, drafts: document.recipes.drafts.map(d => selected.includes("recipe:" + d.id)
      ? { ...d, photo: undefined, steps: d.steps.map(s => ({ ...s, photo: undefined })), status: "draft", rights: false, policy: false, updatedAt,
        revision: d.status === "ready" || (document.cooking?.recipeId === d.id && document.cooking.recipeVersion === d.revision) ? d.revision + 1 : d.revision } : d) },
    market: { ...document.market, listings: document.market.listings.map(d => selected.includes("market:" + d.id)
      ? { ...d, photos: {}, status: "draft", updatedAt, ingredientInfo: d.ingredientInfo ? { ...d.ingredientInfo, reviewed: false } : undefined } : d) },
  };
}
