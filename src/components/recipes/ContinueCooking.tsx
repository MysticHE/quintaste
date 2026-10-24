import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "../food/Controls";
import { useOnAccent } from "../BrowseControls";
import { Icon, T, common } from "../ui";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { cookingRecipeById } from "../../utils/private-recipes";
import { useT } from "../../i18n";

/** The cooking session in progress: resume it, or end it (timers keep running). */
export function ContinueCooking() {
  const { doc, patchDocument } = useFood(), { theme, setNotice } = usePreferences(), onAccent = useOnAccent(), t = useT("cook");
  const session = doc.cooking, recipe = session && cookingRecipeById(session.recipeId, doc.recipes);
  if (!session || !recipe || session.step >= recipe.steps.length) return null;
  const total = recipe.steps.length, done = session.gathering ? 0 : session.step + 1;
  const where = session.gathering ? t("gatheringIngredients") : t("stepNOfTotal", { n: done, total });
  const resume = () => router.push("/cooking/" + recipe.id as never);
  const end = async () => { if (await patchDocument({ cooking: null })) setNotice({ text: t("cookingEnded") }); };
  return <View style={[s.card, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
    <View style={[common.row, { gap: 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("resumeCooking", { name: recipe.name })} onPress={resume}
        style={({ pressed }) => [s.play, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Icon name="play" size={22} color={onAccent} />
      </Pressable>
      <Pressable accessibilityElementsHidden importantForAccessibility="no" onPress={resume} style={[common.flex, { minWidth: 0 }]}>
        <T variant="subtitle" numberOfLines={2}>{recipe.name}</T>
        <T variant="small" muted>{where} · {t("servingCount", { n: session.servings })}</T>
      </Pressable>
      <IconButton label={t("endCooking", { name: recipe.name })} icon="close" onPress={() => void end()} />
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }} style={[s.track, { backgroundColor: theme.border }]}>
      <View style={[s.fill, { backgroundColor: theme.accent, width: `${Math.max(4, (done / total) * 100)}%` }]} />
    </View>
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 10 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
