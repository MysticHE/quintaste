import { useState } from "react";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { Pressable, StyleSheet, View } from "react-native";
import { useMenus } from "../../state/Menus";
import { usePreferences } from "../../state/Preferences";
import type { MenuChange } from "../../types/explore-local";
import { emptyMenuChange } from "../../utils/menu-correction";
import { pilotPrice } from "../../utils/pilot-evidence";
import { Field, Icon, T, common } from "../ui";

const actions = [
  { value: "add", label: "Add", icon: "add-outline" },
  { value: "edit", label: "Edit", icon: "create-outline" },
  { value: "remove", label: "Remove", icon: "trash-outline" },
] as const;
export function MenuCorrectionFields({ value, change, placeId }: {
  value?: MenuChange; change: (value: MenuChange) => void; placeId: string;
}) {
  const { theme } = usePreferences(), { menus, busy, loaded, load } = useMenus();
  const [suggest, setSuggest] = useState(false), [focus, setFocus] = useState("");
  const current = value ?? emptyMenuChange();
  const summary = menus.find(menu => current.venueId ? menu.id === current.venueId : menu.googlePlaceId === placeId || menu.id === placeId);
  const { menu, busy: detailBusy, error: detailError, load: loadDetail } = useMenuDetail(summary?.id);
  const patch = (values: Partial<MenuChange>) => change({ ...current, ...values });
  const needle = current.originalName.trim().toLocaleLowerCase();
  const matches = menu?.sections.flatMap(section => section.items).filter(item => item.name.toLocaleLowerCase().includes(needle)).slice(0, 8) ?? [];
  return <View style={common.stack} testID="menu-correction-fields">
    <View accessibilityRole="radiogroup" accessibilityLabel="Menu change" style={s.actions}>
      {actions.map(action => <Pressable key={action.value} accessibilityRole="radio" accessibilityLabel={action.label + " dish"}
        aria-checked={current.action === action.value}
        accessibilityState={{ checked: current.action === action.value }}
        onFocus={() => setFocus(action.value)} onBlur={() => setFocus("")}
        onPress={() => { setSuggest(false); change({ ...emptyMenuChange(current.venueId), action: action.value }); }}
        style={({ pressed }) => [s.action, { backgroundColor: current.action === action.value || pressed ? theme.accentSoft : theme.card,
          borderColor: focus === action.value || current.action === action.value ? theme.accent : theme.border }]}>
        <Icon name={action.icon} size={18} color={theme.accent} /><T variant="small" style={common.bold}>{action.label}</T>
      </Pressable>)}
    </View>
    {current.action !== "add" && <View style={{ gap: 6 }}>
      <Field label={current.action === "edit" ? "Dish To Edit" : "Dish To Remove"} placeholder="Search or enter a dish name"
        value={current.originalName} maxLength={300} style={s.input} onFocus={() => setSuggest(true)}
        onKeyPress={event => { if (event.nativeEvent.key === "Escape") setSuggest(false); }}
        onChangeText={originalName => { setSuggest(true); patch({ originalName, itemId: "", originalPrice: "", name: originalName, category: "", price: "" }); }} />
      {suggest && needle.length >= 1 && matches.length > 0 && <View testID="menu-dish-suggestions" style={s.matches}>
        {matches.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={"Choose " + item.name}
          onPress={() => { setSuggest(false); patch({ venueId: menu!.id, itemId: item.id, originalName: item.name,
            originalPrice: pilotPrice(item), name: item.name, category: item.category ?? "", price: "" }); }}
          style={({ pressed }) => [s.match, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
          <View style={common.flex}><T variant="small">{item.name}</T><T variant="caption" muted>{pilotPrice(item)}</T></View>
          <Icon name="add-outline" size={18} color={theme.accent} />
        </Pressable>)}
      </View>}
      {(busy && !loaded || detailBusy && !menu) && <T variant="caption" muted>Loading listed dishes…</T>}
      {(!loaded || !!detailError) && !busy && !detailBusy && <Pressable accessibilityRole="button"
        onPress={() => { void load(true); void loadDetail(true); }} style={s.retry}>
        <T variant="small" color={theme.accent}>Retry listed dishes</T></Pressable>}
    </View>}
    {current.action !== "remove" && <>
      <Field label="Dish Name" maxLength={300} value={current.name} style={s.input} onChangeText={name => patch({ name })} />
      <Field label="Price In SGD (Optional)" placeholder="6.50" keyboardType="decimal-pad" maxLength={12}
        value={current.price} style={s.input} onChangeText={price => patch({ price })} />
      <Field label="Category (Optional)" placeholder="Rice, noodles, sides…" maxLength={100}
        value={current.category} style={s.input} onChangeText={category => patch({ category })} />
    </>}
  </View>;
}
const s = StyleSheet.create({
  input: { minHeight: 48 },
  actions: { flexDirection: "row", gap: 8 }, action: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  matches: { gap: 4 }, match: { minHeight: 52, padding: 10, borderRadius: 12, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 8 }, retry: { minHeight: 48, justifyContent: "center" },
});
