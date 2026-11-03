import { Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import type { Ingredient } from "../../types/food";
import type { ChosenSwap, SwapLine } from "../../types/swaps";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { ingredientLine, money } from "../../utils/food-format";
import { Icon, T, common } from "../ui";
import { useLanguage, useT, type Language } from "../../i18n";
import { shortName } from "../../utils/swaps";

/** Swaps on offer and chosen, by line id; `language` is the recipe's, which a swapped line's name follows. */
export type IngredientSwaps = {
  lines: ReadonlyMap<string, SwapLine>; chosen: ReadonlyMap<string, ChosenSwap>; language: Language;
  onOpen: (lineId: string) => void; onUndo: (lineId: string) => void;
};
type Line = Pick<Ingredient, "id" | "name" | "amount" | "unit" | "shop" | "suggested">;
/** How an original line shows with the member's swap: the swapped food, or the original marked left out. */
export function swapView<L extends Pick<Ingredient, "id" | "name" | "amount" | "unit">>(original: L, swaps?: IngredientSwaps) {
  const swap = swaps?.chosen.get(original.id), left = !!swap?.option.leave;
  const item: L = swap && !left ? { ...original, name: swap.option.name![swaps!.language], amount: swap.option.amount, unit: swap.option.unit, shop: undefined, suggested: undefined } : original;
  return { item, swap, left, offered: !swap && !!swaps?.lines.has(original.id) };
}
/**
 * Read-only scaled ingredients; prepared items that could hide the reader's exclusions get a Check label tag, AI-proposed amounts a
 * Suggested tag. With `swaps`, a line that has some gets a small swap button, and a swapped line reads "Instead of … · Undo".
 */
export function IngredientList({ ingredients, scale, flagged, swaps }: { ingredients: Line[]; scale: number; flagged?: Set<string>; swaps?: IngredientSwaps }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  return <View style={{ gap: 8 }}>{ingredients.map(original => {
    const { item, swap, left, offered } = swapView(original, swaps);
    const line = ingredientLine(item, scale, language), check = !left && !!flagged?.has(item.id), suggested = !swap && !!item.suggested && item.amount !== null;
    return <View key={item.id} style={s.item}>
      <View style={[common.row, s.line]}>
        <View accessible accessibilityLabel={(left ? t("leftOut") + ": " : "") + line.spoken + (suggested ? t("suggestedAmount") : "") + (check ? t("checkLabelSpoken") : "")} style={[common.row, common.flex, s.line]}>
          <T muted={left} style={[common.flex, left && s.struck]}>{line.text}</T>
          {suggested && <View style={[s.tag, { borderColor: theme.border }]}><T variant="small" muted>{t("suggested")}</T></View>}
          {check && <View style={[s.tag, { borderColor: theme.warning, backgroundColor: theme.warningSoft }]}>
            <Icon name="alert-circle-outline" size={14} color={theme.warning} /><T variant="small" color={theme.warning}>{t("checkLabel")}</T>
          </View>}
        </View>
        {!swap && item.shop && <ShopTag name={item.name} shop={item.shop} />}
        {offered && swaps && <SwapButton name={original.name} onPress={() => swaps.onOpen(item.id)} />}
      </View>
      {swap && swaps && <View style={[common.row, s.instead]}>
        <T variant="small" muted style={s.insteadText} numberOfLines={2}>{left ? t("leftOut") : t("insteadOf", { name: shortName(swap.original) })}{" · "}</T>
        <UndoLink name={swap.original} onPress={() => swaps.onUndo(item.id)} />
      </View>}
    </View>;
  })}</View>;
}
// Two offset exchange arrows on a 24 grid, drawn for this control (the stock glyph read thin and generic at this size).
const exchange = "M7 7.5h12.5M16 4l3.5 3.5L16 11M17 16.5H4.5M8 13l-3.5 3.5L8 20";
function SwapIcon({ color }: { color: string }) {
  // Every path owns its paint: native SVG can keep stale inherited paint (see QuinTasteIcon).
  return <Svg width={16} height={16} viewBox="0 0 24 24" {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}>
    <Path d={exchange} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
/** The small, muted swap control at the end of a line: the exchange arrows in a soft circle. */
export function SwapButton({ name, onPress }: { name: string; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  return <Pressable accessibilityRole="button" accessibilityLabel={t("swapFor", { name: shortName(name) })} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.swap, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.accentSoft : theme.muted }]}>
    {({ pressed }) => <SwapIcon color={pressed ? theme.accent : theme.mutedForeground} />}
  </Pressable>;
}
export function UndoLink({ name, onPress }: { name: string; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  return <Pressable accessibilityRole="button" accessibilityLabel={t("undoSwap", { name: shortName(name) })} hitSlop={{ top: 15, bottom: 15, left: 6, right: 12 }} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.undo, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.6 : 1 }]}>
    <T variant="small" color={theme.accent} style={common.bold}>{t("undo")}</T>
  </Pressable>;
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
  item: { gap: 2 },
  line: { gap: 8, alignItems: "flex-start" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  swap: { width: 28, height: 28, marginVertical: -3, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1.5 },
  struck: { textDecorationLine: "line-through" },
  instead: { alignItems: "center", flexWrap: "wrap", gap: 0 },
  insteadText: { flexShrink: 1 },
  undo: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 2 },
});
