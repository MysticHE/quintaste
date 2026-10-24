import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type { CatalogueVenue } from "../../types/catalogue";
import { useT } from "../../i18n";

type Translate = ReturnType<typeof useT<"explore">>;

export function PlaceDetailSection({ title, summary, icon, children }: PropsWithChildren<{ title: string; summary?: string; icon: IconName }>) {
  const { theme } = usePreferences(), [open, setOpen] = useState(false), { focused, focusProps } = useKeyboardFocus();
  return <View style={{ gap: open ? 8 : 0 }}>
    <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={summary ? title + ", " + summary : title} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={() => setOpen(!open)}
      style={[s.section, { borderColor: focused ? theme.accent : theme.transparent }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
      <Icon name={icon} size={18} />
      <View style={common.flex}><T variant="small" style={common.bold}>{title}</T>{!!summary && <T variant="caption" muted>{summary}</T>}</View>
      <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
    </Pressable>
    <View style={{ display: open ? "flex" : "none", gap: 8, paddingHorizontal: 4 }} accessibilityElementsHidden={!open} importantForAccessibility={open ? "auto" : "no-hide-descendants"}>{children}</View>
  </View>;
}
export function PlaceDetailAction({ label, accessibleLabel, icon, selected, disabled, onPress, variant = "default" }: {
  label: string; accessibleLabel?: string; icon: IconName; selected?: boolean; disabled?: boolean; onPress: () => void; variant?: "default" | "primary" | "secondary";
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={accessibleLabel ?? label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [s.action, { backgroundColor: variant === "primary" ? theme.accent : pressed || selected || variant === "secondary" ? theme.accentSoft : theme.muted,
      borderColor: focused ? theme.foreground : theme.transparent, opacity: disabled ? 0.5 : pressed ? .8 : 1 }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <Icon name={icon} size={22} color={variant === "primary" ? (theme.dark ? theme.background : theme.actionForeground) : theme.accent} />
    <T variant="caption" color={variant === "primary" ? (theme.dark ? theme.background : theme.actionForeground) : theme.accent} style={common.bold}>{label}</T>
  </Pressable>;
}
export function PlaceSources({ venue, open }: { venue: CatalogueVenue; open: (url: string) => void }) {
  const illustrated = venue.photo?.author === "QuinTaste illustration", t = useT("explore");
  return <View style={{ gap: 10 }}>
    {venue.hours && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>{t("hours")}</T>
      <T variant="caption" muted>{t("checkedSgTime", { date: venue.hours.checkedAt })}</T>
      {!!venue.hours.notes && <T variant="caption" muted>{venue.hours.notes}</T>}
      <Button label={t("hoursSource")} variant="link" icon="open-outline" onPress={() => open(venue.hours!.sourceUrl)} /></View>}
    {venue.photo && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>{t(illustrated ? "cover" : "photo")}</T>
      {/* Owner, 20 Oct 2026: a place without a reusable photo may use an approved illustration of its own dishes; say so here, never as a photo. */}
      <T variant="caption" muted>{illustrated ? t("illustrationNote")
        : (venue.photo.provider ? venue.photo.provider + " · " : "") + t("photographBy", { author: venue.photo.author, license: venue.photo.license })}</T>
      {!illustrated && <T variant="caption" muted>{venue.photo.changes}</T>}
      <Button label={t(illustrated ? "menuSourceButton" : "photoSource")} variant="link" icon="open-outline" onPress={() => open(venue.photo!.sourceUrl)} />
      {venue.photo.licenseUrl && <Button label={t("photoLicence")} variant="link" icon="open-outline" onPress={() => open(venue.photo!.licenseUrl!)} />}</View>}
    {venue.research && <View style={{ gap: 4 }}><T variant="small" style={common.bold}>{t("sourceUpdates")}</T>
      <T variant="caption" muted>{t("checkedOn", { date: venue.research.checkedAt })}</T>
      {venue.research.notes.map((note, i) => <T variant="caption" muted key={i}>{sourceNote(note, t)}</T>)}
      {[...new Set(venue.research.sourceUrls)].filter(url => url !== venue.hours?.sourceUrl && url !== venue.photo?.sourceUrl && url !== venue.photo?.licenseUrl).map((url, i) =>
        <Button key={url} label={t("sourceN", { n: i + 1 })} variant="link" icon="open-outline" onPress={() => open(url)} />)}</View>}
  </View>;
}
function sourceNote(note: string, t: Translate) {
  try {
    const value = JSON.parse(note) as { serviceChargePercent?: number; gstPercent?: number; currency?: string; salesChannel?: string };
    if (typeof value.serviceChargePercent === "number" && typeof value.gstPercent === "number") return t("serviceChargeNote", { service: value.serviceChargePercent, gst: value.gstPercent });
    if (value.currency === "SGD" && value.salesChannel === "FIELDS online ordering") return t("fieldsNote");
    return t("additionalEvidence");
  } catch { return note; }
}
const s = StyleSheet.create({
  section: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8, borderWidth: 2, borderRadius: 12, paddingHorizontal: 2 },
  action: { flex: 1, minWidth: 0, minHeight: 68, padding: 8, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderRadius: 12 },
});
