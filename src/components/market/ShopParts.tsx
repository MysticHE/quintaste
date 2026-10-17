import { Pressable, StyleSheet, View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { Icon, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { dietLabels, diets } from "../../config/market";
import { slotLabel } from "../../utils/market";
import type { Diet, Slot } from "../../types/community";

/** Diet claims are always the seller's own; every item is at least vegetarian. */
export function DietPills({ value }: { value: Diet[] }) {
  return <View style={s.wrap}>
    <StatusPill label="Vegetarian" tone="accent" />
    {value.map(diet => <StatusPill key={diet} label={dietLabels[diet]} tone="accent" />)}
    <StatusPill label="Seller-declared" />
  </View>;
}
export function DietChoices({ value, onChange, disabled, warnings, error }: { value: Diet[]; onChange: (next: Diet[]) => void; disabled: boolean; warnings: string[]; error?: string }) {
  const { theme } = usePreferences();
  return <View style={{ gap: 6 }}>
    <Chips>{diets.map(diet => <Chip key={diet} label={dietLabels[diet]} role="checkbox" compact selected={value.includes(diet)} disabled={disabled}
      onPress={() => onChange(value.includes(diet) ? value.filter(d => d !== diet) : [...value, diet])} />)}</Chips>
    {warnings.map(warning => <View key={warning} style={[common.row, { gap: 6, alignItems: "flex-start" }]}><Icon name="alert-circle-outline" size={18} color={theme.warning} />
      <T variant="small" color={theme.warning} style={common.flex}>{warning}</T></View>)}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </View>;
}
/** A selectable collection slot: day, time, meetup point or delivery, and places left. */
export function SlotOption({ slot, selected, disabled = false, onPress }: { slot: Slot; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const where = slot.mode === "delivery" ? "Delivery" + (slot.place ? " · " + slot.place : "") : "Meetup · " + slot.place;
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} {...focusProps}
    accessibilityLabel={[slotLabel(slot), where, slot.remaining !== undefined && slot.remaining + " left"].filter(Boolean).join(", ")}
    style={({ pressed }) => [s.slot, { borderColor: selected || focused ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.card, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Icon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} color={selected ? theme.accent : theme.mutedForeground} />
    <View style={common.flex}><T style={common.bold}>{slotLabel(slot)}</T><T variant="small" muted numberOfLines={2}>{where}</T></View>
    {slot.remaining !== undefined && <T variant="small" muted>{slot.remaining} left</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slot: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 14 },
});
