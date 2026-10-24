import { useState } from "react";
import { View } from "react-native";
import { Chip, Chips, HorizontalChips } from "../food/Controls";
import { Button, Field, T } from "../ui";
import { Action, ActionChip, openSocial } from "./Shared";
import { FieldLabel, ListGroup, ListItem, RowIcon, StatusPill } from "../GroupedList";
import { SgDateTimeField } from "./SgDateTimeField";
import { Face } from "./Face";
import { PlacePicker } from "./PlacePicker";
import { planningAreaFor } from "../../utils/planning-area";
import { useDietSummary, useSocialMe } from "./MeetUI";
import { useT } from "../../i18n";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useRemote } from "../../hooks/useRemote";
import { addPerson, people, peopleKey, plan } from "../../services/social-api";
import { acceptedCount, outdoorVenue, reservedCount } from "../../utils/meet";
import { planDateProblem } from "../../utils/sg-datetime";
import { publicVenues } from "../../data/meet";
import { defaultMeetFilters, payOptions, type PayOption } from "../../types/meet";
import type { Group, GroupMember, SocialPlace } from "../../types/community";

const statusKey = { accepted: "joined", invited: "invited", declined: "declined", left: "left" } as const satisfies Record<GroupMember["status"], string>;
export function MemberRow({ member: m }: { member: GroupMember }) {
  const t = useT("social"), status = t(statusKey[m.status]);
  return <ListItem title={m.isMe ? t("nameYou", { name: m.name }) : m.name} leading={<Face id={m.id} name={m.name} hasFace={m.hasFace} size={40} />} label={m.name + ", " + status}
    onPress={m.isMe ? undefined : () => openSocial("/person/" + m.id)}
    trailing={<StatusPill label={m.confirmed ? t("confirmed") : status} tone={m.confirmed ? "success" : m.status === "accepted" ? "accent" : "muted"} />} />;
}
/** Everyone in the group, then people you can still invite while there is room. */
export function GroupMembers({ group: g, onChange }: { group: Group; onChange: () => void }) {
  const [invite, setInvite] = useState(false), visible = !!useSocialMe().data?.profile.visible, t = useT("social"), dietSummary = useDietSummary();
  const key = invite ? peopleKey("", defaultMeetFilters()) : null, candidates = useRemote(key, signal => people(key ?? "", signal));
  const room = g.myStatus === "accepted" && g.origin !== "table" && reservedCount(g) < g.size;
  const open = (candidates.data?.items ?? []).filter(p => !g.members.some(m => m.id === p.id && (m.status === "accepted" || m.status === "invited")));
  return <>
    <ListGroup title={t("people")} aside={t("heldOf", { held: acceptedCount(g), size: g.size })}>
      {g.members.map(m => <MemberRow key={m.id} member={m} />)}
      {room && <ListItem title={t("invitePeople")} leading={<RowIcon name="person-add-outline" />} onPress={() => setInvite(!invite)}
        trailing={<StatusPill label={invite ? t("hide") : t("openCount", { n: g.size - reservedCount(g) })} />} />}
    </ListGroup>
    {room && invite && <ListGroup>
      {!visible ? <ListItem title={t("turnOnOpen")} leading={<RowIcon name="eye-outline" tone="warning" />} onPress={() => openSocial("/profile")} />
        : open.length ? open.map(p => <ListItem key={p.id} title={p.firstName} subtitle={dietSummary(p.diets) + " · " + p.area} leading={<Face id={p.id} name={p.firstName} hasFace={p.hasFace} size={40} />}
          trailing={<ActionChip label={t("invite")} icon="add" run={async () => { await addPerson(g.id, p.id); onChange(); }} />} />)
        : <ListItem title={t(candidates.data ? "noOneElse" : "loadingPlain")} leading={<RowIcon name="people-outline" tone="muted" />} />}
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
  const { theme } = usePreferences(), suggestions = useVenueSuggestions(), t = useT("social"), tc = useT("common");
  const [venue, setVenue] = useState(g.venue), [starts, setStarts] = useState(g.starts), [food, setFood] = useState(g.food), [pay, setPay] = useState<PayOption>(g.pay);
  // A place chosen from Explore keeps its photo, hours and area; typing another place drops it (the server keeps it while the name is unchanged).
  const [place, setPlace] = useState<SocialPlace | null>(null), [picking, setPicking] = useState(false);
  const choose = (picked: SocialPlace) => { setPlace(picked); setVenue([picked.name, picked.branch].filter(Boolean).join(" \u00B7 ")); };
  const save = async () => {
    const problem = venue.trim().length < 3 ? "addPublicPlace" : planDateProblem(starts, Date.now());
    if (problem) throw new Error(t(problem));
    const chosen = place && venue === [place.name, place.branch].filter(Boolean).join(" \u00B7 ") ? place : null;
    const areaCode = chosen?.point ? planningAreaFor(chosen.point.latitude, chosen.point.longitude)?.code ?? null : null;
    await plan(g.id, { venue, starts, food, pay, placeId: chosen?.id ?? null, areaCode }); onDone();
  };
  return <View style={{ gap: 12 }}>
    <Field label={t("place")} value={venue} maxLength={160} placeholder={t("placeHint")} onChangeText={setVenue} />
    <HorizontalChips><Chip label={t("chooseFromExplore")} icon="search" compact onPress={() => setPicking(true)} />
      {suggestions.map(name => <Chip key={name} label={name} compact selected={venue === name} onPress={() => { setVenue(name); setPlace(null); }} />)}</HorizontalChips>
    <PlacePicker visible={picking} onClose={() => setPicking(false)} onPick={choose} />
    {outdoorVenue(venue) && <T variant="small" color={theme.warning}>{t("noDrinking")}</T>}
    <SgDateTimeField label={t("dateTime")} value={starts} onChange={setStarts} />
    <View style={{ gap: 6 }}><FieldLabel>{t("whoPays")}</FieldLabel><Chips label={t("whoPaysGroup")}>{payOptions.map(option => <Chip key={option} label={t("optPay", { value: option })} role="radio" compact selected={pay === option} onPress={() => setPay(option)} />)}</Chips></View>
    <Field label={t("food")} value={food} multiline maxLength={1000} placeholder={t("menuHint")} onChangeText={setFood} />
    <Action label={t(g.venue ? "savePlan" : "proposePlan")} run={save} />
    {!!g.venue && <Button label={tc("cancel")} variant="link" onPress={onDone} />}
  </View>;
}
