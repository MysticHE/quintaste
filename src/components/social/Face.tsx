import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Icon, T, common } from "../ui";
import { Initial } from "../GroupedList";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { useSessionHeaders } from "../../hooks/useRemote";
import { photoSource } from "../../services/community-api";
import { faceUrl } from "../../services/social-api";
import type { SocialPlace } from "../../types/community";

/** A member's chosen picture, or their initial. `version` refreshes your own picture after you change it. */
export function Face({ id, name, hasFace, size = 40, version = 0 }: { id: string; name: string; hasFace: boolean; size?: number; version?: number }) {
  const headers = useSessionHeaders(), [failed, setFailed] = useState(false), { theme } = usePreferences();
  // A stable source: a new object on every render (chat refreshes every few seconds) makes the image refetch and fade in again.
  const source = useMemo(() => photoSource(faceUrl(id) + (version ? "?v=" + version : ""), headers), [id, version, headers]);
  if (!hasFace || failed) return <Initial name={name} size={size} />;
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: theme.muted }}>
    <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} accessible={false} cachePolicy="memory-disk" />
  </View>;
}
/** Overlapping faces for a seat count or a group header. */
export function FaceStack({ people, size = 28 }: { people: { id: string; name: string; hasFace: boolean }[]; size?: number }) {
  const { theme } = usePreferences();
  return <View style={common.row} accessible={false}>
    {people.slice(0, 5).map((p, index) => <View key={p.id} style={{ marginLeft: index ? -size / 4 : 0, borderRadius: size, borderWidth: 2, borderColor: theme.card }}>
      <Face id={p.id} name={p.name} hasFace={p.hasFace} size={size} /></View>)}
  </View>;
}
/** Filled dots for taken seats and outlined dots for open ones. */
export function SeatDots({ taken, size }: { taken: number; size: number }) {
  const { theme } = usePreferences();
  return <View style={[common.row, { gap: 4 }]} accessible={false}>
    {Array.from({ length: size }, (_, i) => <View key={i} style={[s.dot, i < taken ? { backgroundColor: theme.accent } : { borderWidth: 1.5, borderColor: theme.accent }]} />)}
  </View>;
}
/** Seats as faces with first names, then open seats; tapping a face opens that person. */
/** `held` counts accepted seats plus invitations still deciding; those show as Invited. */
/** `forWoman` marks the last open seat while it is held for a woman. */
export function SeatRow({ seated, size, held = seated.length, forWoman = false, onPerson }: { seated: { id: string; name: string; hasFace: boolean }[]; size: number; held?: number; forWoman?: boolean; onPerson?: (id: string) => void }) {
  const { theme } = usePreferences(), t = useT("social");
  return <View style={[common.row, { gap: 12, flexWrap: "wrap" }]} accessibilityLabel={t("seatsTakenList", { n: seated.length, size, names: seated.map(p => p.name).join(t("listSep")) })}>
    {seated.map(p => <View key={p.id} style={s.seat}>
      <Pressable disabled={!onPerson} onPress={() => onPerson?.(p.id)} accessibilityRole="button" accessibilityLabel={t("openName", { name: p.name })} hitSlop={4}>
        <Face id={p.id} name={p.name} hasFace={p.hasFace} size={48} /></Pressable>
      <T variant="small" style={common.bold} numberOfLines={1}>{p.name}</T></View>)}
    {Array.from({ length: Math.max(0, size - seated.length) }, (_, i) => { const invited = i < held - seated.length;
      return <View key={"open" + i} style={s.seat}>
        <View style={[s.open, { borderColor: invited ? theme.mutedForeground : theme.accent }]}><Icon name={invited ? "hourglass-outline" : "add"} size={20} color={invited ? theme.mutedForeground : theme.accent} /></View>
        <T variant="small" muted numberOfLines={2} style={{ textAlign: "center" }}>{t(invited ? "invited" : forWoman ? "forWoman" : "seatOpen")}</T></View>; })}
  </View>;
}
/** A catalogue place's cover, or a neutral tile. */
export function PlaceThumb({ place, size = 48, radius = 12 }: { place: Pick<SocialPlace, "photo"> | null; size?: number | "fill"; radius?: number }) {
  const { theme } = usePreferences(), headers = useSessionHeaders(), [failed, setFailed] = useState(false), path = place?.photo ?? null;
  const source = useMemo(() => photoSource(path, headers), [path, headers]);
  const box = size === "fill" ? StyleSheet.absoluteFill : { width: size, height: size };
  return <View style={[box, { borderRadius: radius, overflow: "hidden", backgroundColor: theme.muted, alignItems: "center", justifyContent: "center" }]}>
    {source && !failed ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailed(true)} accessible={false} />
      : <Icon name="restaurant-outline" size={20} color={theme.mutedForeground} />}
  </View>;
}
const s = StyleSheet.create({
  dot: { width: 11, height: 11, borderRadius: 6 },
  seat: { width: 56, alignItems: "center", gap: 4 },
  open: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
});
