import { useFood } from "../../state/Food";
import { AvatarPortrait } from "../avatar/AvatarPortrait";
import { router, usePathname } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, ScrollView, TextInput, View, type AccessibilityRole, type StyleProp, type ViewStyle } from "react-native";
import { useState, type PropsWithChildren, type ReactNode } from "react";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import { Button, Card, Icon, T, common, type IconName } from "../ui";

export function Chip({ label, icon, leading, trailing, selected = false, onPress, role = "button", disabled = false, compact = false, style }: {
  label: string; icon?: IconName; leading?: ReactNode; trailing?: ReactNode; selected?: boolean; onPress: () => void; role?: AccessibilityRole; disabled?: boolean; compact?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole={role} accessibilityLabel={label}
    aria-checked={role === "checkbox" || role === "radio" ? selected : undefined}
    accessibilityState={(role === "checkbox" || role === "radio") ? { checked: selected, disabled } : { selected, disabled }}
    disabled={disabled} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.chip, { backgroundColor: selected ? theme.accentSoft : theme.card,
      borderColor: focused || selected ? theme.accent : theme.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid" }, style]}>
    {leading ?? (icon && <Icon name={icon} size={19} color={selected ? theme.accent : theme.mutedForeground} />)}
    {selected && !leading && !icon && <Icon name="checkmark" size={16} color={theme.accent} />}
    <T variant={compact ? "small" : "button"}
      style={{ minWidth: 0, flexShrink: 1, fontFamily: fontNames.semibold }} color={selected ? theme.accent : theme.foreground}>{label}</T>{trailing}
  </Pressable>;
}
export function Chips({ children, label, multiple = false }: PropsWithChildren<{ label?: string; multiple?: boolean }>) {
  return <View accessibilityRole={label && !multiple ? "radiogroup" : undefined} accessibilityLabel={label} style={s.chips}>{children}</View>;
}
export function HorizontalChips({ children }: PropsWithChildren) { return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, alignItems: "center", paddingVertical: 2 }}>{children}</ScrollView>; }
export function IconButton({ label, icon, onPress, selected = false, badge = 0, appearance = "default", disabled = false, loading = false }: {
  label: string; icon: IconName; onPress: () => void; selected?: boolean; badge?: number; appearance?: "default" | "media"; disabled?: boolean; loading?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const media = appearance === "media";
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled: disabled || loading, busy: loading }} disabled={disabled || loading}
    onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.iconButton, media && s.mediaButton, { backgroundColor: media ? theme.mediaControl : selected ? theme.accentSoft : theme.card,
      borderColor: focused ? (media ? theme.mediaForeground : theme.accent) : media ? theme.transparent : selected ? theme.accent : theme.border, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    {loading ? <ActivityIndicator color={theme.accent} /> : <Icon name={icon} size={20} color={media ? theme.mediaForeground : selected ? theme.accent : theme.mutedForeground} />}
    {badge > 0 && <View style={[s.badge, { backgroundColor: theme.accent }]}><T variant="small" color={theme.actionForeground} style={common.bold}>{badge}</T></View>}
  </Pressable>;
}
export function MeButton() {
  const { doc } = useFood();
  const { theme } = usePreferences();
  const returnTo = usePathname();
  return <Pressable accessibilityRole="button" accessibilityLabel="Me: profile and settings"
    onPress={() => router.push({ pathname: "/account", params: { returnTo } })} style={[s.avatar, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
    <AvatarPortrait avatar={doc.avatar} size={46} />
  </Pressable>;
}
export function SearchField({ value, onChange, placeholder, onSubmit, context, trailing }: {
  value: string; onChange: (value: string) => void; placeholder: string; onSubmit?: () => void; context?: ReactNode; trailing?: ReactNode;
}) {
  const { theme, textMultiplier } = usePreferences();
  const [focused, setFocused] = useState(false);
  return <View testID={context ? "discovery-search" : undefined}
    style={[s.search, !!context && s.contextSearch, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    {onSubmit ? <Pressable accessibilityRole="button" accessibilityLabel={placeholder} onPress={onSubmit} style={s.searchAction}><Icon name="search-outline" /></Pressable>
      : <Icon name="search-outline" />}
    <View style={[common.flex, { minWidth: 0 }]}>{context}<TextInput value={value} onChangeText={onChange} placeholder={placeholder} accessibilityLabel={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} underlineColorAndroid={theme.transparent}
      autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={onSubmit} maxLength={100}
      placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent}
      style={[s.searchInput, !!context && { paddingVertical: 5 }, { color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier }]} /></View>
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => onChange("")} style={s.clear}><Icon name="close-circle-outline" /></Pressable>}
    {trailing}
  </View>;
}
export function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return <View style={common.spread}><T variant="subtitle" accessibilityRole="header" style={common.flex}>{title}</T>{!!aside && <T variant="small" muted>{aside}</T>}</View>;
}
export function InfoBox({ title, text, icon = "information-circle-outline", children }: PropsWithChildren<{ title: string; text: string; icon?: IconName }>) {
  const { theme } = usePreferences();
  return <Card style={{ backgroundColor: theme.accentSoft }}>
    <View style={common.row}><Icon name={icon} color={theme.accent} /><T style={[common.bold, common.flex]}>{title}</T></View>
    <T variant="small" muted style={s.infoText}>{text}</T>{children}
  </Card>;
}
export function EmptyState({ title, text, action, onPress, icon = "search-outline", primary }: { title: string; text: string; action?: string; onPress?: () => void; icon?: IconName; primary?: { label: string; onPress: () => void } }) {
  const { theme } = usePreferences();
  return <Card style={s.empty}>
    <Icon name={icon} size={32} color={theme.accent} /><T variant="subtitle" accessibilityRole="header" style={common.center}>{title}</T>
    {!!text && <T muted style={common.center}>{text}</T>}{primary && <Button label={primary.label} onPress={primary.onPress} />}{action && onPress && <Button label={action} onPress={onPress} variant="secondary" />}
  </Card>;
}
export function Servings({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <View style={[common.spread, s.servings]}><T style={[common.bold, common.flex]}>Servings</T>
    <Chip label="−" onPress={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} />
    <T accessibilityLabel={value + " servings"}>{value}</T>
    <Chip label="+" onPress={() => onChange(Math.min(8, value + 1))} disabled={value >= 8} />
  </View>;
}
const s = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 48, minWidth: 48, borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", flexShrink: 1 },
  iconButton: { minHeight: 48, minWidth: 48, padding: 10, borderWidth: 1, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  mediaButton: { borderRadius: 24, borderWidth: 2 },
  badge: { position: "absolute", right: 0, top: 0, minWidth: 18, minHeight: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingLeft: 10, minHeight: 48 },
  contextSearch: { paddingLeft: 0, gap: 0, paddingVertical: 4 }, searchAction: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  searchInput: { outlineWidth: 0, outlineStyle: "solid", flex: 1, minWidth: 0, paddingVertical: 10, paddingRight: 4 },
  clear: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  infoText: { marginTop: 7, marginBottom: 3 },
  empty: { gap: 12, alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  servings: { flexWrap: "wrap", gap: 10 },
});
