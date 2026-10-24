import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { aisleKeys, type ShoppingRow } from "../../utils/shopping";
import { searchIngredients, type LibraryIngredient } from "../../utils/ingredient-library";
import { Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useOnAccent } from "../BrowseControls";
import { ListGroup } from "../GroupedList";
import { fontNames } from "../../theme/tokens";
import { useT } from "../../i18n";

/** One aisle: a heading with its count above a card of items (the basket passes no title). */
export function ShoppingAisle({ title, rows, recipeName, showRecipes, disabled, onToggle }: {
  title: string; rows: ShoppingRow[]; recipeName: (id: string) => string; showRecipes: boolean; disabled: boolean; onToggle: (row: ShoppingRow) => void;
}) {
  return <ListGroup title={title || undefined} aside={title ? String(rows.length) : undefined} inset={52}>
    {rows.map(row => <ShoppingItem key={row.key} row={row} recipeName={recipeName} showRecipes={showRecipes} disabled={disabled} onToggle={() => onToggle(row)} />)}
  </ListGroup>;
}
/** Tick to move an item into the basket; the amount sits quietly on the right, the recipes under the name when there are several. */
function ShoppingItem({ row, recipeName, showRecipes, disabled, onToggle }: {
  row: ShoppingRow; recipeName: (id: string) => string; showRecipes: boolean; disabled: boolean; onToggle: () => void;
}) {
  const { theme } = usePreferences(), onAccent = useOnAccent(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook");
  const forText = row.recipeIds.map(recipeName).join(" · ");
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: row.checked, disabled }}
    accessibilityLabel={row.spoken + (forText ? t("forRecipes", { list: forText }) : "")} disabled={disabled} onPress={onToggle} {...focusProps}
    style={({ pressed }) => [common.row, s.item, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
    <View style={[s.check, row.checked ? { backgroundColor: theme.success, borderColor: theme.success } : { borderColor: theme.border }]}>
      {row.checked && <Icon name="checkmark" size={15} color={onAccent} />}
    </View>
    <View style={[common.flex, { minWidth: 0 }]}>
      <T style={[common.bold, row.checked && { textDecorationLine: "line-through", color: theme.mutedForeground }]}>{row.name}</T>
      {showRecipes && !!forText && !row.checked && <T variant="small" muted numberOfLines={1}>{forText}</T>}
    </View>
    {!!row.qty && <T variant="small" style={common.bold} color={theme.mutedForeground}>{row.qty}</T>}
  </Pressable>;
}
/**
 * The add box: as you type it suggests ingredients from QuinTaste's library (English names, Chinese and local names too).
 * Return adds only an exact match (or, when nothing in the library matches, what was typed); otherwise the member picks from the list.
 */
export function IngredientField({ disabled, busy, onList, onAdd }: { disabled: boolean; busy: boolean; onList: (name: string) => boolean; onAdd: (name: string) => Promise<boolean> }) {
  const { theme, textMultiplier } = usePreferences(), [text, setText] = useState(""), [focused, setFocused] = useState(false), t = useT("cook"), tc = useT("common");
  const query = text.trim(), suggestions = useMemo(() => searchIngredients(query), [query]);
  const match = suggestions.find(item => [item.name, ...item.aliases].some(name => name.toLowerCase() === query.toLowerCase()));
  const own = (/\p{Script=Han}/u.test(query) || query.replace(/[^\p{L}]/gu, "").length >= 2) && !match;
  const add = async (name: string) => { if (!disabled && !busy && await onAdd(name)) setText(""); };
  const submit = () => { if (match) { if (!onList(match.name)) void add(match.name); } else if (own && !suggestions.length) void add(query); };
  return <View style={s.field}>
    <View style={[common.row, s.add, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
      <Icon name="add" size={22} color={theme.accent} />
      <TextInput value={text} onChangeText={setText} placeholder={t("shoppingAdd")} accessibilityLabel={t("shoppingAdd")} editable={!disabled} maxLength={80}
        onSubmitEditing={submit} returnKeyType="done" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent} underlineColorAndroid={theme.transparent} autoCorrect={false}
        style={[common.flex, s.input, { color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier }]} />
      {!!text && <Pressable accessibilityRole="button" accessibilityLabel={tc("clear")} hitSlop={8} onPress={() => setText("")} style={s.clear}>
        <Icon name="close-circle" size={20} color={theme.mutedForeground} /></Pressable>}
    </View>
    {!!query && (suggestions.length > 0 || own) && <View style={[s.suggestions, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {suggestions.map((item, index) => <Suggestion key={item.name} item={item} first={index === 0} listed={onList(item.name)} disabled={disabled || busy} onPress={() => void add(item.name)} />)}
      {own && <View>{suggestions.length > 0 && <View style={[s.divider, s.suggestionDivider, { backgroundColor: theme.divider }]} />}
        <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={() => void add(query)}
          style={({ pressed }) => [common.row, s.suggestion, { backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
          <Icon name="create-outline" size={18} color={theme.mutedForeground} />
          <T variant="small" muted style={common.flex} numberOfLines={1}>{t("addOwnItem", { text: query })}</T>
        </Pressable></View>}
    </View>}
  </View>;
}
function Suggestion({ item, first, listed, disabled, onPress }: { item: LibraryIngredient; first: boolean; listed: boolean; disabled: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("cook");
  const aisle = t(aisleKeys[item.aisle]);
  return <View>{!first && <View style={[s.divider, s.suggestionDivider, { backgroundColor: theme.divider }]} />}
    <Pressable accessibilityRole="button" accessibilityLabel={listed ? item.name + ", " + t("onList") : t("addSuggestion", { name: item.name })} disabled={disabled || listed} onPress={onPress}
      style={({ pressed }) => [common.row, s.suggestion, { backgroundColor: pressed ? theme.accentSoft : theme.transparent }]}>
      <View style={[common.flex, { minWidth: 0 }]}>
        <T style={common.bold} numberOfLines={1}>{item.name}{item.aliases.length ? <T variant="small" muted>{"  " + item.aliases.slice(0, 2).join(" · ")}</T> : null}</T>
        <T variant="small" muted numberOfLines={1}>{aisle}</T>
      </View>
      {listed ? <T variant="small" muted style={common.bold}>{t("onList")}</T>
        : <View style={[s.plus, { backgroundColor: theme.accentSoft }]}><Icon name="add" size={18} color={theme.accent} /></View>}
    </Pressable></View>;
}
const s = StyleSheet.create({
  item: { gap: 14, minHeight: 58, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2 },
  divider: { height: StyleSheet.hairlineWidth },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  field: { gap: 8 },
  add: { gap: 10, borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 8, minHeight: 52 },
  input: { outlineWidth: 0, outlineStyle: "solid", paddingVertical: 12, minWidth: 0 },
  clear: { minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
  suggestions: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  suggestion: { gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 8 },
  suggestionDivider: { marginLeft: 16 },
  plus: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
