import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "../food/Controls";
import { useOnAccent } from "../BrowseControls";
import { Icon, T, common } from "../ui";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { cookingRecipeById } from "../../utils/private-recipes";

/** The cooking session in progress: resume it, or end it (timers keep running). */
export function ContinueCooking() {
  const { doc, patchDocument } = useFood(), { theme, setNotice } = usePreferences(), onAccent = useOnAccent();
  const session = doc.cooking, recipe = session && cookingRecipeById(session.recipeId, doc.recipes);
  if (!session || !recipe || session.step >= recipe.steps.length) return null;
  const total = recipe.steps.length, done = session.gathering ? 0 : session.step + 1;
  const where = session.gathering ? "Gathering ingredients" : "Step " + done + " of " + total;
  const resume = () => router.push("/cooking/" + recipe.id as never);
  const end = async () => { if (await patchDocument({ cooking: null })) setNotice({ text: "Cooking ended" }); };
  return <View style={[s.card, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
    <View style={[common.row, { gap: 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={"Resume cooking " + recipe.name} onPress={resume}
        style={({ pressed }) => [s.play, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Icon name="play" size={22} color={onAccent} />
      </Pressable>
      <Pressable accessibilityElementsHidden importantForAccessibility="no" onPress={resume} style={[common.flex, { minWidth: 0 }]}>
        <T variant="small" color={theme.accent} style={[common.bold, s.kicker]}>CONTINUE COOKING</T>
        <T variant="subtitle" numberOfLines={2}>{recipe.name}</T>
      </Pressable>
      <IconButton label={"End cooking " + recipe.name} icon="close" onPress={() => void end()} />
    </View>
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: done }} style={[s.track, { backgroundColor: theme.border }]}>
      <View style={[s.fill, { backgroundColor: theme.accent, width: `${Math.max(4, (done / total) * 100)}%` }]} />
    </View>
    <T variant="small" muted>{where} · {session.servings} {session.servings === 1 ? "serving" : "servings"}</T>
  </View>;
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 10 },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  kicker: { letterSpacing: 0.6, fontSize: 11 },
  track: { height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
