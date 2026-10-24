import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { SocialGate, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { AskBox, NameOnPhoto, PersonPills, useWhere } from "../../components/social/PersonCard";
import { FlagSheet, RequestSheet } from "../../components/social/PersonSheets";
import { OnPhoto, PhotoCarousel } from "../../components/social/SocialPhoto";
import { PlaceThumb } from "../../components/social/Face";
import { Confirm, openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { acceptRequest, cancelRequest, person as loadPerson, places, placesByIdKey, removeFriend } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { PersonPage, SocialMe } from "../../types/community";

function Facts({ p }: { p: PersonPage }) {
  const t = useT("social"), list = (values: string[], word: "optWhy" | "optLanguage" | "optPet") => values.map(value => t(word, { value })).join(t("listSep"));
  const rows: [string, string, Parameters<typeof RowIcon>[0]["name"]][] = [
    [t("work"), p.work, "briefcase-outline"], [t("education"), p.education && t("optEducation", { value: p.education }), "school-outline"],
    [t("grewUp"), p.grewUp, "home-outline"], [t("languages"), list(p.languages, "optLanguage"), "chatbubbles-outline"],
    [t("whyPlantBased"), list(p.why, "optWhy"), "leaf-outline"], [t("height"), p.height ? t("heightValue", { cm: p.height }) : "", "resize-outline"],
    [t("drinking"), p.drinking && t("optHabit", { value: p.drinking }), "wine-outline"], [t("smoking"), p.smoking && t("optHabit", { value: p.smoking }), "flame-outline"],
    [t("pets"), list(p.pets, "optPet"), "paw-outline"], [t("religion"), p.religion && t("optReligion", { value: p.religion }), "sparkles-outline"],
    [t("ethnicity"), p.ethnicity && t("optEthnicity", { value: p.ethnicity }), "people-outline"]];
  const shown = rows.filter(([, value]) => value);
  return shown.length ? <ListGroup title={t("detailsHeading")}>{shown.map(([title, value, icon]) =>
    <ListItem key={title} title={value} subtitle={title} leading={<RowIcon name={icon} tone="muted" />} wrap />)}</ListGroup> : null;
}
function Spots({ ids }: { ids: string[] }) {
  const t = useT("social"), key = placesByIdKey(ids), rows = useRemote(key, signal => places(key!, signal)).data?.items ?? [];
  return rows.length ? <ListGroup title={t("favouritePlaces")} inset={64}>{rows.map(place => <ListItem key={place.id} title={place.name} subtitle={place.branch || undefined}
    leading={<PlaceThumb place={place} size={44} radius={10} />} onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + place.id } } as never)} />)}</ListGroup> : null;
}
/** The main action for this person: Add Friend, the request either way, or Message and Invite To Dinner once friends. */
function Actions({ p, me, onChange }: { p: PersonPage; me: SocialMe; onChange: () => void }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), [adding, setAdding] = useState(false), [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); invalidate("/api/social"); onChange(); } catch (failure) { setNotice({ text: problem(failure, p.firstName), error: true }); } finally { setBusy(false); }
  };
  if (p.id === me.id) return null;
  if (p.friend) return <View style={{ gap: 8 }}>
    <Button label={t("message")} icon="chatbubble-outline" onPress={() => openSocial("/chat/" + p.id)} />
    {p.canInvite && <Button label={t("inviteToDinner")} icon="restaurant-outline" variant="secondary" onPress={() => openSocial("/invite/" + p.id)} />}
  </View>;
  if (p.request?.mine) return <Button label={t("cancelRequest")} icon="close" variant="secondary" loading={busy} onPress={() => void run(() => cancelRequest(p.request!.id))} />;
  if (p.request) return <View style={{ gap: 8 }}>
    {!!p.request.note && <View style={{ gap: 2 }}><T variant="small" muted style={common.bold}>{t("theySaid", { name: p.firstName })}</T><T>{p.request.note}</T></View>}
    <Button label={t("acceptRequest")} icon="checkmark" loading={busy} onPress={() => void run(() => acceptRequest(p.request!.id))} />
  </View>;
  return <>
    <Button label={t("addFriend")} icon="person-add-outline" disabled={!me.standing.canMeet} onPress={() => setAdding(true)} />
    <RequestSheet person={p} visible={adding} onClose={() => setAdding(false)} onSent={onChange} />
  </>;
}
function PersonView({ p, me, refresh }: { p: PersonPage; me: SocialMe; refresh: () => void }) {
  const t = useT("social"), where = useWhere()(p);
  return <>
    <PhotoCarousel photos={p.photos} name={p.firstName} height={460} radius={20}>
      <NameOnPhoto person={p} verified={p.verified} />{!!where && <OnPhoto variant="small">{where}</OnPhoto>}
    </PhotoCarousel>
    {p.friend && <View style={{ alignSelf: "flex-start" }}><StatusPill label={t("tabFriends")} tone="success" /></View>}
    <PersonPills person={p} max={12} />
    {!!p.about && <T>{p.about}</T>}
    <AskBox text={p.opening} />
    <Actions p={p} me={me} onChange={refresh} />
    <Facts p={p} />
    <Spots ids={p.spots} />
    {p.friend && <View style={{ alignItems: "center" }}><Confirm link label={t("removeFriend")} text={t("removeFriendText")} action={t("removeFriend")}
      run={async () => { await removeFriend(p.id); invalidate("/api/social"); router.back(); return true; }} /></View>}
  </>;
}
/** Another member's profile: photos, food, an easy opener, details they chose to show and their favourite places. */
export function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), me = useSocialMe().data;
  const remote = useRemote(id ? "/api/social/people/" + id : null, signal => loadPerson(id, signal)), [flag, setFlag] = useState(false), p = remote.data;
  return <Screen title={p?.firstName ?? ""} headerAction={p && me && p.id !== me.id ? <IconButton label={t("flagLabel", { name: p.firstName })} icon="flag-outline" onPress={() => setFlag(true)} /> : undefined}>
    <SocialGate returnTo={"/social/person/" + id}>
      <RemoteStatus remote={remote} icon="person-outline" returnTo="/social" missing={t("profileUnavailable")} />
      {p && me && <PersonView p={p} me={me} refresh={remote.refresh} />}
      {p && <FlagSheet person={p} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
    </SocialGate>
  </Screen>;
}
