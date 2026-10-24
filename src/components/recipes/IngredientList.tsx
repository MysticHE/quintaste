import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { Ingredient } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { ingredientLine, money } from "../../utils/food-format";
import { Icon, T, common } from "../ui";
import { useLanguage, useT } from "../../i18n";

/** Read-only scaled ingredients; prepared items that could hide the reader's exclusions get a Check label tag, AI-proposed amounts a Suggested tag. */
export function IngredientList({ ingredients, scale, flagged }: { ingredients: Pick<Ingredient, "id" | "name" | "amount" | "unit" | "shop" | "suggested">[]; scale: number; flagged?: Set<string> }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  return <View style={{ gap: 8 }}>{ingredients.map(item => {
    const line = ingredientLine(item, scale, language), check = !!flagged?.has(item.id), suggested = !!item.suggested && item.amount !== null;
    return <View key={item.id} style={[common.row, s.line]}>
      <View accessible accessibilityLabel={line.spoken + (suggested ? t("suggestedAmount") : "") + (check ? t("checkLabelSpoken") : "")} style={[common.row, common.flex, s.line]}>
        <T style={common.flex}>{line.text}</T>
        {suggested && <View style={[s.tag, { borderColor: theme.border }]}><T variant="small" muted>{t("suggested")}</T></View>}
        {check && <View style={[s.tag, { borderColor: theme.warning, backgroundColor: theme.warningSoft }]}>
          <Icon name="alert-circle-outline" size={14} color={theme.warning} /><T variant="small" color={theme.warning}>{t("checkLabel")}</T>
        </View>}
      </View>
      {item.shop && <ShopTag name={item.name} shop={item.shop} />}
    </View>;
  })}</View>;
}
/** The author's Market item for this line, shown only while it is on sale; opens that exact item. */
function ShopTag({ name, shop }: { name: string; shop: NonNullable<Ingredient["shop"]> }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), price = money(shop.priceCents / 100), t = useT("cook");
  return <Pressable accessibilityRole="link" accessibilityLabel={t("buyFromShop", { name, price })} hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
    onPress={() => router.push({ pathname: "/market/listing/[id]", params: { id: shop.listingId } })} {...focusProps}
    style={({ pressed }) => [s.tag, { borderColor: focused ? theme.foreground : theme.accent, backgroundColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
    <Icon name="storefront-outline" size={14} color={theme.accent} /><T variant="small" color={theme.accent} style={common.bold}>{price}</T>
  </Pressable>;
}
const s = StyleSheet.create({
  line: { gap: 8, alignItems: "flex-start" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
});
