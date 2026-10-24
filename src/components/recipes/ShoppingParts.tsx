import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { ShoppingRow } from "../../utils/shopping";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useOnAccent } from "../BrowseControls";
import { fontNames } from "../../theme/tokens";
import { useT } from "../../i18n";

/** One aisle: a titled card of items. */
export function ShoppingAisle({ title, rows, recipeName, disabled, onToggle }: {
  title: string; rows: ShoppingRow[]; recipeName: (id: string) => string; disabled: boolean; onToggle: (row: ShoppingRow) => void;
}) {
  const { theme } = usePreferences();
  return <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
    {!!title && <T variant="small" muted accessibilityRole="header" style={[common.bold, s.heading]}>{title}</T>}
    {rows.map((row, index) => <ShoppingItem key={row.key} row={row} first={index === 0 && !title} recipeName={recipeName} disabled={disabled} onToggle={() => onToggle(row)} />)}
  </View>;
}
/** Tick to move an item into the basket; the recipes it is for sit under the name, the amount on the right. */
function ShoppingItem({ row, first, recipeName, disabled, onToggle }: { row: ShoppingRow; first: boolean; recipeName: (id: string) => string; disabled: boolean; onToggle: () => void }) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  const forText = row.recipeIds.map(recipeName).join(" · ");
  return <View>{!first && <View style={[s.divider, { backgroundColor: theme.divider }]} />}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: row.checked, disabled }} accessibilityLabel={row.spoken + (forText ? t("forRecipes", { list: forText }) : "")}
    disabled={disabled} onPress={onToggle} {...focusProps}
    style={({ pressed }) => [common.row, s.item, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    <View style={[s.check, row.checked ? { backgroundColor: theme.success, borderColor: theme.success } : { borderColor: theme.mutedForeground }]}>
      {row.checked && <Icon name="checkmark" size={16} color={onAccent} />}
    </View>
    <View style={[common.flex, { minWidth: 0 }]}>
      <T style={[common.bold, row.checked && { textDecorationLine: "line-through", color: theme.mutedForeground }]}>{row.name}</T>
      {!!forText && !row.checked && <T variant="small" muted numberOfLines={1}>{forText}</T>}
    </View>
    {!!row.qty && <View style={[s.qty, { backgroundColor: row.checked ? theme.muted : theme.accentSoft }]}>
      <T variant="small" style={common.bold} color={row.checked ? theme.mutedForeground : theme.accent}>{row.qty}</T></View>}
  </Pressable></View>;
}
/** The add box: type an item, press the + or the keyboard's return. */
export function AddItemField({ disabled, busy, onAdd }: { disabled: boolean; busy: boolean; onAdd: (text: string) => Promise<boolean> }) {
  const { theme, textMultiplier } = usePreferences(), onAccent = useOnAccent(), [text, setText] = useState(""), [focused, setFocused] = useState(false), t = useT("cook");
  const ready = !!text.trim() && !disabled && !busy;
  const add = async () => { if (ready && await onAdd(text.trim())) setText(""); };
  return <View style={[common.row, s.add, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <TextInput value={text} onChangeText={setText} placeholder={t("addAnItem")} accessibilityLabel={t("addAnItem")} editable={!disabled} maxLength={300}
      onSubmitEditing={() => void add()} returnKeyType="done" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent} underlineColorAndroid={theme.transparent}
      style={[common.flex, s.input, { color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier }]} />
    <Pressable accessibilityRole="button" accessibilityLabel={t("addItem")} accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => void add()}
      style={({ pressed }) => [s.plus, { backgroundColor: ready ? theme.accent : theme.muted, opacity: pressed ? 0.8 : 1 }]}>
      <Icon name="add" size={24} color={ready ? onAccent : theme.mutedForeground} />
    </Pressable>
  </View>;
}
const s = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  heading: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 2, letterSpacing: 0.4 },
  item: { gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  qty: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  add: { gap: 6, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 5, minHeight: 56 },
  input: { outlineWidth: 0, outlineStyle: "solid", paddingVertical: 12, minWidth: 0 },
  plus: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
