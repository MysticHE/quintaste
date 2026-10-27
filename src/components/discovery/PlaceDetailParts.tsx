import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common, type IconName } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import type { CatalogueVenue } from "../../types/catalogue";
import { useT } from "../../i18n";
import { catalogueLayout } from "../../theme/layout";

/**
 * One aligned line of the place page: a fixed icon column, the text, an optional trailing icon.
 * Pressable when `onPress` is set; `selectable` keeps static text (an address) copyable.
 */
export function PlaceRow({ icon, text, trailing, onPress, accessibilityLabel, expanded, selectable = false, testID }: {
  icon: IconName; text: string; trailing?: IconName; onPress?: () => void; accessibilityLabel?: string; expanded?: boolean; selectable?: boolean; testID?: string;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const body = <>
    <View style={s.rowIcon}><Icon name={icon} size={20} color={theme.mutedForeground} /></View>
    <T variant="small" selectable={selectable} style={common.flex}>{text}</T>
    {trailing && <Icon name={trailing} size={18} color={theme.mutedForeground} />}
  </>;
  if (!onPress) return <View testID={testID} style={[s.row, { borderColor: theme.transparent }]}>{body}</View>;
  return <Pressable testID={testID} {...focusProps} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? text}
    accessibilityState={expanded === undefined ? undefined : { expanded }} aria-expanded={expanded} onPress={onPress}
    style={({ pressed }) => [s.row, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.muted : theme.transparent },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>{body}</Pressable>;
}
/** A row that opens to show more lines (opening hours), indented under the row's text. */
export function PlaceDetailSection({ title, summary, icon, children }: PropsWithChildren<{ title: string; summary: string; icon: IconName }>) {
  const [open, setOpen] = useState(false);
  return <View>
    <PlaceRow icon={icon} text={summary} trailing={open ? "chevron-up" : "chevron-down"} expanded={open}
      accessibilityLabel={title + ", " + summary} onPress={() => setOpen(!open)} />
    <View style={[s.more, { display: open ? "flex" : "none" }]} accessibilityElementsHidden={!open} importantForAccessibility={open ? "auto" : "no-hide-descendants"}>{children}</View>
  </View>;
}
/** Full-width hairline between groups of rows. */
export function PlaceDivider() {
  const { theme } = usePreferences();
  return <View style={[s.divider, { backgroundColor: theme.divider }]} />;
}
/** `inline` puts the icon beside the label in a 48-point button (place page); stacked is the taller card version. */
export function PlaceDetailAction({ label, accessibleLabel, icon, selected, disabled, onPress, variant = "default", inline = false }: {
  label: string; accessibleLabel?: string; icon: IconName; selected?: boolean; disabled?: boolean; onPress: () => void; variant?: "default" | "primary" | "secondary"; inline?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable {...focusProps} accessibilityRole="button" accessibilityLabel={accessibleLabel ?? label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [s.action, inline && s.inlineAction, { backgroundColor: variant === "primary" ? theme.accent : pressed || selected || variant === "secondary" ? theme.accentSoft : theme.muted,
      borderColor: focused ? theme.foreground : theme.transparent, opacity: disabled ? 0.5 : pressed ? .8 : 1 }, Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <Icon name={icon} size={inline ? 19 : 22} color={variant === "primary" ? (theme.dark ? theme.background : theme.actionForeground) : theme.accent} />
    <T variant={inline ? "small" : "caption"} color={variant === "primary" ? (theme.dark ? theme.background : theme.actionForeground) : theme.accent} style={[common.bold, { flexShrink: 1 }]}>{label}</T>
  </Pressable>;
}
/**
 * One line under the place photo: CC BY / CC BY-SA and stated-permission photos must name the author, licence and
 * changes. QuinTaste illustrations omit the caption (owner, 28 Oct 2026); their provenance stays in the catalogue.
 * Photos whose rights the source retains show nothing (owner, 25 Oct 2026).
 */
export function PhotoCredit({ photo, open }: { photo: NonNullable<CatalogueVenue["photo"]>; open: (url: string) => void }) {
  const t = useT("explore"), { theme } = usePreferences(), [expanded, setExpanded] = useState(false), { focused, focusProps } = useKeyboardFocus();
  if (photo.author === "QuinTaste illustration") return null;
  if (photo.license === "Source rights retained") return null;
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
  row: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12, paddingVertical: 8, paddingHorizontal: 0, borderWidth: 2, borderRadius: catalogueLayout.radius },
  rowIcon: { width: 22, alignItems: "center" },
  more: { gap: 4, paddingLeft: 42, paddingRight: 8, paddingBottom: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  inlineAction: { flexDirection: "row", flexGrow: 1, flexShrink: 0, flexBasis: "auto", minHeight: 48, paddingVertical: 0, paddingHorizontal: 12, gap: 6, borderRadius: catalogueLayout.radius },
  action: { flex: 1, minWidth: 0, minHeight: 68, padding: 8, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 2, borderRadius: 12 },
  credit: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 4, borderWidth: 2, borderRadius: 10 },
});
