import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, T, common, type IconName } from "../ui";
import { useLanguage } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { sgDateTile } from "../../utils/sg-datetime";

export type EventTag = { label: string; tone?: "accent" | "success" | "muted" };
/** One event: a date tile, the title, then time and place on their own lines, then a few facts as tags. */
export function EventCard({ starts, title, time, place, tags = [], onPress, children, label, action }: PropsWithChildren<{
  starts: string; title: string; time: string; place?: string; tags?: EventTag[]; onPress: () => void; label?: string; action?: ReactNode;
}>) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), tile = sgDateTile(starts, useLanguage());
  const tone = (t: EventTag["tone"]) => t === "success" ? [theme.successSoft, theme.success] : t === "muted" ? [theme.muted, theme.mutedForeground] : [theme.accentSoft, theme.accent];
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}><Pressable accessibilityRole="button" accessibilityLabel={label ?? [title, time, place].filter(Boolean).join(", ")} onPress={onPress} {...focusProps}
      style={({ pressed }) => [common.row, s.body, common.flex, { opacity: pressed ? 0.75 : 1 }]}>
      {tile && <View style={[s.date, { backgroundColor: theme.accentSoft }]}>
        <T variant="small" color={theme.accent} style={[common.bold, s.month]}>{tile.month}</T>
        <T variant="title" color={theme.accent} style={[common.bold, s.day]}>{tile.day}</T>
        <T variant="small" muted>{tile.weekday}</T>
      </View>}
      <View style={[common.flex, { gap: 4, minWidth: 0 }]}>
        <T variant="subtitle" numberOfLines={2}>{title}</T>
        <Fact icon="time-outline">{time}</Fact>
        {!!place && <Fact icon="location-outline">{place}</Fact>}
        {!!tags.length && <View style={s.tags}>{tags.map(tag => { const [bg, fg] = tone(tag.tone);
          return <View key={tag.label} style={[s.tag, { backgroundColor: bg }]}><T variant="small" color={fg} style={common.bold}>{tag.label}</T></View>; })}</View>}
      </View>
    </Pressable>{action && <View style={{ paddingTop: 4, paddingRight: 2 }}>{action}</View>}</View>
    {children}
  </View>;
}
function Fact({ icon, children }: { icon: IconName; children: ReactNode }) {
  const { theme } = usePreferences();
  return <View style={[common.row, { gap: 6, alignItems: "flex-start" }]}><Icon name={icon} size={15} color={theme.mutedForeground} /><T variant="small" muted style={common.flex} numberOfLines={2}>{children}</T></View>;
}
/** Splits upcoming events into this week and later, keeping order. */
export function byWhen<T>(items: T[], starts: (item: T) => string, now = Date.now()) {
  const week = now + 7 * 86400000, soon = items.filter(item => Date.parse(starts(item)) <= week);
  return [{ title: "thisWeek" as const, items: soon }, { title: "later" as const, items: items.filter(item => !soon.includes(item)) }].filter(group => group.items.length);
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  body: { gap: 12, padding: 12, alignItems: "flex-start" },
  date: { width: 58, borderRadius: 14, alignItems: "center", paddingVertical: 8 },
  month: { textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11 },
  day: { lineHeight: 28 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 2 },
});
