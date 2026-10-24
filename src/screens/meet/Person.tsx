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
import { inCommon } from "../../utils/social-match";
import { useLanguage, useT } from "../../i18n";
import type { Person } from "../../types/community";
import type { IconName } from "../../components/ui";

export function MeetPersonScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember(), [menu, setMenu] = useState(false), [inviting, setInviting] = useState(false);
  const remote = useRemote(member ? "/api/social/people/" + id : null, signal => loadPerson(id, signal)), person = remote.data, mine = useSocialMe().data?.profile;
  const t = useT("social");
  return <Screen backTo="/social" headerAction={person ? <IconButton label={t("moreOptions")} icon="ellipsis-horizontal" onPress={() => setMenu(true)} /> : undefined}>
    <MemberGate>{person ? <Profile person={person} onInvite={() => setInviting(true)} /> : <RemoteStatus remote={remote} icon="person-outline" returnTo="/social" missing={t("profileUnavailable")} />}</MemberGate>
    {person && <PersonMenu person={person} visible={menu} onClose={() => setMenu(false)} />}
    {person && mine && inviting && <InviteSheet person={person} me={mine} visible onClose={() => setInviting(false)} />}
  </Screen>;
}
/** Report, block and safety live behind one menu. */
function PersonMenu({ person, visible, onClose }: { person: Person; visible: boolean; onClose: () => void }) {
  const [report, setReport] = useState(false), t = useT("social");
  const blocked = () => { invalidate("/api/social/", "/api/market/"); goToPlans(); };
  return <>
    <MarketModal visible={visible} onClose={onClose} label={person.firstName}>
      <Button label={t("reportName", { name: person.firstName })} variant="secondary" icon="flag-outline" onPress={() => { onClose(); setReport(true); }} />
      <Confirm label={t("blockName", { name: person.firstName })} action={t("block")} text={t("blockText", { name: person.firstName })}
        run={async () => { await block(person.id); onClose(); blocked(); return true; }} />
      <Button label={t("safetyHelp")} variant="secondary" icon="shield-checkmark-outline" onPress={() => { onClose(); openSocial("/safety"); }} />
    </MarketModal>
    <ReportSheet kind="person" targetId={person.id} name={person.firstName} visible={report} onClose={() => setReport(false)} onBlocked={blocked} />
  </>;
}
/** The sticky action: open the chat you share, finish your profile, or invite to a table. */
function PersonAction({ person, onInvite }: { person: Person; onInvite: () => void }) {
  const mine = useSocialMe().data?.profile, t = useT("social");
  if (person.groupId) return <Button label={t("openChat")} icon="chatbubble-outline" onPress={() => openSocial("/chat/" + person.groupId)} />;
  if (!mine) return null;
  if (profileState(mine).id !== "open") return <Button label={t("finishToInvite")} onPress={() => openSocial("/profile")} />;
  return <Button label={t("inviteToTable")} icon="restaurant-outline" onPress={onInvite} />;
}
type Detail = { icon: IconName; title: string; subtitle?: string };
type Say = ReturnType<typeof useT<"social">>;
type Option = "optEducation" | "optLanguage" | "optWhy" | "optHabit" | "optFamily" | "optPet" | "optEthnicity" | "optHobby" | "optTime";
function details(p: Person, t: Say): Detail[] {
  const one = (key: Option, value: string) => t(key, { value }), many = (key: Option, values: readonly string[]) => values.map(value => one(key, value)).join(t("listSep"));
  const rows: (Detail | false)[] = [
    !!p.work && { icon: "briefcase-outline", title: p.work }, !!p.education && { icon: "school-outline", title: one("optEducation", p.education) },
    !!p.languages.length && { icon: "language-outline", title: many("optLanguage", p.languages) },
    !!p.why.length && { icon: "leaf-outline", title: many("optWhy", p.why), subtitle: t("whyPlantBasedLower") },
    !!p.grewUp && { icon: "home-outline", title: p.grewUp, subtitle: t("grewUpInLower") }, !!p.height && { icon: "resize-outline", title: t("cm", { n: p.height }) },
    !!p.drinking && { icon: "wine-outline", title: t("drinks", { value: one("optHabit", p.drinking) }) }, !!p.smoking && { icon: "flame-outline", title: t("smokes", { value: one("optHabit", p.smoking) }) },
    !!p.family && { icon: "people-circle-outline", title: one("optFamily", p.family) }, !!p.pets.length && { icon: "paw-outline", title: many("optPet", p.pets) },
    !!p.ethnicity && { icon: "globe-outline", title: one("optEthnicity", p.ethnicity) },
    !!p.hobbies.length && { icon: "bicycle-outline", title: many("optHobby", p.hobbies), subtitle: t("hobbiesTitle") },
    !!p.times.length && { icon: "time-outline", title: many("optTime", p.times), subtitle: t("usuallyFreeGroup") },
    !!p.excluded.length && { icon: "close-circle-outline", title: p.excluded.map(item => t("optIngredient", { value: item })).join(t("listSep")), subtitle: t("avoids") },
  ];
  return rows.filter((row): row is Detail => !!row);
}
function Spots({ ids }: { ids: string[] }) {
  const key = placesByIdKey(ids), remote = useRemote(key, signal => places(key!, signal)), items = remote.data?.items ?? [], t = useT("social");
  if (!items.length) return null;
  return <ListGroup title={t("usualSpots")}>{items.map(place => <ListItem key={place.id} title={place.name} subtitle={place.branch || undefined}
    leading={<PlaceThumb place={place} size={40} radius={10} />} onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + place.id } } as never)} />)}</ListGroup>;
}
function Profile({ person: p, onInvite }: { person: Person; onInvite: () => void }) {
  const t = useT("social"), mine = useSocialMe().data?.profile, shared = inCommon(mine, p, useLanguage()), pills: { label: string; tone: Tone }[] = [
    { label: t("optHereFor", { value: p.hereFor }), tone: "accent" }, ...(p.religion ? [{ label: t("optReligion", { value: p.religion }), tone: "muted" as Tone }] : []),
    ...(p.gender ? [{ label: t("optGender", { value: p.gender === "woman" ? "woman" : "man" }), tone: "muted" as Tone }] : [])];
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
    {!!shared.length && <View style={{ gap: 6 }}><T variant="small" muted style={common.bold}>{t("inCommon")}</T><InCommon items={shared} max={6} /></View>}
    {p.prompts.map(prompt => <Card key={prompt.q} style={{ gap: 4 }}><T variant="small" muted style={common.bold}>{t("optPrompt", { value: prompt.q })}</T><T variant="subtitle">{prompt.a}</T></Card>)}
    {!!p.about && <T>{p.about}</T>}
    <ListGroup>{details(p, t).map(d => <ListItem key={d.title + d.icon} title={d.title} subtitle={d.subtitle} wrap leading={<RowIcon name={d.icon} />} />)}</ListGroup>
    <Spots ids={p.spots} />
    {!!p.kakiSays?.length && <ListGroup title={t("kakiSays")}>{p.kakiSays.map(k => <ListItem key={k.byName + k.body} title={"“" + k.body + "”"} subtitle={k.byName} wrap />)}</ListGroup>}
    {!!p.opening && <ListGroup><ListItem title={p.opening} subtitle={t("answerInInvite")} wrap leading={<RowIcon name="chatbubble-ellipses-outline" />} /></ListGroup>}
  </>;
}
