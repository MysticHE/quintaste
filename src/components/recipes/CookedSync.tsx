import { useFood } from "../../state/Food";
import { useCookedSync } from "../../hooks/useReactions";

/** Renders nothing: reports recipes finished in Cook mode so "Cooked by N" counts this member once per recipe. */
export function CookedSync() {
  const { doc } = useFood();
  useCookedSync(doc.recipes.cooked.map(entry => entry.recipeId));
  return null;
}
