import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { SocialGate } from "../../components/social/SocialState";
import { AfterDinnerSheet, AnswerButtons, DinnerReminder, LateChips, isDayOf, useDinnerStatus, usePayText } from "../../components/social/DinnerParts";
import { useMinuteClock } from "../../components/food/Timers";
import { FlagSheet } from "../../components/social/PersonSheets";
import { PlaceThumb } from "../../components/social/Face";
import { Avatar } from "../../components/social/SocialPhoto";
import { LifestyleDetails, PersonAbout } from "../../components/social/PersonDetails";
import { useWhere } from "../../components/social/PersonCard";
import { useDietText } from "../../components/food/DietLabels";
import { Confirm, openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { cancelDinner, dinner as loadDinner, person as loadPerson, places, placesByIdKey } from "../../services/social-api";
import { exportCalendarEvent } from "../../services/calendar-export";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { directionsUrl } from "../../utils/directions";
import { formatSgDateTime, formatSgText, parseSgDateTime, sgDateTile } from "../../utils/sg-datetime";
import type { DinnerDetail, SocialPlace } from "../../types/community";

/**
 * Who the dinner is with: their picture, name and age, area and diet (a tap opens their profile). While the invite waits on you,
 * their bio, hobbies and lifestyle details follow, so it can be weighed on this page (owner, 26 Oct 2026); after that the row
 * alone, as the profile is one tap away. Until their profile loads, the name row; if it fails to load, Try again (a profile
 * that is gone keeps just the name row).
 */
function WithPerson({ d }: { d: DinnerDetail }) {
  const t = useT("social"), diet = useDietText(), whereOf = useWhere();
  const remote = useRemote("/api/social/people/" + d.withId, signal => loadPerson(d.withId, signal)), p = remote.data;
  const where = p ? [whereOf(p), ...p.diets.map(diet.name)].filter(Boolean).join(" · ") : "";
  const name = p?.age ? t("nameAge", { name: p.firstName, age: p.age }) : d.withName, deciding = d.status === "invited" && d.yourTurn;
  return <>
    <ListGroup title={t("withLabel")}>
      <ListItem title={name} subtitle={where || undefined} wrap
        leading={<Avatar uri={p?.photos[0]?.thumb ?? d.photo} size={48} />} onPress={() => openSocial("/person/" + d.withId)} />
    </ListGroup>
    {!p && remote.error?.status !== 404 && <RemoteStatus remote={remote} icon="person-outline" returnTo={"/social/dinner/" + d.id} placeholder={null} />}
    {p && deciding && <PersonAbout p={p} />}
    {p && deciding && <LifestyleDetails p={p} />}
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
/** On the day of a confirmed dinner: its time and one tap to say you're running late. */
function DayOf({ d }: { d: DinnerDetail }) {
  const t = useT("social"), { theme } = usePreferences(), language = useLanguage(), time = sgDateTile(d.starts, language)?.time ?? "";
  return <View style={[s.dayOf, { backgroundColor: theme.accentSoft }]}>
    <View style={[common.row, { gap: 8 }]}><RowIcon name="restaurant-outline" /><T style={[common.bold, common.flex]}>{t("dayOfTitle", { time })}</T></View>
    <LateChips dinner={d} />
  </View>;
}
function DinnerView({ d, place, refresh }: { d: DinnerDetail; place: SocialPlace | null; refresh: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), language = useLanguage(), pay = usePayText()(d), [status, tone] = useDinnerStatus()(d), now = useMinuteClock();
  const open = (url: string) => { void Linking.openURL(url).catch(() => setNotice({ text: t("directionsFailed"), error: true })); };
  const calendar = async () => {
    const start = parseSgDateTime(d.starts);
    if (start === null) return;
    try { await exportCalendarEvent({ uid: d.id, title: t("calendarTitle", { name: d.withName }), start, minutes: 120, location: [d.placeName, place?.address].filter(Boolean).join(", "),
      description: pay + (language === "zh" ? "。" : ". ") + t("fromQuinTaste") }); }
    catch { setNotice({ text: t("calendarFailed"), error: true }); }
  };
  // Someone you trust can know where you'll be: the plan goes out through the phone's own share sheet, nothing is stored.
  const share = async () => {
    const lines = [t("calendarTitle", { name: d.withName }), formatSgText(d.starts, language), d.placeName, place?.address, place?.address ? directionsUrl(place.address) : ""];
    try { await Share.share({ message: lines.filter(Boolean).join("\n") }); }
    catch { setNotice({ text: t("sharingUnavailableDevice"), error: true }); }
  };
  const upcoming = d.status === "accepted" && !d.past, waiting = d.status === "invited" && !d.yourTurn, today = isDayOf(d, now);
  return <>
    <View style={{ height: 170 }}><PlaceThumb place={place} size="fill" radius={20} /></View>
    <View style={{ gap: 6 }}><T variant="title" style={common.bold}>{d.placeName}</T><View style={{ alignSelf: "flex-start" }}><StatusPill label={status} tone={tone} /></View></View>
    {today && <DayOf d={d} />}
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
    {upcoming && <View style={s.actions}>
      <View style={s.action}><Button label={t("addToCalendar")} icon="calendar-outline" variant="secondary" onPress={() => void calendar()} /></View>
      <View style={s.action}><Button label={t("sharePlan")} icon="share-outline" variant="secondary" onPress={() => void share()} /></View>
    </View>}
    <Afterwards d={d} />
    {(waiting || upcoming) && <View style={{ alignItems: "center" }}><Confirm link label={t(waiting ? "cancelInvite" : today ? "cantMakeIt" : "cancelDinner")}
      text={t(today ? "cantMakeItText" : "cancelDinnerText", { name: d.withName })} action={t(waiting ? "cancelInvite" : today ? "cantMakeIt" : "cancelDinner")}
      run={async () => { await cancelDinner(d.id); setNotice({ text: t("dinnerCancelled") }); invalidate("/api/social"); refresh(); return true; }} /></View>}
  </>;
}
const s = StyleSheet.create({
  dayOf: { borderRadius: 16, padding: 14, gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: { flexGrow: 1, flexBasis: 150 },
});
/** One dinner: when, where, who pays and with whom, then what to do now — answer, get ready, or say how it went. */
export function DinnerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), remote = useRemote(id ? "/api/social/dinners/" + id : null, signal => loadDinner(id, signal));
  const d = remote.data, key = d ? placesByIdKey([d.placeId]) : null, place = useRemote(key, signal => places(key!, signal)).data?.items[0] ?? null, [flag, setFlag] = useState(false);
  // What reminders depend on; when this page sees it change (the other person cancelled or moved it), the list reloads so
  // DinnerReminderSync follows.
  const shape = d ? [d.status, d.starts, d.placeName, d.reported].join("|") : "";
  useEffect(() => { if (shape) invalidate("/api/social/dinners"); }, [shape]);
  return <Screen title={t("dinnerTitle")} headerAction={d ? <IconButton appearance="plain" label={t("flagLabel", { name: d.withName })} icon="flag-outline" onPress={() => setFlag(true)} /> : undefined}>
    <SocialGate returnTo={"/social/dinner/" + id}>
      <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social?tab=dining" missing={t("dinnerUnavailable")} />
      {d && <DinnerView d={d} place={place} refresh={remote.refresh} />}
      {d && <FlagSheet person={{ id: d.withId, firstName: d.withName }} hasPhoto={!!d.photo} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
    </SocialGate>
  </Screen>;
}
