import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { Action } from "../Actions";
import { ListGroup, RowIcon } from "../GroupedList";
import { Sheet } from "../social/Sheet";
import { Button, Icon, T, common, type IconName } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** A recipe on the list: how many of its ingredients were added (`total` is unknown once the recipe is gone). */
export type ListRecipe = { id: string; name: string; count: number; total?: number; recipe?: Recipe };
/** What the list shows: everything, the items added by hand, or one recipe's items. */
export type RecipeFilter = { kind: "all" } | { kind: "own" } | { kind: "recipe"; id: string };

/**
 * One line that names what the list is showing, however many recipes are on it. It opens a sheet listing each recipe
 * with what was added from it, to show just that recipe's items or take them off the list. Removing asks in the sheet's
 * footer rather than in a second dialog, so the sheet never closes under another modal.
 */
export function ShoppingRecipePicker({ recipes, ownCount, total, value, disabled, onChange, onRemove, onClear }: {
  recipes: ListRecipe[]; ownCount: number; total: number; value: RecipeFilter; disabled: boolean;
  onChange: (value: RecipeFilter) => void; onRemove: (id: string) => Promise<boolean>; onClear: () => Promise<boolean>;
}) {
  const { theme } = usePreferences(), t = useT("cook"), tc = useT("common"), [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "all" } | { kind: "recipe"; id: string; name: string } | null>(null);
  const current = value.kind === "recipe" ? recipes.find(recipe => recipe.id === value.id) : undefined;
  const title = current?.name ?? (value.kind === "own" ? t("ownItems") : t("allRecipes"));
  const detail = current ? countText(current, t) : value.kind === "own" ? t("itemsCount", { n: ownCount }) : t("recipesSummary", { recipes: recipes.length, items: total });
  const close = () => { setOpen(false); setConfirm(null); };
  const choose = (next: RecipeFilter) => { onChange(next); close(); };
  const run = async () => {
    if (!confirm) return;
    if (confirm.kind === "all") { if (await onClear()) choose({ kind: "all" }); return; }
    if (await onRemove(confirm.id)) { setConfirm(null); if (current?.id === confirm.id) onChange({ kind: "all" }); }
  };
  const footer = confirm ? <View style={s.confirm}>
    <T>{confirm.kind === "all" ? t("clearListConfirm") : t("removeRecipeConfirm", { name: confirm.name })}</T>
    <Action label={confirm.kind === "all" ? t("clearAction") : t("removeFromList")} disabled={disabled} run={run} />
    <Button label={tc("keep")} variant="link" onPress={() => setConfirm(null)} />
  </View> : <Button label={t("clearWholeList")} variant="link" disabled={disabled} onPress={() => setConfirm({ kind: "all" })} />;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("showingFor", { name: title })} onPress={() => setOpen(true)}
      style={({ pressed }) => [common.row, s.picker, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
      <Thumb recipe={current?.recipe} icon={value.kind === "own" ? "create-outline" : current ? "restaurant-outline" : "albums-outline"} />
      <View style={[common.flex, { minWidth: 0 }]}>
        <T style={common.bold} numberOfLines={1}>{title}</T>
        <T variant="small" muted numberOfLines={1}>{detail}</T>
      </View>
      <Icon name="chevron-down" size={20} color={theme.mutedForeground} />
    </Pressable>
    <Sheet visible={open} onClose={close} title={t("recipesOnList")} footer={footer}>
      <ListGroup inset={64}>
        <Option icon="albums-outline" title={t("allItems")} detail={t("itemsCount", { n: total })} selected={value.kind === "all"} onPress={() => choose({ kind: "all" })} />
        {recipes.map(item => <Option key={item.id} recipe={item.recipe} icon="restaurant-outline" title={item.name} detail={countText(item, t)}
          selected={current?.id === item.id} onPress={() => choose({ kind: "recipe", id: item.id })}
          trailing={<Button label={t("removeFromList")} variant="link" disabled={disabled} onPress={() => setConfirm({ kind: "recipe", id: item.id, name: item.name })} />} />)}
        {ownCount > 0 && <Option icon="create-outline" title={t("ownItems")} detail={t("itemsCount", { n: ownCount })} selected={value.kind === "own"} onPress={() => choose({ kind: "own" })} />}
      </ListGroup>
    </Sheet>
  </>;
}
function countText(item: ListRecipe, t: ReturnType<typeof useT<"cook">>) {
  return item.total ? t("itemsOfRecipe", { n: item.count, total: item.total }) : t("itemsCount", { n: item.count });
}
function Option({ recipe, icon, title, detail, selected, onPress, trailing }: {
  recipe?: Recipe; icon: IconName; title: string; detail: string; selected: boolean; onPress: () => void; trailing?: React.ReactNode;
}) {
  const { theme } = usePreferences();
  return <View style={[common.row, s.option]}>
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
      style={({ pressed }) => [common.row, common.flex, s.choice, { opacity: pressed ? 0.7 : 1 }]}>
      <Thumb recipe={recipe} icon={icon} />
      <View style={[common.flex, { minWidth: 0 }]}>
        <T style={common.bold} numberOfLines={2}>{title}</T>
        <T variant="small" muted numberOfLines={1}>{detail}</T>
      </View>
      {selected && <Icon name="checkmark" size={20} color={theme.accent} />}
    </Pressable>
    {trailing}
  </View>;
}
/** The recipe's photo, or the shared soft icon tile for "All items", your own items and recipes without a photo. */
function Thumb({ recipe, icon }: { recipe?: Recipe; icon: IconName }) {
  return recipe ? <RecipeImage recipe={recipe} style={s.thumb} /> : <RowIcon name={icon} />;
}
const s = StyleSheet.create({
  picker: { gap: 12, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 16 },
  option: { gap: 4, paddingRight: 8 },
  choice: { gap: 12, minHeight: 64, paddingLeft: 12, paddingVertical: 10 },
  thumb: { width: 40, height: 40, borderRadius: 12, overflow: "hidden" },
  confirm: { gap: 8 },
});
