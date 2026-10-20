import { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { Action, Confirm, openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { PlaceThumb, SeatRow, Face } from "../../components/social/Face";
import { Reliability } from "../../components/social/PersonCard";
import { KakiPicker } from "../../components/social/KakiPicker";
import { DateTile, ListGroup, ListItem, StatusPill } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { usePreferences } from "../../state/Preferences";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { joinTable, leave, openSeat, table as loadTable } from "../../services/social-api";
import { dietSummary } from "../../config/preferences";
import { payLabels } from "../../types/meet";
import { formatSgText, sgDateTile } from "../../utils/sg-datetime";
import type { Table } from "../../types/community";
import { StartTableScreen } from "./StartTable";

export function MeetTableScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  return id === "new" ? <StartTableScreen /> : <TableScreen id={id} />;
}
function TableScreen({ id }: { id: string }) {
  const { member } = useMember(), remote = useRemote(member ? "/api/social/tables/" + id : null, signal => loadTable(id, signal), 30000), t = remote.data;
  return <Screen title={t?.place?.name ?? "Table"} backTo="/social?tab=tables">
    <MemberGate returnTo={"/social/table/" + id}>{t ? <TableDetails table={t} refresh={remote.refresh} />
      : <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social" missing="Table Unavailable" />}</MemberGate>
  </Screen>;
}
const meal = (starts: string) => { const hour = Number(starts.slice(11, 13)); return hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 17 ? "tea" : "dinner"; };
function TableActions({ table: t, refresh }: { table: Table; refresh: () => void }) {
  const [kaki, setKaki] = useState(false), { setNotice } = usePreferences();
  const changed = () => { refresh(); invalidate("/api/social/tables", "/api/social/groups", "/api/social/nearby"); };
  const join = async (kakiId: string | null) => { await joinTable(t.id, kakiId); changed(); setNotice({ text: "You joined the table" }); };
  if (t.myStatus === "accepted") return <View style={{ gap: 8 }}>
    <Button label="Open Chat" icon="chatbubbles-outline" onPress={() => openSocial("/chat/" + t.id)} />
    {t.canOpenSeat && <Confirm label="Open The Last Seat To Anyone" action="Open to anyone" text="Nobody took the seat held for a woman. Open it to anyone? It stays open while you are at this table."
      run={async () => { await openSeat(t.id); changed(); return true; }} />}
    <Button label="Share My Plan" icon="share-social-outline" variant="secondary" onPress={() => void Share.share({ message:
      ["My food plan", t.place?.name ?? t.venue, formatSgText(t.starts), "Table of " + t.size + " · " + payLabels[t.pay]].join("\n") })} />
    <View style={{ alignItems: "center" }}><Confirm link label="Leave Table" action="Leave table" text="Leave this table? Your seat opens for someone else."
      run={async () => { await leave(t.id); changed(); return true; }} /></View>
  </View>;
  if (t.myStatus === "invited") return <Button label="Open Invitation" icon="mail-open-outline" onPress={() => openSocial("/chat/" + t.id)} />;
  if (t.needsGender) return <View style={{ gap: 8 }}>
    <Button label="Add Your Gender To Join" icon="person-outline" onPress={() => openSocial("/profile")} />
  </View>;
  if (t.joinIssue) return <View style={{ gap: 8 }}>
    <Button label={t.joinIssue} icon="people-outline" disabled onPress={() => {}} />
    <Button label="Find Another Table" variant="secondary" onPress={() => openSocial("?tab=tables")} />
  </View>;
  return <View style={{ gap: 8 }}>
    <Action label="Join" icon="restaurant-outline" run={() => join(null)} />
    {t.size - t.held >= 2 && <Button label="Join With A Kaki" icon="person-add-outline" variant="secondary" onPress={() => setKaki(true)} />}
    <KakiPicker visible={kaki} onClose={() => setKaki(false)} selected={null} onPick={picked => { setKaki(false); if (picked) void join(picked.id).catch(error => setNotice({ text: error instanceof Error ? error.message : "You did not join.", error: true })); }} />
  </View>;
}
function TableDetails({ table: t, refresh }: { table: Table; refresh: () => void }) {
  const { theme } = usePreferences(), tile = sgDateTile(t.starts);
  const pills = [dietSummary(t.diets), payLabels[t.pay], t.alcoholFree ? "Alcohol-free" : "", t.sameGender ? (t.sameGender === "woman" ? "Women only" : "Men only") : ""].filter(Boolean);
  return <>
    <View style={[s.photo, { backgroundColor: theme.mediaSurface }]}>
      <PlaceThumb place={t.place} size="fill" radius={0} />
      <View style={[s.caption, { backgroundColor: theme.mediaControl }]}>
        <T variant="subtitle" color={theme.mediaForeground} numberOfLines={1}>{t.place?.name ?? t.venue}</T>
        <T variant="small" color={theme.mediaMutedForeground} numberOfLines={1}>{[t.place?.branch, t.place?.hours].filter(Boolean).join(" · ")}</T>
      </View>
    </View>
    <View style={[common.row, { gap: 12 }]}>
      {tile && <DateTile day={tile.day} month={tile.month} />}
      <View style={[common.flex, { minWidth: 0 }]}><T variant="subtitle">{(tile?.weekday ?? "") + " " + meal(t.starts)}</T><T variant="small" muted>{tile?.time}</T></View>
      <StatusPill label={"Table of " + t.size} tone="accent" />
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{pills.map(pill => <StatusPill key={pill} label={pill} />)}</View>
    <T variant="small" muted style={common.bold} accessibilityRole="header">Seats</T>
    <SeatRow seated={t.seated} size={t.size} held={t.held} forWoman={t.seatHeld} onPerson={id => openSocial("/person/" + id)} />
    <ListGroup><ListItem title={"Hosted by " + t.host.name} leading={<Face id={t.host.id} name={t.host.name} hasFace={t.host.hasFace} size={40} />}
      trailing={<Reliability tables={t.host.tables} noShows={t.host.noShows} />} onPress={() => openSocial("/person/" + t.host.id)} /></ListGroup>
    {!!t.note && <T>{t.note}</T>}
    <TableActions table={t} refresh={refresh} />
  </>;
}
const s = StyleSheet.create({
  photo: { height: 200, borderRadius: 18, overflow: "hidden" },
  caption: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingVertical: 10 },
});
