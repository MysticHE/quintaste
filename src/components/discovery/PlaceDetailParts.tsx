import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type { CatalogueVenue } from "../../types/catalogue";
import { useT } from "../../i18n";

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
/**
 * One line under the place photo. Sources & credits was removed (owner, 24 Oct 2026), but CC BY / CC BY-SA photos must
 * still name the author, licence and changes, and an approved illustration must never pass as a photo (owner, 20 Oct).
 */
export function PhotoCredit({ photo, open }: { photo: NonNullable<CatalogueVenue["photo"]>; open: (url: string) => void }) {
  const t = useT("explore"), { theme } = usePreferences(), [expanded, setExpanded] = useState(false), { focused, focusProps } = useKeyboardFocus();
  if (photo.author === "QuinTaste illustration") return <T testID="place-photo-credit" variant="caption" muted>{t("illustrationNote")}</T>;
  const credit = t("photoCreditLine", { author: photo.author, license: photo.license });
  return <View testID="place-photo-credit">
    <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={credit} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpanded(!expanded)}
      style={[s.credit, { borderColor: focused ? theme.accent : theme.transparent }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
      <T variant="caption" muted numberOfLines={1} style={common.flex}>{credit}</T>
      <Icon name={expanded ? "chevron-up" : "information-circle-outline"} size={16} color={theme.mutedForeground} />
    </Pressable>
    {expanded && <View style={{ gap: 2, paddingHorizontal: 4 }}>
      <T variant="caption" muted>{(photo.provider ? photo.provider + " · " : "") + t("photographBy", { author: photo.author, license: photo.license }) + (photo.changes ? " " + photo.changes : "")}</T>
      <View style={[common.row, { flexWrap: "wrap", columnGap: 8 }]}>
        <Button label={t("photoSource")} variant="link" icon="open-outline" onPress={() => open(photo.sourceUrl)} />
        {!!photo.licenseUrl && <Button label={t("photoLicence")} variant="link" icon="open-outline" onPress={() => open(photo.licenseUrl!)} />}
      </View>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  section: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8, borderWidth: 2, borderRadius: 12, paddingHorizontal: 2 },
  action: { flex: 1, minWidth: 0, minHeight: 68, padding: 8, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderRadius: 12 },
  credit: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 4, borderWidth: 2, borderRadius: 10 },
});
