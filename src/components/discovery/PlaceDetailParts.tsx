import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type { CatalogueVenue } from "../../types/catalogue";

export function PlaceDetailSection({ title, summary, icon, children }: PropsWithChildren<{ title: string; summary?: string; icon: IconName }>) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), { focused, focusProps } = useKeyboardFocus();
  return <View style={{ gap: open ? 8 : 0 }}>
    <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={summary ? title + ", " + summary : title} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={[s.section, { borderColor: focused ? theme.accent : theme.transparent }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
      <Icon name={icon} size={18} />
      <View style={common.flex}><T variant="small" style={common.bold}>{title}</T>{!!summary && <T variant="caption" muted>{summary}</T>}</View>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
    </Pressable>
    <View style={{ display: open ? "flex" : "none", gap: 8, paddingHorizontal: 4 }} accessibilityElementsHidden={!open} importantForAccessibility={open ? "auto" : "no-hide-descendants"}>{children}</View>
  </View>;
}
export function PlaceDetailAction({ label, accessibleLabel, icon, selected, disabled, onPress }: {
  label: string; accessibleLabel?: string; icon: IconName; selected?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={accessibleLabel ?? label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [s.action, { backgroundColor: pressed || selected ? theme.accentSoft : theme.transparent,
      borderColor: focused ? theme.accent : theme.transparent, opacity: disabled ? 0.5 : 1 }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <Icon name={icon} size={20} color={theme.accent} /><T variant="caption" style={common.bold}>{label}</T>
  </Pressable>;
}
export function PlaceSources({ venue, open }: { venue: CatalogueVenue; open: (url: string) => void }) {
  const illustrated = venue.photo?.author === "QuinTaste illustration";
  return <View style={{ gap: 10 }}>
    {venue.hours && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>Hours</T>
      <T variant="caption" muted>Checked {venue.hours.checkedAt} · Singapore time. Holiday hours may differ.</T>
      {!!venue.hours.notes && <T variant="caption" muted>{venue.hours.notes}</T>}
      <Button label="Hours Source" variant="link" icon="open-outline" onPress={() => open(venue.hours!.sourceUrl)} /></View>}
    {venue.photo && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>{illustrated ? "Cover" : "Photo"}</T>
      {/* Owner, 20 Oct 2026: a place without a reusable photo may use an approved illustration of its own dishes; say so here, never as a photo. */}
      <T variant="caption" muted>{illustrated ? "Illustration by QuinTaste, drawn from this place's menu."
        : (venue.photo.provider ? venue.photo.provider + " · " : "") + "Photograph by " + venue.photo.author + ". " + venue.photo.license + "."}</T>
      {!illustrated && <T variant="caption" muted>{venue.photo.changes}</T>}
      <Button label={illustrated ? "Menu Source" : "Photo Source"} variant="link" icon="open-outline" onPress={() => open(venue.photo!.sourceUrl)} />
      {venue.photo.licenseUrl && <Button label="Photo Licence" variant="link" icon="open-outline" onPress={() => open(venue.photo!.licenseUrl!)} />}</View>}
    {venue.research && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>Source updates</T>
      <T variant="caption" muted>Checked {venue.research.checkedAt}</T>
      {venue.research.notes.map((note, i) => <T variant="caption" muted key={i}>{sourceNote(note)}</T>)}
      {[...new Set(venue.research.sourceUrls)].filter(url => url !== venue.hours?.sourceUrl && url !== venue.photo?.sourceUrl && url !== venue.photo?.licenseUrl).map((url, i) =>
        <Button key={url} label={"Source " + (i + 1)} variant="link" icon="open-outline" onPress={() => open(url)} />)}</View>}
  </View>;
}
function sourceNote(note: string) {
  try {
    const value = JSON.parse(note) as { serviceChargePercent?: number; gstPercent?: number; currency?: string; salesChannel?: string };
    if (typeof value.serviceChargePercent === "number" && typeof value.gstPercent === "number") return "Dine-in menu prices are subject to " + value.serviceChargePercent + "% service charge and " + value.gstPercent + "% GST.";
    if (value.currency === "SGD" && value.salesChannel === "FIELDS online ordering") return "FIELDS online ordering lists prices marked S$. Currency remains unconfirmed for the saved dine-in prices.";
    return "Additional evidence is available in the source links.";
  } catch { return note; }
}
const s = StyleSheet.create({
  section: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8, borderWidth: 2, borderRadius: 12, paddingHorizontal: 2 },
  action: { flex: 1, minWidth: 0, minHeight: 58, padding: 6, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 2, borderRadius: 12 },
});
