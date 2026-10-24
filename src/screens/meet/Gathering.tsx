import { useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Chip, Chips, EmptyState, IconButton } from "../../components/food/Controls";
import { IngredientCheck } from "../../components/market/Ingredients";
import { Field, T, common } from "../../components/ui";
import { Action, Confirm, goToPlans, openSocial } from "../../components/social/Shared";
import { DietChoices, MemberGate, profileState, useDietSummary, useSocialMe } from "../../components/social/MeetUI";
import { translate, useLanguage, useT, type Language } from "../../i18n";
import { FieldLabel, FormSection, Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { SgDateTimeField } from "../../components/social/SgDateTimeField";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { cancelGathering, deleteGathering, gathering as loadGathering, joinGathering, saveGathering } from "../../services/social-api";
import { exportCalendarEvent } from "../../services/calendar-export";
import { payOptions } from "../../types/meet";
import type { Gathering, GatheringInput } from "../../types/community";
import { gatheringIssue, outdoorVenue } from "../../utils/meet";
import { formatSgText, parseSgDateTime } from "../../utils/sg-datetime";

export function MeetGatheringScreen() {
  const { id = "", copy, area } = useLocalSearchParams<{ id: string; copy?: string; area?: string }>(), { member } = useMember(), source = id === "new" ? copy : id;
  const remote = useRemote(member && source ? "/api/social/gatherings/" + source : null, signal => loadGathering(source ?? "", signal)), g = remote.data, t = useT("social");
  const body = id === "new" && !copy ? <GatheringForm key="new" area={area} />
    : !g ? <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" missing={t("gatheringUnavailable")} />
    : id === "new" ? <GatheringForm key={"copy" + g.id} initial={{ ...g, starts: null, state: "draft" }} copy />
    : g.mine && g.state !== "cancelled" && !g.past ? <GatheringForm key={g.id} initial={g} onChange={remote.refresh} />
    : <GatheringView gathering={g} refresh={remote.refresh} />;
  return <Screen title={t(id === "new" ? "newGathering" : "gathering")} backTo="/social"><MemberGate>{body}</MemberGate></Screen>;
}
const updated = () => invalidate("/api/social/gatherings");
async function calendar(g: Pick<Gathering, "id" | "title" | "starts" | "venue" | "area" | "pay" | "alcoholFree">, language: Language) {
  const say = (key: "dateFirst" | "alcoholFree" | "fromQuinTaste") => translate(language, "social", key);
  const at = parseSgDateTime(g.starts ?? ""); if (at === null) throw new Error(say("dateFirst"));
  const parts = [g.area, translate(language, "social", "optPay", { value: g.pay }), g.alcoholFree ? say("alcoholFree") : "", say("fromQuinTaste")].filter(Boolean);
  await exportCalendarEvent({ uid: g.id, title: g.title, start: at, minutes: 120, location: g.venue, description: parts.join(language === "zh" ? "。" : ". ") });
}
/** Someone else's gathering, or one that has ended: details, who is going, and join or leave. */
function GatheringView({ gathering: g, refresh }: { gathering: Gathering; refresh: () => void }) {
  const full = g.going >= g.seats, open = g.state === "posted" && !g.past, t = useT("social"), tc = useT("common"), language = useLanguage(), dietSummary = useDietSummary();
  const heldOf = t("heldOf", { held: g.going, size: g.seats });
  const join = async (value: boolean) => { await joinGathering(g.id, value); refresh(); updated(); };
  return <>
    <View style={{ gap: 6 }}>
      <View style={[common.row, { gap: 8 }]}><T variant="subtitle" style={common.flex}>{g.title}</T>
        <StatusPill label={g.state === "cancelled" ? t("cancelled") : g.past ? t("past") : g.joined ? t("going") : full ? t("full") : heldOf} tone={open && !full ? "accent" : "muted"} /></View>
      <T muted>{t("hostedBy", { name: g.organiserName })}</T>
    </View>
    <ListGroup>
      <ListItem title={formatSgText(g.starts ?? "", language) || t("timeToBeSet")} leading={<RowIcon name="calendar-outline" />} />
      <ListItem title={g.venue} subtitle={g.area} leading={<RowIcon name="location-outline" />} wrap />
      <ListItem title={t("optPay", { value: g.pay })} leading={<RowIcon name="wallet-outline" />} />
      <ListItem title={[dietSummary(g.diets), g.alcoholFree ? t("alcoholFree") : ""].filter(Boolean).join(" · ")} leading={<RowIcon name="leaf-outline" />} />
      {!!g.food && <ListItem title={g.food} leading={<RowIcon name="restaurant-outline" />} wrap />}
    </ListGroup>
    {!!g.attendees?.length && <ListGroup title={t("goingTitle")} aside={heldOf}>
      <ListItem title={g.organiserName} badge={<StatusPill label={t("host")} tone="accent" />} leading={<Initial name={g.organiserName} />} onPress={() => openSocial("/person/" + g.organiserId)} />
      {g.attendees.map(a => <ListItem key={a.id} title={a.name} leading={<Initial name={a.name} />} onPress={() => openSocial("/person/" + a.id)} />)}
    </ListGroup>}
    {open && !g.mine && (g.joined ? <><Action label={t("addToCalendar")} secondary icon="calendar-outline" run={() => calendar(g, language)} />
      <View style={{ alignItems: "center" }}><Confirm link label={t("leaveGathering")} action={t("leave")} text={t("leaveGatheringText")} run={async () => { await join(false); return true; }} /></View></>
      : <Action label={t(full ? "full" : "join")} disabled={full} run={() => join(true)} />)}
    {g.mine && <>
      <Action label={t("duplicate")} secondary icon="copy-outline" run={async () => router.push({ pathname: "/social/gathering/[id]", params: { id: "new", copy: g.id } })} />
      <View style={{ alignItems: "center" }}><Confirm link label={t("deleteGathering")} action={tc("delete")} text={t("deleteGatheringText")} run={async () => { await deleteGathering(g.id); updated(); goToPlans(); return true; }} /></View>
    </>}
  </>;
}
function SeatStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const t = useT("social");
  return <View style={{ gap: 6 }}><FieldLabel>{t("peopleIncludingYou")}</FieldLabel>
    <View style={[common.row, { gap: 12 }]}>
      <IconButton label={t("fewerPeople")} icon="remove" onPress={() => onChange(value - 1)} disabled={value <= 2} />
      <T accessibilityLabel={t("peopleCount", { n: value })} accessibilityLiveRegion="polite" variant="subtitle" style={{ minWidth: 28, textAlign: "center" }}>{value}</T>
      <IconButton label={t("morePeople")} icon="add" onPress={() => onChange(value + 1)} disabled={value >= 30} />
    </View></View>;
}
const blank: GatheringInput = { title: "", area: "", venue: "", starts: "", seats: 4, diets: ["Plant-Based"], food: "", pay: "own", alcoholFree: false };
/** Your gathering: drafts save privately; posting shows it in Events for everyone. */
function GatheringForm({ initial, copy = false, onChange, area = "" }: { initial?: Gathering; copy?: boolean; onChange?: () => void; area?: string }) {
  const { theme } = usePreferences(), profile = useSocialMe().data?.profile, t = useT("social"), tc = useT("common"), language = useLanguage();
  const [g, set] = useState<GatheringInput>(() => initial ? { title: initial.title, area: initial.area, venue: initial.venue, starts: copy ? "" : initial.starts ?? "",
    seats: initial.seats, diets: initial.diets, food: initial.food, pay: initial.pay, alcoholFree: initial.alcoholFree } : { ...blank, area: area.slice(0, 60) });
  const [dirty, setDirty] = useState(false), id = copy ? null : initial?.id ?? null, posted = initial?.state === "posted" && !copy;
  if (profile && profileState(profile).id === "finish") return <EmptyState title={t("finishProfileFirst")} text="" icon="person-circle-outline" action={t("openProfile")} onPress={() => openSocial("/profile")} />;
  const update = (patch: Partial<GatheringInput>) => { set({ ...g, ...patch }); setDirty(true); };
  const save = async (post: boolean) => {
    const issue = gatheringIssue(g, Date.now(), post, language); if (issue) throw new Error(issue);
    const saved = await saveGathering(id, g, post); updated(); setDirty(false);
    if (!id) router.replace(("/social/gathering/" + saved.id) as Href); else onChange?.();
  };
  return <>
    {initial && !copy && <View style={{ alignItems: "flex-start" }}><StatusPill label={posted ? t("goingOf", { going: initial.going, seats: initial.seats }) : t("draft")} tone={posted ? "accent" : "muted"} /></View>}
    <FormSection title={t("details")}>
      <Field label={t("name")} value={g.title} maxLength={80} onChangeText={title => update({ title })} />
      <Field label={t("neighbourhood")} value={g.area} maxLength={60} onChangeText={area => update({ area })} />
      <Field label={t("meetingPlace")} value={g.venue} maxLength={160} placeholder={t("meetingPlaceHint")} onChangeText={venue => update({ venue })} />
      {outdoorVenue(g.venue) && <T variant="small" color={theme.warning}>{t("noDrinking")}</T>}
      <SgDateTimeField label={t("dateTime")} value={g.starts} onChange={starts => update({ starts })} />
    </FormSection>
    <FormSection title={t("peopleAndFood")}>
      <SeatStepper value={g.seats} onChange={seats => update({ seats })} />
      <View style={{ gap: 6 }}><FieldLabel>{t("diet")}</FieldLabel><DietChoices value={g.diets} onChange={diets => update({ diets })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>{t("whoPays")}</FieldLabel><Chips label={t("whoPaysGroup")}>{payOptions.map(option => <Chip key={option} label={t("optPay", { value: option })} role="radio" compact selected={g.pay === option} onPress={() => update({ pay: option })} />)}</Chips></View>
      <IngredientCheck label={t("alcoholFree")} checked={g.alcoholFree} onPress={() => update({ alcoholFree: !g.alcoholFree })} />
      <Field label={t("food")} value={g.food} maxLength={1000} multiline placeholder={t("foodHint")} onChangeText={food => update({ food })} />
    </FormSection>
    {posted && !!initial?.attendees?.length && <ListGroup title={t("goingTitle")}>{initial.attendees.map(a => <ListItem key={a.id} title={a.name} leading={<Initial name={a.name} />} onPress={() => openSocial("/person/" + a.id)} />)}</ListGroup>}
    <Action label={posted ? (dirty ? t("saveChanges") : t("savedState")) : t("postGathering")} disabled={posted && !dirty} run={() => save(true)} />
    {!posted && <Action label={t("saveDraft")} secondary run={() => save(false)} />}
    {posted && <Action label={t("addToCalendar")} secondary icon="calendar-outline" run={() => calendar({ ...initial, ...g }, language)} />}
    {initial && !copy && <View style={{ alignItems: "center" }}>{posted
      ? <Confirm link label={t("cancelGathering")} action={t("cancelGatheringAction")} text={t("cancelGatheringText")} run={async () => { await cancelGathering(initial.id); updated(); onChange?.(); return true; }} />
      : <Confirm link label={t("deleteDraft")} action={tc("delete")} text={t("deleteDraftText")} run={async () => { await deleteGathering(initial.id); updated(); goToPlans(); return true; }} />}</View>}
  </>;
}
