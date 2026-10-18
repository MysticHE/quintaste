import { Children, Fragment, isValidElement, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { Icon, T, common, type IconName } from "./ui";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";

export type Tone = "accent" | "warning" | "muted" | "success";
/** Flattens fragments so every visible row gets exactly one hairline between it and the next. */
function rows(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap(child => isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? rows(child.props.children) : [child]);
}
/** A titled group of rows on one surface, separated by hairlines. Renders nothing when empty. */
export function ListGroup({ title, aside, inset = true, children }: PropsWithChildren<{ title?: string; aside?: string; inset?: boolean }>) {
  const { theme } = usePreferences(), items = rows(children);
  if (!items.length) return null;
  return <View style={{ gap: 6 }}>
    {!!title && <View style={[common.spread, s.heading]}><T variant="small" muted accessibilityRole="header" style={common.bold}>{title}</T>{!!aside && <T variant="small" muted>{aside}</T>}</View>}
    <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {items.map((item, index) => <View key={index}>{index > 0 && <View style={[s.hairline, { marginLeft: inset ? 66 : 14, backgroundColor: theme.divider }]} />}{item}</View>)}
    </View>
  </View>;
}
export function StatusPill({ label, tone = "muted" }: { label: string; tone?: Tone }) {
  const { theme } = usePreferences();
  const colors = { accent: [theme.accentSoft, theme.accent], warning: [theme.warningSoft, theme.warning], success: [theme.successSoft, theme.success], muted: [theme.muted, theme.mutedForeground] }[tone];
  return <View style={[s.pill, { backgroundColor: colors[0] }]}><T variant="small" color={colors[1]} numberOfLines={1} style={common.bold}>{label}</T></View>;
}
export function Initial({ name, size = 40 }: { name: string; size?: number }) {
  const { theme } = usePreferences();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center" }}>
    <T variant={size > 56 ? "title" : "subtitle"} color={theme.accent}>{name.trim().slice(0, 1).toUpperCase() || "?"}</T>
  </View>;
}
export function RowIcon({ name, tone = "accent" }: { name: IconName; tone?: Tone }) {
  const { theme } = usePreferences();
  const [bg, fg] = tone === "warning" ? [theme.warningSoft, theme.warning] : tone === "muted" ? [theme.muted, theme.mutedForeground] : [theme.accentSoft, theme.accent];
  return <View style={[s.rowIcon, { backgroundColor: bg }]}><Icon name={name} size={20} color={fg} /></View>;
}
export function DateTile({ day, month }: { day: string; month: string }) {
  const { theme } = usePreferences();
  return <View style={[s.rowIcon, { backgroundColor: theme.accentSoft, gap: 0 }]}>
    <T variant="small" color={theme.accent} style={[common.bold, s.tileMonth]}>{month.toUpperCase()}</T><T color={theme.accent} style={[common.bold, s.tileDay]}>{day}</T>
  </View>;
}
/** One row: leading visual, a title with an optional badge, up to two short lines, and a trailing status or chevron. */
export function ListItem({ title, badge, subtitle, detail, leading, trailing, onPress, label, wrap = false }: {
  title: string; badge?: ReactNode; subtitle?: string; detail?: string; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void; label?: string; wrap?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const body = <>
    {leading}
    <View style={s.text}>
      <View style={[common.row, { gap: 6 }]}><T style={[common.bold, s.shrink]} numberOfLines={wrap ? undefined : 1}>{title}</T>{badge}</View>
      {!!subtitle && <T variant="small" muted numberOfLines={wrap ? undefined : 1}>{subtitle}</T>}
      {!!detail && <T variant="small" muted numberOfLines={1}>{detail}</T>}
    </View>
    {trailing ?? (onPress && <Icon name="chevron-forward" size={18} color={theme.mutedForeground} />)}
  </>;
  if (!onPress) return <View style={s.row}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? [title, subtitle, detail].filter(Boolean).join(", ")} onPress={onPress} {...focusProps}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? theme.muted : theme.transparent }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid", outlineOffset: -2 }]}>
    {body}
  </Pressable>;
}
/** Theme-coloured switch; activeThumbColor is the web prop for the on-state thumb. */
/** Off track uses the muted text colour so the switch passes 3:1 non-text contrast on a card (WCAG 1.4.11). */
export function ThemedSwitch({ label, value, onChange, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { theme } = usePreferences();
  return <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange}
    trackColor={{ false: theme.mutedForeground, true: theme.accent }} thumbColor={theme.card} {...{ activeThumbColor: theme.card }} />;
}
/** Visible label for a chip group or control, matching Field labels. */
export const FieldLabel = ({ children }: { children: string }) => <T variant="small" style={common.bold}>{children}</T>;
/** Small labelled heading above a block of form fields. */
export function FormSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <View style={{ gap: 12, marginTop: 8 }}><T variant="subtitle" accessibilityRole="header">{title}</T>{children}</View>;
}
const s = StyleSheet.create({
  heading: { paddingHorizontal: 4, marginTop: 4 },
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  shrink: { flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, maxWidth: 150 },
  tileMonth: { fontSize: 10, lineHeight: 12 }, tileDay: { fontSize: 17, lineHeight: 20 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
