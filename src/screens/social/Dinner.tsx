import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { SocialGate } from "../../components/social/SocialState";
import { AfterDinnerSheet, AnswerButtons, DinnerReminder, useDinnerStatus, usePayText } from "../../components/social/DinnerParts";
import { FlagSheet } from "../../components/social/PersonSheets";
import { PlaceThumb } from "../../components/social/Face";
import { Avatar } from "../../components/social/SocialPhoto";
import { LifestyleDetails, PersonAbout } from "../../components/social/PersonDetails";
import { useWhere } from "../../components/social/PersonCard";
import { useDietText } from "../../components/food/DietLabels";
import { Confirm, openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { cancelDinner, dinner as loadDinner, person as loadPerson, places, placesByIdKey } from "../../services/social-api";
import { exportCalendarEvent } from "../../services/calendar-export";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { directionsUrl } from "../../utils/directions";
import { formatSgDateTime, formatSgText, parseSgDateTime } from "../../utils/sg-datetime";
import type { DinnerDetail, SocialPlace } from "../../types/community";

/**
 * Who the dinner is with: their picture, name and age, area and diet (a tap opens their profile), then their bio, hobbies and
 * lifestyle details, so an invite can be weighed on this page (owner, 26 Oct 2026). Until their profile loads, the name row;
 * if it fails to load, Try again (a profile that is gone keeps just the name row).
 */
function WithPerson({ d }: { d: DinnerDetail }) {
  const t = useT("social"), diet = useDietText(), whereOf = useWhere();
  const remote = useRemote("/api/social/people/" + d.withId, signal => loadPerson(d.withId, signal)), p = remote.data;
  const where = p ? [whereOf(p), ...p.diets.map(diet.name)].filter(Boolean).join(" · ") : "";
  const name = p?.age ? t("nameAge", { name: p.firstName, age: p.age }) : d.withName;
  return <>
    <ListGroup title={t("withLabel")}>
      <ListItem title={name} subtitle={where || undefined} wrap
        leading={<Avatar uri={p?.photos[0]?.thumb ?? d.photo} size={48} />} onPress={() => openSocial("/person/" + d.withId)} />
    </ListGroup>
    {!p && remote.error?.status !== 404 && <RemoteStatus remote={remote} icon="person-outline" returnTo={"/social/dinner/" + d.id} placeholder={null} />}
    {p && <PersonAbout p={p} />}
    {p && <LifestyleDetails p={p} />}
  </>;
}
/** After the dinner: your own answer, the note they left you, and the mutual card only when you both said yes. */
function Afterwards({ d }: { d: DinnerDetail }) {
  const t = useT("social"), { theme } = usePreferences(), [open, setOpen] = useState(false);
  if (d.status !== "accepted" || !d.past) return null;
  if (!d.mine) return !d.reportOpen ? null : <><Button label={t("tellUsAction")} icon="chatbubble-ellipses-outline" onPress={() => setOpen(true)} />
    <AfterDinnerSheet dinner={d} visible={open} onClose={() => setOpen(false)} /></>;
  const met = { yes: "metYes", no_show: "metNoShow", didnt_go: "metDidntGo" } as const;
  return <>
    {d.again && <View style={{ borderRadius: 16, padding: 14, gap: 4, backgroundColor: theme.successSoft }}>
      <T style={common.bold} color={theme.success}>{t("bothAgain")}</T></View>}
    <ListGroup title={t("yourAnswer")}>
      <ListItem title={t(met[d.mine.met])} leading={<RowIcon name="checkmark-circle-outline" tone="muted" />} />
      {d.mine.eatAgain !== null && <ListItem title={t(d.mine.eatAgain ? "eatAgainYes" : "eatAgainNo")} subtitle={t("eatAgainNote")} wrap leading={<RowIcon name="heart-outline" tone="muted" />} />}
      {!!d.mine.note && <ListItem title={d.mine.note} subtitle={t("noteTo", { name: d.withName })} wrap leading={<RowIcon name="create-outline" tone="muted" />} />}
    </ListGroup>
    {!!d.theirNote && <ListGroup title={t("theirNote", { name: d.withName })}><ListItem title={d.theirNote} wrap leading={<Avatar uri={d.photo} size={36} />} /></ListGroup>}
  </>;
}
function DinnerView({ d, place, refresh }: { d: DinnerDetail; place: SocialPlace | null; refresh: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), language = useLanguage(), pay = usePayText()(d), [status, tone] = useDinnerStatus()(d);
  const open = (url: string) => { void Linking.openURL(url).catch(() => setNotice({ text: t("directionsFailed"), error: true })); };
  const calendar = async () => {
    const start = parseSgDateTime(d.starts);
    if (start === null) return;
    try { await exportCalendarEvent({ uid: d.id, title: t("calendarTitle", { name: d.withName }), start, minutes: 120, location: [d.placeName, place?.address].filter(Boolean).join(", "),
      description: pay + (language === "zh" ? "。" : ". ") + t("fromQuinTaste") }); }
    catch { setNotice({ text: t("calendarFailed"), error: true }); }
  };
  const upcoming = d.status === "accepted" && !d.past, waiting = d.status === "invited" && !d.yourTurn;
  return <>
    <View style={{ height: 170 }}><PlaceThumb place={place} size="fill" radius={20} /></View>
    <View style={{ gap: 6 }}><T variant="title" style={common.bold}>{d.placeName}</T><View style={{ alignSelf: "flex-start" }}><StatusPill label={status} tone={tone} /></View></View>
    <ListGroup>
      <ListItem title={formatSgText(d.starts, language)} subtitle={t("when")} leading={<RowIcon name="time-outline" />} />
      <ListItem title={place?.address || d.placeName} subtitle={t("whereLabel")} wrap leading={<RowIcon name="location-outline" />}
        trailing={place?.address ? <IconButton label={t("directions")} icon="navigate-outline" appearance="plain" onPress={() => open(directionsUrl(place.address))} /> : undefined} />
      <ListItem title={pay} subtitle={t("payLabel")} leading={<RowIcon name="wallet-outline" />} />
      {!!d.message && <ListItem title={d.message} subtitle={t("messageLabel")} wrap leading={<RowIcon name="chatbubble-outline" tone="muted" />} />}
      {upcoming && <DinnerReminder dinner={d} />}
    </ListGroup>
    <WithPerson d={d} />
    {d.status === "invited" && d.yourTurn && <><T variant="small" muted>{t("answerBy", { date: formatSgDateTime(Date.parse(d.expiresAt), language) })}</T>
      <AnswerButtons dinner={d} onDone={refresh} /></>}
    {upcoming && <Button label={t("addToCalendar")} icon="calendar-outline" variant="secondary" onPress={() => void calendar()} />}
    <Afterwards d={d} />
    {(waiting || upcoming) && <View style={{ alignItems: "center" }}><Confirm link label={t(waiting ? "cancelInvite" : "cancelDinner")} text={t("cancelDinnerText", { name: d.withName })}
      action={t(waiting ? "cancelInvite" : "cancelDinner")} run={async () => { await cancelDinner(d.id); setNotice({ text: t("dinnerCancelled") }); invalidate("/api/social"); refresh(); return true; }} /></View>}
  </>;
}
/** One dinner: when, where, who pays and with whom, then what to do now — answer, get ready, or say how it went. */
export function DinnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), remote = useRemote(id ? "/api/social/dinners/" + id : null, signal => loadDinner(id, signal));
  const d = remote.data, key = d ? placesByIdKey([d.placeId]) : null, place = useRemote(key, signal => places(key!, signal)).data?.items[0] ?? null, [flag, setFlag] = useState(false);
  useReminderSync(d ? [d] : undefined, false);
  return <Screen title={t("dinnerTitle")} headerAction={d ? <IconButton label={t("flagLabel", { name: d.withName })} icon="flag-outline" onPress={() => setFlag(true)} /> : undefined}>
    <SocialGate returnTo={"/social/dinner/" + id}>
      <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social?tab=dinners" missing={t("dinnerUnavailable")} />
      {d && <DinnerView d={d} place={place} refresh={remote.refresh} />}
      {d && <FlagSheet person={{ id: d.withId, firstName: d.withName }} hasPhoto={!!d.photo} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
    </SocialGate>
  </Screen>;
}
