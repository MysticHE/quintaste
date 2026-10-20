import { useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Chip, Chips, EmptyState, IconButton } from "../../components/food/Controls";
import { IngredientCheck } from "../../components/market/Ingredients";
import { Field, T, common } from "../../components/ui";
import { Action, Confirm, goToPlans, openSocial } from "../../components/social/Shared";
import { DietChoices, MemberGate, profileState, useSocialMe } from "../../components/social/MeetUI";
import { dietSummary } from "../../config/preferences";
import { FieldLabel, FormSection, Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { SgDateTimeField } from "../../components/social/SgDateTimeField";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { cancelGathering, deleteGathering, gathering as loadGathering, joinGathering, saveGathering } from "../../services/social-api";
import { exportCalendarEvent } from "../../services/calendar-export";
import { payLabels, payOptions } from "../../types/meet";
import type { Gathering, GatheringInput } from "../../types/community";
import { gatheringIssue, outdoorVenue } from "../../utils/meet";
import { formatSgText, parseSgDateTime } from "../../utils/sg-datetime";

export function MeetGatheringScreen() {
  const { id = "", copy, area } = useLocalSearchParams<{ id: string; copy?: string; area?: string }>(), { member } = useMember(), source = id === "new" ? copy : id;
  const remote = useRemote(member && source ? "/api/social/gatherings/" + source : null, signal => loadGathering(source ?? "", signal)), g = remote.data;
  const body = id === "new" && !copy ? <GatheringForm key="new" area={area} />
    : !g ? <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" missing="Gathering Unavailable" />
    : id === "new" ? <GatheringForm key={"copy" + g.id} initial={{ ...g, starts: null, state: "draft" }} copy />
    : g.mine && g.state !== "cancelled" && !g.past ? <GatheringForm key={g.id} initial={g} onChange={remote.refresh} />
    : <GatheringView gathering={g} refresh={remote.refresh} />;
  return <Screen title={id === "new" ? "New Gathering" : "Gathering"} backTo="/social"><MemberGate>{body}</MemberGate></Screen>;
}
const updated = () => invalidate("/api/social/gatherings");
async function calendar(g: Pick<Gathering, "id" | "title" | "starts" | "venue" | "area" | "pay" | "alcoholFree">) {
  const at = parseSgDateTime(g.starts ?? ""); if (at === null) throw new Error("Choose a date and time first.");
  await exportCalendarEvent({ uid: g.id, title: g.title, start: at, minutes: 120, location: g.venue, description: [g.area, payLabels[g.pay], g.alcoholFree ? "Alcohol-free" : "", "From QuinTaste."].filter(Boolean).join(". ") });
}
/** Someone else's gathering, or one that has ended: details, who is going, and join or leave. */
function GatheringView({ gathering: g, refresh }: { gathering: Gathering; refresh: () => void }) {
  const full = g.going >= g.seats, open = g.state === "posted" && !g.past;
  const join = async (value: boolean) => { await joinGathering(g.id, value); refresh(); updated(); };
  return <>
    <View style={{ gap: 6 }}>
      <View style={[common.row, { gap: 8 }]}><T variant="subtitle" style={common.flex}>{g.title}</T>
        <StatusPill label={g.state === "cancelled" ? "Cancelled" : g.past ? "Past" : g.joined ? "Going" : full ? "Full" : g.going + " of " + g.seats} tone={open && !full ? "accent" : "muted"} /></View>
      <T muted>{"Hosted by " + g.organiserName}</T>
    </View>
    <ListGroup>
      <ListItem title={formatSgText(g.starts ?? "") || "Time to be set"} leading={<RowIcon name="calendar-outline" />} />
      <ListItem title={g.venue} subtitle={g.area} leading={<RowIcon name="location-outline" />} wrap />
      <ListItem title={payLabels[g.pay]} leading={<RowIcon name="wallet-outline" />} />
      <ListItem title={[dietSummary(g.diets), g.alcoholFree ? "Alcohol-free" : ""].filter(Boolean).join(" · ")} leading={<RowIcon name="leaf-outline" />} />
      {!!g.food && <ListItem title={g.food} leading={<RowIcon name="restaurant-outline" />} wrap />}
    </ListGroup>
    {!!g.attendees?.length && <ListGroup title="Going" aside={g.going + " of " + g.seats}>
      <ListItem title={g.organiserName} badge={<StatusPill label="Host" tone="accent" />} leading={<Initial name={g.organiserName} />} onPress={() => openSocial("/person/" + g.organiserId)} />
      {g.attendees.map(a => <ListItem key={a.id} title={a.name} leading={<Initial name={a.name} />} onPress={() => openSocial("/person/" + a.id)} />)}
    </ListGroup>}
    {open && !g.mine && (g.joined ? <><Action label="Add To Calendar" secondary icon="calendar-outline" run={() => calendar(g)} />
      <View style={{ alignItems: "center" }}><Confirm link label="Leave Gathering" action="Leave" text="Give up your place?" run={async () => { await join(false); return true; }} /></View></>
      : <Action label={full ? "Full" : "Join"} disabled={full} run={() => join(true)} />)}
    {g.mine && <>
      <Action label="Duplicate For A New Date" secondary icon="copy-outline" run={async () => router.push({ pathname: "/social/gathering/[id]", params: { id: "new", copy: g.id } })} />
      <View style={{ alignItems: "center" }}><Confirm link label="Delete Gathering" action="Delete" text="Delete this gathering?" run={async () => { await deleteGathering(g.id); updated(); goToPlans(); return true; }} /></View>
    </>}
  </>;
}
function SeatStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <View style={{ gap: 6 }}><FieldLabel>People, Including You</FieldLabel>
    <View style={[common.row, { gap: 12 }]}>
      <IconButton label="Fewer people" icon="remove" onPress={() => onChange(value - 1)} disabled={value <= 2} />
      <T accessibilityLabel={value + " people"} accessibilityLiveRegion="polite" variant="subtitle" style={{ minWidth: 28, textAlign: "center" }}>{value}</T>
      <IconButton label="More people" icon="add" onPress={() => onChange(value + 1)} disabled={value >= 30} />
    </View></View>;
}
const blank: GatheringInput = { title: "", area: "", venue: "", starts: "", seats: 4, diets: ["Plant-Based"], food: "", pay: "own", alcoholFree: false };
/** Your gathering: drafts save privately; posting shows it in Events for everyone. */
function GatheringForm({ initial, copy = false, onChange, area = "" }: { initial?: Gathering; copy?: boolean; onChange?: () => void; area?: string }) {
  const { theme } = usePreferences(), profile = useSocialMe().data?.profile;
  const [g, set] = useState<GatheringInput>(() => initial ? { title: initial.title, area: initial.area, venue: initial.venue, starts: copy ? "" : initial.starts ?? "",
    seats: initial.seats, diets: initial.diets, food: initial.food, pay: initial.pay, alcoholFree: initial.alcoholFree } : { ...blank, area: area.slice(0, 60) });
  const [dirty, setDirty] = useState(false), id = copy ? null : initial?.id ?? null, posted = initial?.state === "posted" && !copy;
  if (profile && profileState(profile).label === "Finish profile") return <EmptyState title="Finish Your Profile First" text="" icon="person-circle-outline" action="Open Profile" onPress={() => openSocial("/profile")} />;
  const update = (patch: Partial<GatheringInput>) => { set({ ...g, ...patch }); setDirty(true); };
  const save = async (post: boolean) => {
    const issue = gatheringIssue(g, Date.now(), post); if (issue) throw new Error(issue);
    const saved = await saveGathering(id, g, post); updated(); setDirty(false);
    if (!id) router.replace(("/social/gathering/" + saved.id) as Href); else onChange?.();
  };
  return <>
    {initial && !copy && <View style={{ alignItems: "flex-start" }}><StatusPill label={posted ? initial.going + " of " + initial.seats + " going" : "Draft"} tone={posted ? "accent" : "muted"} /></View>}
    <FormSection title="Details">
      <Field label="Name" value={g.title} maxLength={80} onChangeText={title => update({ title })} />
      <Field label="Neighbourhood" value={g.area} maxLength={60} onChangeText={area => update({ area })} />
      <Field label="Public Meeting Place" value={g.venue} maxLength={160} placeholder="Hawker centre, cafe or community space" onChangeText={venue => update({ venue })} />
      {outdoorVenue(g.venue) && <T variant="small" color={theme.warning}>No public drinking 10.30pm–7am</T>}
      <SgDateTimeField label="Date & Time" value={g.starts} onChange={starts => update({ starts })} />
    </FormSection>
    <FormSection title="People & food">
      <SeatStepper value={g.seats} onChange={seats => update({ seats })} />
      <View style={{ gap: 6 }}><FieldLabel>Diet</FieldLabel><DietChoices value={g.diets} onChange={diets => update({ diets })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Who Pays</FieldLabel><Chips label="Who pays">{payOptions.map(option => <Chip key={option} label={payLabels[option]} role="radio" compact selected={g.pay === option} onPress={() => update({ pay: option })} />)}</Chips></View>
      <IngredientCheck label="Alcohol-free" checked={g.alcoholFree} onPress={() => update({ alcoholFree: !g.alcoholFree })} />
      <Field label="Food" value={g.food} maxLength={1000} multiline placeholder="What everyone brings or orders, and what to avoid" onChangeText={food => update({ food })} />
    </FormSection>
    {posted && !!initial?.attendees?.length && <ListGroup title="Going">{initial.attendees.map(a => <ListItem key={a.id} title={a.name} leading={<Initial name={a.name} />} onPress={() => openSocial("/person/" + a.id)} />)}</ListGroup>}
    <Action label={posted ? (dirty ? "Save Changes" : "Saved") : "Post Gathering"} disabled={posted && !dirty} run={() => save(true)} />
    {!posted && <Action label="Save Draft" secondary run={() => save(false)} />}
    {posted && <Action label="Add To Calendar" secondary icon="calendar-outline" run={() => calendar({ ...initial, ...g })} />}
    {initial && !copy && <View style={{ alignItems: "center" }}>{posted
      ? <Confirm link label="Cancel Gathering" action="Cancel gathering" text="Cancel this gathering for everyone going?" run={async () => { await cancelGathering(initial.id); updated(); onChange?.(); return true; }} />
      : <Confirm link label="Delete Draft" action="Delete" text="Delete this draft?" run={async () => { await deleteGathering(initial.id); updated(); goToPlans(); return true; }} />}</View>}
  </>;
}
