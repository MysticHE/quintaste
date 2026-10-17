import { StyleSheet, View } from "react-native";
import type { Ingredient } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { ingredientLine } from "../../utils/food-format";
import { Icon, T, common } from "../ui";

/** Read-only scaled ingredients; prepared items that could hide the reader's exclusions get a Check label tag. */
export function IngredientList({ ingredients, scale, flagged }: { ingredients: Pick<Ingredient, "id" | "name" | "amount" | "unit">[]; scale: number; flagged?: Set<string> }) {
  const { theme } = usePreferences();
  return <View style={{ gap: 8 }}>{ingredients.map(item => {
    const line = ingredientLine(item, scale), check = !!flagged?.has(item.id);
    return <View key={item.id} accessible accessibilityLabel={line.spoken + (check ? ". Check the label for your exclusions" : "")} style={[common.row, s.line]}>
      <T style={common.flex}>{line.text}</T>
      {check && <View style={[s.tag, { borderColor: theme.warning, backgroundColor: theme.warningSoft }]}>
        <Icon name="alert-circle-outline" size={14} color={theme.warning} /><T variant="small" color={theme.warning}>Check label</T>
      </View>}
    </View>;
  })}</View>;
}
const s = StyleSheet.create({
  line: { gap: 8, alignItems: "flex-start" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
});
