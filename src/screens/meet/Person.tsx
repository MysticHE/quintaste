import { useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { Chip, HorizontalChips, IconButton } from "../../components/food/Controls";
import { MarketModal } from "../../components/market/MarketChrome";
import { ReportSheet } from "../../components/ReportSheet";
import { Action, Confirm, goToPlans, openSocial } from "../../components/social/Shared";
import { DietTags, MemberGate, SizeChoices, useSocialMe } from "../../components/social/MeetUI";
import { FormSection, Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { block, invite, person as loadPerson } from "../../services/social-api";
import { introductions } from "../../data/meet";
import { overlap, profileReady } from "../../utils/meet";
import type { Person } from "../../types/community";

export function MeetPersonScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember(), [menu, setMenu] = useState(false);
  const remote = useRemote(member ? "/api/social/people/" + id : null, signal => loadPerson(id, signal)), person = remote.data;
  return <Screen backTo="/social" headerAction={person ? <IconButton label="More Options" icon="ellipsis-horizontal" onPress={() => setMenu(true)} /> : undefined}>
    <MemberGate>{person ? <Profile person={person} /> : <RemoteStatus remote={remote} icon="person-outline" returnTo="/social" missing="Profile Unavailable" />}</MemberGate>
    {person && <PersonMenu person={person} visible={menu} onClose={() => setMenu(false)} />}
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
function SayHi({ person, size: preferred }: { person: Person; size: Person["size"] }) {
  const [open, setOpen] = useState(false), [size, setSize] = useState(preferred), [intro, setIntro] = useState("");
  if (!open) return <Button label="Say Hi" icon="hand-left-outline" onPress={() => setOpen(true)} />;
  const send = async () => {
    const { id } = await invite(person.id, size, intro);
    invalidate("/api/social/groups", "/api/social/people/" + person.id);
    router.push(("/social/chat/" + id) as Href);
  };
  return <FormSection title="Say hi">
    <SizeChoices value={size} onChange={setSize} />
    <HorizontalChips>{introductions.map(text => <Chip key={text} label={text} compact selected={intro === text} onPress={() => setIntro(text)} />)}</HorizontalChips>
    <Field label="Message" value={intro} maxLength={300} multiline onChangeText={setIntro} />
    <Action label={"Invite " + person.firstName} disabled={!intro.trim()} run={send} />
  </FormSection>;
}
function PersonAction({ person }: { person: Person }) {
  const mine = useSocialMe().data?.profile;
  if (person.groupId) return <Button label="Open Chat" icon="chatbubble-outline" onPress={() => openSocial("/chat/" + person.groupId)} />;
  if (!mine) return null;
  if (!profileReady(mine) || !mine.visible) return <Button label="Finish Your Profile To Say Hi" onPress={() => openSocial("/profile")} />;
  return <SayHi person={person} size={mine.size} />;
}
function Profile({ person }: { person: Person }) {
  const shared = overlap(useSocialMe().data?.profile.times ?? [], person.times);
  return <>
    <View style={{ alignItems: "center", gap: 8 }}>
      <Initial name={person.firstName} size={80} />
      <T variant="title" accessibilityRole="header">{person.firstName}</T>
      <T muted>{person.area}</T>
      <DietTags person={person} />
    </View>
    {!!person.about && <T style={common.center}>{person.about}</T>}
    <ListGroup>
      {!!person.times.length && <ListItem title={person.times.join(", ")} leading={<RowIcon name="time-outline" />} wrap
        trailing={shared.length ? <StatusPill label="Matches you" tone="accent" /> : undefined} />}
      <ListItem title={"Groups of " + person.size} leading={<RowIcon name="people-outline" />} />
      {!!person.interests.length && <ListItem title={person.interests.join(", ")} leading={<RowIcon name="heart-outline" />} wrap />}
      {!!person.excluded.length && <ListItem title={"Avoids " + person.excluded.join(", ")} leading={<RowIcon name="leaf-outline" />} wrap />}
    </ListGroup>
    <PersonAction person={person} />
  </>;
}
