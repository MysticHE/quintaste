import { useState } from "react";
import { View } from "react-native";
import { Chip, Chips, HorizontalChips } from "../food/Controls";
import { Button, Field, T } from "../ui";
import { Action, ActionChip, openSocial } from "./Shared";
import { FieldLabel, Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../GroupedList";
import { SgDateTimeField } from "./SgDateTimeField";
import { useSocialMe } from "./MeetUI";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useRemote } from "../../hooks/useRemote";
import { addPerson, people, peopleKey, plan } from "../../services/social-api";
import { acceptedCount, outdoorVenue, reservedCount } from "../../utils/meet";
import { planDateIssue } from "../../utils/sg-datetime";
import { publicVenues } from "../../data/meet";
import { defaultMeetFilters, payLabels, payOptions, type PayOption } from "../../types/meet";
import type { Group, GroupMember } from "../../types/community";

const statusLabel: Record<GroupMember["status"], string> = { accepted: "Joined", invited: "Invited", declined: "Declined", left: "Left" };
export function MemberRow({ member: m }: { member: GroupMember }) {
  return <ListItem title={m.isMe ? m.name + " (you)" : m.name} leading={<Initial name={m.name} />} label={m.name + ", " + statusLabel[m.status]}
    onPress={m.isMe ? undefined : () => openSocial("/person/" + m.id)}
    trailing={<StatusPill label={m.confirmed ? "Confirmed" : statusLabel[m.status]} tone={m.confirmed ? "success" : m.status === "accepted" ? "accent" : "muted"} />} />;
}
/** Everyone in the group, then people you can still invite while there is room. */
export function GroupMembers({ group: g, onChange }: { group: Group; onChange: () => void }) {
  const [invite, setInvite] = useState(false), visible = !!useSocialMe().data?.profile.visible;
  const key = invite ? peopleKey("", defaultMeetFilters()) : null, candidates = useRemote(key, signal => people(key ?? "", signal));
  const room = g.myStatus === "accepted" && reservedCount(g) < g.size;
  const open = (candidates.data?.items ?? []).filter(p => !g.members.some(m => m.id === p.id && (m.status === "accepted" || m.status === "invited")));
  return <>
    <ListGroup title="People" aside={acceptedCount(g) + " of " + g.size}>
      {g.members.map(m => <MemberRow key={m.id} member={m} />)}
      {room && <ListItem title="Invite People" leading={<RowIcon name="person-add-outline" />} onPress={() => setInvite(!invite)}
        trailing={<StatusPill label={invite ? "Hide" : String(g.size - reservedCount(g)) + " open"} />} />}
    </ListGroup>
    {room && invite && <ListGroup>
      {!visible ? <ListItem title="Turn On Open To Plans" leading={<RowIcon name="eye-outline" tone="warning" />} onPress={() => openSocial("/profile")} />
        : open.length ? open.map(p => <ListItem key={p.id} title={p.firstName} subtitle={p.diet + " · " + p.area} leading={<Initial name={p.firstName} />}
          trailing={<ActionChip label="Invite" icon="add" run={async () => { await addPerson(g.id, p.id); onChange(); }} />} />)
        : <ListItem title={candidates.data ? "No One Else Open To Plans" : "Loading"} leading={<RowIcon name="people-outline" tone="muted" />} />}
    </ListGroup>}
  </>;
}
function useVenueSuggestions() {
  const { doc } = useFood();
  const saved = doc.saves.filter(item => item.kind === "place").map(item => doc.exploreLocal.labels[item.id]).filter((label): label is string => !!label).slice(0, 4);
  return [...new Set([...saved, ...publicVenues])].slice(0, 7);
}
/** Place, time, who pays and food; saving a changed plan asks everyone to confirm again. */
export function GroupPlanForm({ group: g, onDone }: { group: Group; onDone: () => void }) {
  const { theme } = usePreferences(), suggestions = useVenueSuggestions();
  const [venue, setVenue] = useState(g.venue), [starts, setStarts] = useState(g.starts), [food, setFood] = useState(g.food), [pay, setPay] = useState<PayOption>(g.pay);
  const save = async () => {
    const issue = venue.trim().length < 3 ? "Add a public place." : planDateIssue(starts, Date.now());
    if (issue) throw new Error(issue);
    await plan(g.id, { venue, starts, food, pay }); onDone();
  };
  return <View style={{ gap: 12 }}>
    <Field label="Place" value={venue} maxLength={160} placeholder="Hawker centre or cafe" onChangeText={setVenue} />
    <HorizontalChips>{suggestions.map(place => <Chip key={place} label={place} compact selected={venue === place} onPress={() => setVenue(place)} />)}</HorizontalChips>
    {outdoorVenue(venue) && <T variant="small" color={theme.warning}>No public drinking 10.30pm–7am</T>}
    <SgDateTimeField label="Date & Time" value={starts} onChange={setStarts} />
    <View style={{ gap: 6 }}><FieldLabel>Who Pays</FieldLabel><Chips label="Who pays">{payOptions.map(option => <Chip key={option} label={payLabels[option]} role="radio" compact selected={pay === option} onPress={() => setPay(option)} />)}</Chips></View>
    <Field label="Food" value={food} multiline maxLength={1000} placeholder="Menu and anything to avoid" onChangeText={setFood} />
    <Action label={g.venue ? "Save Plan" : "Propose Plan"} run={save} />
    {!!g.venue && <Button label="Cancel" variant="link" onPress={onDone} />}
  </View>;
}
