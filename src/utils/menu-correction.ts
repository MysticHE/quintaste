import type { CaseDraft, MenuChange } from "../types/explore-local";

export const emptyMenuChange = (venueId = ""): MenuChange => ({
  action: "add", venueId, itemId: "", originalName: "", originalPrice: "", name: "", price: "", category: "",
});
const limits = { venueId: 120, itemId: 120, originalName: 300, originalPrice: 100, name: 300, price: 12, category: 100 };
export const isMenuPrice = (value: string) => /^\d{1,4}(?:\.\d{1,2})?$/.test(value) && Number(value) <= 5000;
export function readMenuChange(value: unknown): MenuChange | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  if (typeof v.action !== "string" || !["add", "edit", "remove"].includes(v.action)) return;
  for (const [key, limit] of Object.entries(limits))
    if (typeof v[key] !== "string" || v[key].length > limit || /[\u0000-\u001f\u007f]/.test(v[key])) return;
  if ([v.venueId, v.itemId].some(id => id && !/^[a-z0-9][a-z0-9-]{2,119}$/.test(String(id)))) return;
  return { action: v.action as MenuChange["action"], ...Object.fromEntries(Object.keys(limits).map(key => [key, String(v[key]).trim()])) } as MenuChange;
}
export function menuChangeProblem(value: MenuChange | undefined) {
  const change = readMenuChange(value);
  if (!change) return "Choose a menu change.";
  if (change.action !== "add" && !change.originalName) return "Enter the dish to " + change.action + ".";
  if (change.action !== "remove" && !change.name) return "Enter the dish name.";
  if (change.price && !isMenuPrice(change.price))
    return "Enter a valid SGD price, such as 6.50.";
  return "";
}
export function caseContentProblem(draft: Pick<CaseDraft, "kind" | "category" | "menuChange" | "details">) {
  if (draft.kind === "correction" && draft.category === "Menu") {
    const problem = menuChangeProblem(draft.menuChange);
    if (problem) return problem;
    if (draft.menuChange?.action !== "remove") return "";
  }
  return draft.details.trim().length < 3 ? "Add a few details." : "";
}
