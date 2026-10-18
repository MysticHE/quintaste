import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { MarketModal } from "../market/MarketChrome";
import { useMember } from "../CommunityGate";
import { useRemote, useSessionHeaders } from "../../hooks/useRemote";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { usePreferences } from "../../state/Preferences";
import { ownListings, sellerState } from "../../services/market-api";
import { photoSource } from "../../services/community-api";
import { kindLabels } from "../../config/market";
import { money } from "../../utils/food-format";
import type { OwnListing } from "../../types/community";
import type { RecipeDraft, RecipeDraftIngredient } from "../../types/recipe-workspace";

export const shopLinkLimit = 10;
/**
 * The member's own Market items. Items load only for members with a shop (the shop state is the same cached request
 * Market uses). `loaded` is false until a list arrives, so links are never judged against a missing list.
 */
export function useOwnShopItems() {
  const { member } = useMember(), shop = useRemote(member ? "/api/market/seller" : null, sellerState);
  const seller = shop.data?.seller, open = !!seller && seller.status !== "removed" && seller.status !== "suspended";
  const remote = useRemote(open ? "/api/market/seller/listings" : null, ownListings);
  return { items: remote.data?.items ?? [], loaded: !!remote.data || (!!shop.data && !open) };
}
export type OwnShopItems = ReturnType<typeof useOwnShopItems>;
const words = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2);
const suggested = (ingredient: string, item: OwnListing) => { const a = words(ingredient), b = words(item.name); return a.some(word => b.includes(word)); };
const veganConflict = (item: OwnListing, draft: RecipeDraft) => draft.diet === "Vegan" && !item.diets.includes("vegan");
/** Why an item can't be linked to this line, or "". */
function blocker(item: OwnListing, draft: RecipeDraft, ingredient: RecipeDraftIngredient) {
  if (draft.ingredients.some(i => i.id !== ingredient.id && i.listingId === item.id)) return "Linked to another ingredient";
  if (veganConflict(item, draft)) return "Not declared vegan · Recipe is Vegan";
  return "";
}
/** Problem with an existing link, or "": shown on the card so the author can fix it before submitting. */
function linkProblem(linked: OwnListing | undefined, draft: RecipeDraft, loaded: boolean) {
  if (!loaded) return "";
  if (!linked || linked.status === "removed" || linked.status === "draft") return "Unavailable · Remove the link";
  if (veganConflict(linked, draft)) return "Not declared vegan · Recipe is Vegan";
  return linked.status === "paused" ? "Paused · Hidden from buyers" : "";
}
function Thumb({ item }: { item: OwnListing }) {
  const { theme } = usePreferences(), headers = useSessionHeaders(), source = photoSource(item.photos.item, headers);
  return <View style={[s.thumb, { backgroundColor: theme.muted }]}>{source ? <Image source={source} style={s.thumbImage} accessibilityIgnoresInvertColors /> : <Icon name="image-outline" size={18} color={theme.mutedForeground} />}</View>;
}
const itemLine = (item: OwnListing) => money(item.priceCents / 100) + " · " + kindLabels[item.kind];

/** Under an ingredient: the linked item with Unlink, or a quiet Link Shop Item row when the author has items on sale. */
export function IngredientShopLink({ draft, ingredient, shop: { items, loaded }, disabled, onChange }: {
  draft: RecipeDraft; ingredient: RecipeDraftIngredient; shop: OwnShopItems; disabled: boolean; onChange: (listingId: string | undefined) => void;
}) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), { focused, focusProps } = useKeyboardFocus();
  const linked = ingredient.listingId ? items.find(item => item.id === ingredient.listingId) : undefined;
  const onSale = items.filter(item => item.status === "active"), full = draft.ingredients.filter(i => i.listingId).length >= shopLinkLimit;
  if (ingredient.listingId) {
    const state = linkProblem(linked, draft, loaded);
    return <View style={[common.row, s.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
      {linked ? <Thumb item={linked} /> : <View style={[s.thumb, { backgroundColor: theme.muted }]}><Icon name="storefront-outline" size={18} color={theme.mutedForeground} /></View>}
      <View style={[common.flex, { minWidth: 0 }]}>
        <T numberOfLines={1} style={common.bold}>{linked?.name || "Linked shop item"}</T>
        <T variant="small" muted numberOfLines={1} color={state ? theme.warning : undefined}>{state || (linked ? itemLine(linked) : "")}</T>
      </View>
      <IconButton label={"Unlink shop item from " + (ingredient.name || "ingredient")} icon="close" disabled={disabled} onPress={() => onChange(undefined)} />
    </View>;
  }
  if (!onSale.length || full) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={"Link shop item to " + (ingredient.name || "ingredient")} disabled={disabled} onPress={() => setOpen(true)} {...focusProps}
      style={[common.row, s.linkRow, { borderColor: focused ? theme.accent : "transparent", opacity: disabled ? 0.5 : 1 }]}>
      <Icon name="storefront-outline" size={18} color={theme.accent} /><T color={theme.accent} style={common.bold}>Link Shop Item</T>
    </Pressable>
    <ShopItemPicker visible={open} draft={draft} ingredient={ingredient} items={onSale} onClose={() => setOpen(false)} onPick={id => { setOpen(false); onChange(id); }} />
  </>;
}
function ShopItemPicker({ visible, draft, ingredient, items, onClose, onPick }: {
  visible: boolean; draft: RecipeDraft; ingredient: RecipeDraftIngredient; items: OwnListing[]; onClose: () => void; onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState(""), term = query.trim().toLowerCase();
  const shown = items.filter(item => !term || item.name.toLowerCase().includes(term));
  const top = term ? [] : shown.filter(item => suggested(ingredient.name, item)), rest = shown.filter(item => !top.includes(item));
  const group = (title: string, rows: OwnListing[]) => !!rows.length && <View style={{ gap: 4 }}>
    <T variant="small" muted accessibilityRole="header" style={common.bold}>{title}</T>
    {rows.map(item => <PickerRow key={item.id} item={item} reason={blocker(item, draft, ingredient)} onPick={() => onPick(item.id)} />)}
  </View>;
  return <MarketModal visible={visible} onClose={onClose} label="Link Shop Item">
    {items.length > 5 && <Field label="Search your items" value={query} onChangeText={setQuery} maxLength={60} />}
    {group("Suggested", top)}{group(top.length ? "Your Items" : "Items On Sale", rest)}
    {!shown.length && <T variant="small" muted>No matching items.</T>}
  </MarketModal>;
}
function PickerRow({ item, reason, onPick }: { item: OwnListing; reason: string; onPick: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={item.name + ", " + itemLine(item) + (reason ? ". " + reason : "")} accessibilityState={{ disabled: !!reason }}
    disabled={!!reason} onPress={onPick} {...focusProps} style={[common.row, s.pickRow, { borderColor: focused ? theme.accent : "transparent" }]}>
    <Thumb item={item} />
    <View style={[common.flex, { minWidth: 0 }]}>
      <T numberOfLines={1} style={common.bold} color={reason ? theme.mutedForeground : undefined}>{item.name}</T>
      <T variant="small" numberOfLines={1} color={reason ? theme.warning : theme.mutedForeground}>{reason || itemLine(item)}</T>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  card: { gap: 10, borderWidth: 1, borderRadius: 12, paddingLeft: 8, minHeight: 56 },
  linkRow: { gap: 8, minHeight: 48, borderWidth: 2, borderRadius: 10, paddingHorizontal: 6, alignSelf: "flex-start" },
  pickRow: { gap: 10, minHeight: 56, borderWidth: 2, borderRadius: 10, paddingHorizontal: 4 },
  thumb: { width: 40, height: 40, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbImage: { width: "100%", height: "100%" },
});
