import { useRef, useState } from "react";
import { Share, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { recipeFit } from "../../utils/recipe-dietary";
import { cookedStats } from "../../utils/recipe-browse";
import { ingredientLine, shortDate } from "../../utils/food-format";
import { IconButton } from "../food/Controls";
import { FitBadge } from "../food/Evidence";
import { Button, T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import * as Linking from "expo-linking";

export function RecipeFit({ recipe }: { recipe: Recipe }) {
  const { draft } = usePreferences();
  return <View style={{ alignSelf: "flex-start", maxWidth: "100%" }}><FitBadge fit={recipeFit(recipe, draft.diet, draft.excluded).fit} /></View>;
}
function bundledShareText(recipe: Recipe) {
  return recipe.name + "\n" + recipe.minutes + " min · " + recipe.servings + " servings\n" +
    recipe.ingredients.map(i => ingredientLine(i).text).join("\n") + "\n\n" +
    recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n") + (recipe.provenance ? "\n\nQuinTaste · Source-reviewed adaptation; not kitchen-tested.\n" + recipe.provenance.sources.join("\n") : "\n\nQuinTaste bundled recipe · Ingredient claims unreviewed.");
}
export function RecipeOverview({ recipe }: { recipe: Recipe }) {
  const { doc, isSaved, toggleSave, readable } = useFood();
  const { draft, theme } = usePreferences();
  const [info, setInfo] = useState(false), [fallback, setFallback] = useState(false), [failedLink, setFailedLink] = useState("");
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const saved = isSaved("recipe", recipe.id), result = recipeFit(recipe, draft.diet, draft.excluded);
  const cooked = cookedStats(doc.recipes.cooked, recipe.id), shareText = bundledShareText(recipe);
  const save = async () => {
    if (lock.current || !readable) return;
    lock.current = true; setBusy(true);
    try { await toggleSave("recipe", recipe.id); } finally { lock.current = false; setBusy(false); }
  };
  const share = async () => { try { await Share.share({ message: shareText }); } catch { setFallback(true); } };
  return <>
    <RecipeImage recipe={recipe} label style={{ width: "100%", aspectRatio: 2.4, borderRadius: 16 }} />
    <View style={[common.row, { gap: 6 }]}>
      <View style={[common.flex, { gap: 4, alignItems: "flex-start" }]}>
        <T variant="small" muted>{[recipe.minutes + " min", recipe.onePot ? "One pot" : "", cooked.count ? "Cooked " + cooked.count + "× · last " + shortDate(cooked.last) : ""].filter(Boolean).join(" · ")}</T>
        <RecipeFit recipe={recipe} />
      </View>
      <IconButton label={saved ? "Remove Saved Recipe" : "Save Recipe"} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable || busy} loading={busy} onPress={() => void save()} />
      <IconButton label="Share Recipe" icon="share-outline" onPress={() => void share()} />
      <IconButton label="Recipe Info" icon="information-outline" selected={info} onPress={() => setInfo(!info)} />
    </View>
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>Contains: {result.conflicts.join(", ")}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>Unconfirmed: {result.unknown.join(", ")}</T>}
    {info && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.author} · {recipe.language} · v{recipe.revision}</T>
      <T variant="small" muted>{recipe.provenance ? "Source-reviewed adaptation · Not kitchen-tested" : "Bundled recipe"} · {recipe.photo || recipe.image ? "Illustrative image" : "No photo yet"}</T>
      <T variant="small" muted>Updated {recipe.updatedAt}{recipe.provenance ? " · Reviewed by QT Manager" : " · Ingredient claims unreviewed"}</T>
      {recipe.provenance?.sources.map((url, index) => <Button key={url} label={"Recipe Source " + (index + 1)} variant="link" onPress={() => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); }} />)}
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!!recipe.adaptationNote && <T variant="small">{recipe.adaptationNote}</T>}
    </View>}
    {!!failedLink && <View style={{ gap: 6 }}><T variant="small">Link did not open. Select and copy:</T><T selectable>{failedLink}</T><IconButton label="Close Link" icon="close" onPress={() => setFailedLink("")} /></View>}
    {fallback && <View style={{ gap: 6 }}><T variant="small">Sharing unavailable. Select and copy:</T><T selectable>{shareText}</T><IconButton label="Close Share Text" icon="close" onPress={() => setFallback(false)} /></View>}
  </>;
}
