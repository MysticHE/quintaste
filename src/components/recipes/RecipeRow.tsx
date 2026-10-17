import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Card, T, common } from "../ui";
import { RecipeFit } from "./RecipeOverview";
import { IconButton } from "../food/Controls";
import { RecipeImage } from "./RecipeImage";
import { cookedStats } from "../../utils/recipe-browse";
export function RecipeRow({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const { doc, isSaved, toggleSave, readable } = useFood(), [busy, setBusy] = useState(false);
  const { width, fontScale } = useWindowDimensions(), { textMultiplier } = usePreferences();
  const thumbnail = width < 360 && textMultiplier * fontScale > 1 ? 56 : 88;
  const saved = isSaved("recipe", recipe.id), cooked = cookedStats(doc.recipes.cooked, recipe.id).count;
  const save = async () => { setBusy(true); try { await toggleSave("recipe", recipe.id); } finally { setBusy(false); } };
  return <Card style={{ padding: 10, gap: 0 }}>
    <View style={[common.row, { gap: 12, alignItems: "flex-start" }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Open recipe"
        style={({ pressed }) => [common.row, common.flex, { alignItems: "flex-start", opacity: pressed ? 0.7 : 1 }]}>
        <RecipeImage recipe={recipe} style={{ width: thumbnail, height: thumbnail === 56 ? 80 : 100, borderRadius: 10 }} />
        <View style={[common.flex, { gap: 4, paddingVertical: 2 }]}><T variant="subtitle">{recipe.name}</T>
          <T variant="small" muted>{[recipe.minutes + " min", recipe.servings + " servings", recipe.onePot ? "One pot" : "", cooked ? "Cooked " + cooked + "×" : ""].filter(Boolean).join(" · ")}</T>
          <RecipeFit recipe={recipe} />
        </View>
      </Pressable>
      <IconButton label={(saved ? "Unsave " : "Save ") + recipe.name} icon={saved ? "bookmark" : "bookmark-outline"}
        selected={saved} disabled={!readable || busy} loading={busy} onPress={() => void save()} />
    </View>
  </Card>;
}
