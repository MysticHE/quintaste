import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { MarketModal } from "../../components/market/MarketChrome";
import { ReportSheet } from "../../components/ReportSheet";
import { Confirm, goToPlans, openSocial } from "../../components/social/Shared";
import { DietTags, MemberGate, profileState, useSocialMe } from "../../components/social/MeetUI";
import { InCommon, Reliability } from "../../components/social/PersonCard";
import { InviteSheet } from "../../components/social/InviteSheet";
import { Face, PlaceThumb } from "../../components/social/Face";
import { ListGroup, ListItem, RowIcon, StatusPill, type Tone } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { block, person as loadPerson, places, placesByIdKey } from "../../services/social-api";
import { hereForLabel } from "../../config/social-profile";
import { inCommon } from "../../utils/social-match";
import type { Person } from "../../types/community";
import type { IconName } from "../../components/ui";

export function MeetPersonScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember(), [menu, setMenu] = useState(false), [inviting, setInviting] = useState(false);
  const remote = useRemote(member ? "/api/social/people/" + id : null, signal => loadPerson(id, signal)), person = remote.data, mine = useSocialMe().data?.profile;
  return <Screen backTo="/social" headerAction={person ? <IconButton label="More Options" icon="ellipsis-horizontal" onPress={() => setMenu(true)} /> : undefined}>
    <MemberGate>{person ? <Profile person={person} onInvite={() => setInviting(true)} /> : <RemoteStatus remote={remote} icon="person-outline" returnTo="/social" missing="Profile Unavailable" />}</MemberGate>
    {person && <PersonMenu person={person} visible={menu} onClose={() => setMenu(false)} />}
    {person && mine && inviting && <InviteSheet person={person} me={mine} visible onClose={() => setInviting(false)} />}
  </Screen>;
}
/** Report, block and safety live behind one menu. */
function PersonMenu({ person, visible, onClose }: { person: Person; visible: boolean; onClose: () => void }) {
  const [report, setReport] = useState(false);
  const blocked = () => { invalidate("/api/social/", "/api/market/"); goToPlans(); };
  return <>
    <MarketModal visible={visible} onClose={onClose} label={person.firstName}>
      <Button label={"Report " + person.firstName} variant="secondary" icon="flag-outline" onPress={() => { onClose(); setReport(true); }} />
      <Confirm label={"Block " + person.firstName} action="Block" text={"Hide each other, stop messages and leave groups you share with " + person.firstName + "."}
        run={async () => { await block(person.id); onClose(); blocked(); return true; }} />
      <Button label="Safety & Help" variant="secondary" icon="shield-checkmark-outline" onPress={() => { onClose(); openSocial("/safety"); }} />
    </MarketModal>
    <ReportSheet kind="person" targetId={person.id} name={person.firstName} visible={report} onClose={() => setReport(false)} onBlocked={blocked} />
  </>;
}
/** The sticky action: open the chat you share, finish your profile, or invite to a table. */
function PersonAction({ person, onInvite }: { person: Person; onInvite: () => void }) {
  const mine = useSocialMe().data?.profile;
  if (person.groupId) return <Button label="Open Chat" icon="chatbubble-outline" onPress={() => openSocial("/chat/" + person.groupId)} />;
  if (!mine) return null;
  if (profileState(mine).label !== "Open to plans") return <Button label="Finish Your Profile To Invite" onPress={() => openSocial("/profile")} />;
  return <Button label="Invite To A Table" icon="restaurant-outline" onPress={onInvite} />;
}
type Detail = { icon: IconName; title: string; subtitle?: string };
function details(p: Person): Detail[] {
  const rows: (Detail | false)[] = [
    !!p.work && { icon: "briefcase-outline", title: p.work }, !!p.education && { icon: "school-outline", title: p.education },
    !!p.languages.length && { icon: "language-outline", title: p.languages.join(", ") }, !!p.why.length && { icon: "leaf-outline", title: p.why.join(", "), subtitle: "Why plant-based" },
    !!p.grewUp && { icon: "home-outline", title: p.grewUp, subtitle: "Grew up in" }, !!p.height && { icon: "resize-outline", title: p.height + " cm" },
    !!p.drinking && { icon: "wine-outline", title: "Drinks: " + p.drinking }, !!p.smoking && { icon: "flame-outline", title: "Smokes: " + p.smoking },
    !!p.family && { icon: "people-circle-outline", title: p.family }, !!p.pets.length && { icon: "paw-outline", title: p.pets.join(", ") },
    !!p.ethnicity && { icon: "globe-outline", title: p.ethnicity }, !!p.hobbies.length && { icon: "bicycle-outline", title: p.hobbies.join(", "), subtitle: "Hobbies" },
    !!p.times.length && { icon: "time-outline", title: p.times.join(", "), subtitle: "Usually free" },
    !!p.excluded.length && { icon: "close-circle-outline", title: p.excluded.join(", "), subtitle: "Avoids" },
  ];
  return rows.filter((row): row is Detail => !!row);
}
function Spots({ ids }: { ids: string[] }) {
  const key = placesByIdKey(ids), remote = useRemote(key, signal => places(key!, signal)), items = remote.data?.items ?? [];
  if (!items.length) return null;
  return <ListGroup title="Usual spots">{items.map(place => <ListItem key={place.id} title={place.name} subtitle={place.branch || undefined}
    leading={<PlaceThumb place={place} size={40} radius={10} />} onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + place.id } } as never)} />)}</ListGroup>;
}
function Profile({ person: p, onInvite }: { person: Person; onInvite: () => void }) {
  const mine = useSocialMe().data?.profile, shared = inCommon(mine, p), pills: { label: string; tone: Tone }[] = [
    { label: hereForLabel(p.hereFor), tone: "accent" }, ...(p.religion ? [{ label: p.religion, tone: "muted" as Tone }] : []), ...(p.gender ? [{ label: p.gender === "woman" ? "Woman" : "Man", tone: "muted" as Tone }] : [])];
  return <>
    <View style={{ alignItems: "center", gap: 8 }}>
      <Face id={p.id} name={p.firstName} hasFace={p.hasFace} size={160} />
      <T variant="title" accessibilityRole="header">{p.firstName + (p.age ? ", " + p.age : "")}</T>
      <T muted>{p.area}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>{pills.map(pill => <StatusPill key={pill.label} label={pill.label} tone={pill.tone} />)}</View>
      <DietTags person={p} />
      <Reliability tables={p.tables} noShows={p.noShows} />
    </View>
    <PersonAction person={p} onInvite={onInvite} />
    {!!shared.length && <View style={{ gap: 6 }}><T variant="small" muted style={common.bold}>In common</T><InCommon items={shared} max={6} /></View>}
    {p.prompts.map(prompt => <Card key={prompt.q} style={{ gap: 4 }}><T variant="small" muted style={common.bold}>{prompt.q}</T><T variant="subtitle">{prompt.a}</T></Card>)}
    {!!p.about && <T>{p.about}</T>}
    <ListGroup>{details(p).map(d => <ListItem key={d.title + d.icon} title={d.title} subtitle={d.subtitle} wrap leading={<RowIcon name={d.icon} />} />)}</ListGroup>
    <Spots ids={p.spots} />
    {!!p.kakiSays?.length && <ListGroup title="Kaki says">{p.kakiSays.map(k => <ListItem key={k.byName + k.body} title={"“" + k.body + "”"} subtitle={k.byName} wrap />)}</ListGroup>}
    {!!p.opening && <ListGroup><ListItem title={p.opening} subtitle="Answer this in your invitation" wrap leading={<RowIcon name="chatbubble-ellipses-outline" />} /></ListGroup>}
  </>;
}
