import { Pressable, StyleSheet, View } from "react-native";
import { T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useMinuteClock } from "../food/Timers";
import { dietSummary } from "../../config/preferences";
import { planningAreaByCode } from "../../utils/planning-area";
import { isToday, slotLabel } from "../../utils/social-match";
import { sgDateTile } from "../../utils/sg-datetime";
import type { Table } from "../../types/community";
import { FaceStack, PlaceThumb, SeatDots } from "./Face";
import { openSocial } from "./Shared";

const placeName = (t: Table) => t.place?.name ?? t.venue;
/** "2 of 4" plus Joined/Invited/Full, read aloud with the time and place. */
function tableLabel(t: Table, now: number) {
  return [slotLabel(t.starts, now), placeName(t), t.held + " of " + t.size + " seats taken", t.myStatus === "accepted" ? "Joined" : "", dietSummary(t.diets)].filter(Boolean).join(", ");
}
function useCardPress() {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return { focusProps, style: ({ pressed }: { pressed: boolean }) => [{ opacity: pressed ? 0.8 : 1 }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid" as const, outlineOffset: 2 }] };
}
/** A table in the Tables list: spot photo, day and time, place, seated faces and open seats. */
export function TableRow({ table: t }: { table: Table }) {
  const { theme } = usePreferences(), now = useMinuteClock(), press = useCardPress(), tile = sgDateTile(t.starts), today = isToday(t.starts, now);
  const area = t.areaCode ? planningAreaByCode.get(t.areaCode)?.name : "", status = t.myStatus === "accepted" ? "Joined" : t.myStatus === "invited" ? "Invited" : t.held >= t.size ? "Full" : t.seatHeld ? "For a woman" : "";
  return <Pressable accessibilityRole="button" accessibilityLabel={tableLabel(t, now)} onPress={() => openSocial("/table/" + t.id)} {...press.focusProps} style={press.style}>
    <View style={[s.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={s.thumb}><PlaceThumb place={t.place} size="fill" /></View>
      <View style={[common.flex, { gap: 3, minWidth: 0 }]}>
        <View style={[common.row, { gap: 6 }]}>
          <StatusPill label={today ? "Today" : (tile?.weekday ?? "") + " " + (tile?.day ?? "")} tone={today ? "accent" : "muted"} />
          <T variant="small" style={common.bold}>{t.starts.slice(11)}</T>
          {!!status && <StatusPill label={status} tone={status === "Full" ? "muted" : status === "For a woman" ? "accent" : "success"} />}
        </View>
        <T variant="subtitle" numberOfLines={1}>{placeName(t)}</T>
        <T variant="small" muted numberOfLines={1}>{[area, t.size === 6 ? "Table of 6" : "", t.sameGender ? (t.sameGender === "woman" ? "Women only" : "Men only") : "", t.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(" · ") || dietSummary(t.diets)}</T>
        <View style={[common.row, { gap: 8 }]}>
          <FaceStack people={t.seated} size={24} />
          <SeatDots taken={Math.max(0, t.held - t.seated.length)} size={Math.max(0, t.size - t.seated.length)} />
          <T variant="small" muted>{t.held + " of " + t.size}</T>
        </View>
      </View>
    </View>
  </Pressable>;
}
/** A compact table for the Nearby carousel. */
export function TableChip({ table: t }: { table: Table }) {
  const { theme } = usePreferences(), now = useMinuteClock(), press = useCardPress(), today = isToday(t.starts, now);
  return <Pressable accessibilityRole="button" accessibilityLabel={tableLabel(t, now)} onPress={() => openSocial("/table/" + t.id)} {...press.focusProps} style={press.style}>
    <View style={[s.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={s.chipPhoto}><PlaceThumb place={t.place} size="fill" radius={0} />
        <View style={s.chipPill}><StatusPill label={today ? "Today" : slotLabel(t.starts, now).split(" ")[0]} tone={today ? "accent" : "muted"} /></View></View>
      <View style={{ padding: 10, gap: 6 }}>
        <T variant="small" style={common.bold} numberOfLines={1}>{t.starts.slice(11) + " · " + placeName(t)}</T>
        <View style={common.spread}><SeatDots taken={t.held} size={t.size} /><T variant="small" muted>{t.held + " of " + t.size}</T></View>
      </View>
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 10, borderWidth: 1, borderRadius: 16 },
  thumb: { width: 84, height: 96, borderRadius: 12, overflow: "hidden" },
  chip: { width: 156, borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  chipPhoto: { height: 76 },
  chipPill: { position: "absolute", top: 8, left: 8 },
});
