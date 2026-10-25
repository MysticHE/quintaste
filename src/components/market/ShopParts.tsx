import { Pressable, StyleSheet, View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { Icon, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { DietLabels } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { practiceKeys, practices } from "../../config/market";
import { slotLabel, slotPlace } from "../../utils/market";
import { useLanguage, useT } from "../../i18n";
import type { DietLabel } from "../../config/diet-labels";
import type { MarketPractice, Slot } from "../../types/community";

/** Labels from the seller's ingredient tags, then any practice they declare; all of it is the seller's own declaration. */
export function DietPills({ labels, practices: declared }: { labels: readonly DietLabel[]; practices: readonly MarketPractice[] }) {
  const t = useT("market");
  return <View style={s.wrap}>
    <DietLabels labels={labels} />
    {declared.map(practice => <StatusPill key={practice} label={t(practiceKeys[practice])} tone="accent" />)}
    <StatusPill label={t("sellerDeclared")} />
  </View>;
}
export function DietChoices({ value, onChange, disabled, warnings, error }: { value: MarketPractice[]; onChange: (next: MarketPractice[]) => void; disabled: boolean; warnings: string[]; error?: string }) {
  const { theme } = usePreferences(), t = useT("market");
  return <View style={{ gap: 6 }}>
    <Chips label={t("practices")} multiple>{practices.map(practice => <Chip key={practice} label={t(practiceKeys[practice])} role="checkbox" compact selected={value.includes(practice)} disabled={disabled}
      onPress={() => onChange(value.includes(practice) ? value.filter(d => d !== practice) : [...value, practice])} />)}</Chips>
    {warnings.map(warning => <View key={warning} style={[common.row, { gap: 6, alignItems: "flex-start" }]}><Icon name="alert-circle-outline" size={18} color={theme.warning} />
      <T variant="small" color={theme.warning} style={common.flex}>{warning}</T></View>)}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </View>;
}
/** A selectable collection slot: day, time, meetup point or delivery, and places left. */
export function SlotOption({ slot, selected, disabled = false, onPress }: { slot: Slot; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("market"), when = slotLabel(slot, useLanguage());
  const where = slotPlace(slot, t);
  // An item page shows that item's units left in the slot; elsewhere, the order places left.
  const soldOut = slot.itemLeft === 0, left = soldOut ? t("soldOut") : slot.itemLeft != null ? t("unitsLeft", { n: slot.itemLeft }) : slot.remaining !== undefined ? t("unitsLeft", { n: slot.remaining }) : "";
  const off = disabled || soldOut;
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: off }} disabled={off} onPress={onPress} {...focusProps}
    accessibilityLabel={[when, where, left].filter(Boolean).join(", ")}
    style={({ pressed }) => [s.slot, { borderColor: selected || focused ? theme.accent : theme.border, backgroundColor: selected ? theme.accentSoft : theme.card, opacity: off ? 0.5 : pressed ? 0.8 : 1 }]}>
    <Icon name={slot.mode === "delivery" ? "bicycle-outline" : "location-outline"} color={selected ? theme.accent : theme.mutedForeground} />
    <View style={common.flex}><T style={common.bold}>{when}</T><T variant="small" muted numberOfLines={2}>{where}</T></View>
    {!!left && <T variant="small" muted>{left}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  slot: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 14 },
});
