import { useFood, localId } from "../state/Food";
import { usePreferences } from "../state/Preferences";
import { emptyRecipeDraft, publicationIssue, workspaceSizeIssue } from "../state/recipe-workspace";
import type { RecipeDraft, RecipeWorkspace } from "../types/recipe-workspace";
import type { FoodDocument } from "../types/food";
import { useLanguage, useT } from "../i18n";
export function useRecipeWorkspace() {
  const food = useFood(), { setNotice } = usePreferences(), t = useT("cook"), language = useLanguage();
  const change = async (fn: (value: RecipeWorkspace, document: FoodDocument) => RecipeWorkspace) => {
    try { return await food.update(current => { const recipes = fn(current.recipes, current), issue = workspaceSizeIssue(recipes, language); if (issue) throw new Error(issue); return { ...current, recipes }; }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : t("errorSaveFailed"), error: true }); return false; }
  };
  const create = async () => { const draft = emptyRecipeDraft(localId("recipe")); return await change(w => ({ ...w, drafts: [draft, ...w.drafts] })) ? draft.id : null; };
  const edit = (id: string, patch: Partial<RecipeDraft>) => change((w, current) => ({ ...w, drafts: w.drafts.map(d => d.id !== id ? d : { ...d, ...patch, id: d.id, revision: d.status === "ready" || (current.cooking?.recipeId === id && current.cooking.recipeVersion === d.revision) ? d.revision + 1 : d.revision, status: "draft", rights: false, policy: false, updatedAt: Date.now() }) }));
  const duplicate = async (id: string) => {
    const nextId = localId("recipe");
    const okay = await change(w => { const source = w.drafts.find(d => d.id === id); if (!source) throw new Error(t("errorRecipeUnavailable"));
      return { ...w, drafts: [{ ...source, id: nextId, title: (source.title + t("copySuffix")).slice(0, 100), revision: 1, rights: false, policy: false, status: "draft", updatedAt: Date.now() }, ...w.drafts] }; });
    return okay ? nextId : null;
  };
  // Leaving "ready" starts a new revision, as an edit does, so a submitted copy never matches a changed draft.
  const consent = (id: string, key: "rights" | "policy", value: boolean) => change(w => ({ ...w, drafts: w.drafts.map(d => d.id !== id ? d : { ...d, [key]: value, revision: d.status === "ready" ? d.revision + 1 : d.revision, status: "draft", updatedAt: Date.now() }) }));
  const prepare = (id: string) => change(w => ({ ...w, drafts: w.drafts.map(d => { if (d.id !== id) return d; const issue = publicationIssue(d, language); if (issue) throw new Error(issue); return { ...d, status: "ready", updatedAt: Date.now() }; }) }));
  const remove = (id: string) => change(w => ({ ...w, drafts: w.drafts.filter(d => d.id !== id) }));
  const shop = (recipeId: string, text: string) => change(w => w.shopping.some(n => n.recipeId === recipeId && n.text === text) ? w : { ...w, shopping: [...w.shopping, { id: localId("shopping"), recipeId, text: text.slice(0, 300), checked: false }] });
  return { ...food, workspace: food.doc.recipes, change, create, edit, consent, prepare, remove, shop, duplicate };
}
