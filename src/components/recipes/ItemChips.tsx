import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { itemName, typedItem, validItemText, ITEM_MAX, type FoodItem } from "../../utils/my-ingredients";
import { useLanguage, useT } from "../../i18n";

/**
 * Items as chips with ✕, and a field to type one more (My ingredients and its basics). A doubtful item is a dashed "Choy sum?"
 * chip; tapping it puts the name in the field to confirm or change.
 */
export function ItemChips({ items, onChange, placeholder, full }: { items: FoodItem[]; onChange: (items: FoodItem[]) => void; placeholder: string; full: boolean }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage(), [text, setText] = useState("");
  // The doubtful item being confirmed: left unchanged, it keeps both its names (the server matches the English one).
  const [checking, setChecking] = useState<FoodItem | null>(null);
  const add = () => {
    if (!validItemText(text) || full) return;
    const item = checking && text.trim() === itemName(checking, language) ? { ...checking, sure: true } : typedItem(text);
    onChange([...items.filter(i => i.en.toLowerCase() !== item.en.toLowerCase()), item]);
    setText(""); setChecking(null);
  };
  const check = (index: number) => {
    // Another doubtful item still in the field goes back to the list as it was.
    const rest = items.filter((_, i) => i !== index);
    onChange(checking && text.trim() === itemName(checking, language) ? [...rest, checking] : rest);
    setChecking(items[index]); setText(itemName(items[index], language));
  };
  const canAdd = validItemText(text) && !full;
  return <View style={s.stack}>
    {!!items.length && <View style={s.chips}>
      {items.map((item, index) => {
        const name = itemName(item, language);
        return <View key={item.en.toLowerCase()} style={[s.chip, { borderColor: item.sure ? theme.border : theme.accent, borderStyle: item.sure ? "solid" : "dashed",
          backgroundColor: item.sure ? theme.card : theme.accentSoft }]}>
          {item.sure ? <T variant="small" style={common.bold}>{name}</T>
            : <Pressable accessibilityRole="button" accessibilityLabel={t("itemsCheck", { name })} onPress={() => check(index)} hitSlop={{ top: 12, bottom: 12, left: 8 }}>
              <T variant="small" color={theme.accent} style={common.bold}>{name + "?"}</T></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel={t("itemsRemove", { name })} onPress={() => onChange(items.filter((_, i) => i !== index))}
            hitSlop={{ top: 12, bottom: 12, right: 8, left: 4 }} style={s.remove}><Icon name="close" size={14} color={theme.mutedForeground} /></Pressable>
        </View>;
      })}
    </View>}
    <Field label={placeholder} showLabel={false} placeholder={placeholder} value={text} maxLength={ITEM_MAX} returnKeyType="done"
      editable={!full} onChangeText={setText} onSubmitEditing={add} submitBehavior="submit"
      trailing={<Pressable accessibilityRole="button" accessibilityLabel={placeholder} accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} hitSlop={12} onPress={add}>
        <Icon name="add" size={22} color={canAdd ? theme.accent : theme.mutedForeground} /></Pressable>} />
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", minHeight: 36, paddingLeft: 12, paddingRight: 6, gap: 4, borderWidth: 1, borderRadius: 18 },
  remove: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
});
