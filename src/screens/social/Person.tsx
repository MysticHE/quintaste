import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common, type IconName } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon, type Tone } from "../../components/GroupedList";
import { useDietText } from "../../components/food/DietLabels";
import { MemberGate, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { LifestyleDetails, PersonAbout } from "../../components/social/PersonDetails";
import { useWhere } from "../../components/social/PersonCard";
import { FlagSheet, RequestSheet } from "../../components/social/PersonSheets";
import { Avatar, PhotoCarousel } from "../../components/social/SocialPhoto";
import { BorderFrame } from "../../components/collection/Glint";
import { BadgeRow } from "../../components/collection/CollectionParts";
import { borderArt } from "../../config/collection";
import { GiftSheet, useGiftCatalog } from "../../components/collection/Gifts";
import { AreaLine, SummaryLayout } from "../../components/social/ProfileSummary";
import { PersonPostGrid, type ContentKind } from "../../components/social/ProfileGrid";
import { ChoiceChips } from "../../components/social/ProfileControls";
import { PillButton } from "../../components/social/PillButton";
import { PlaceThumb } from "../../components/social/Face";
import { Confirm, openSocial } from "../../components/social/Shared";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { acceptRequest, cancelRequest, declineRequest, personPageKey, personWithPosts, places, placesByIdKey, removeFriend } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { PersonPage, PersonPosts, PersonWithPosts, SocialMe } from "../../types/community";

/**
 * Another member's profile, laid out like the member's own Social profile (owner, 26 Oct 2026): picture (their first photo,
 * else Lian), Friends · Posts, area and diet, bio and hobbies, where the two of you stand, lifestyle details (only between
 * Dining members of the opposite gender; the server leaves them out otherwise), favourite places and their posts. No Saved or Dining.
 */
export function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), me = useSocialMe().data;
  const remote = useRemote(id ? personPageKey(id) : null, signal => personWithPosts(id, signal)), [flag, setFlag] = useState(false), p = remote.data;
  const other = !!p && !!me && p.id !== me.id, gifts = useGiftCatalog(other && me.hasProfile).data, [giving, setGiving] = useState(false), tg = useT("collection");
  return <Screen titleAccessory={<PersonTitle p={p} />} backTo="/social"
    headerAction={other && p ? <View style={[common.row, { gap: 4 }]}>
      {gifts && <IconButton appearance="plain" label={tg("sendGift")} icon="gift-outline" onPress={() => setGiving(true)} />}
      <IconButton appearance="plain" label={t("flagLabel", { name: p.firstName })} icon="flag-outline" onPress={() => setFlag(true)} /></View> : undefined}>
    <MemberGate returnTo={"/social/person/" + id}>
      <RemoteStatus remote={remote} icon="person-outline" returnTo="/social" missing={t("profileUnavailable")} />
      {p && me && <PersonView p={p} me={me} />}
      {p && <FlagSheet person={p} hasPhoto={!!p.photos.length} visible={flag} onClose={() => setFlag(false)} onBlocked={() => router.back()} />}
      {gifts && p && other && <GiftSheet visible={giving} onClose={() => setGiving(false)} to={p.id} data={gifts} />}
    </MemberGate>
  </Screen>;
}
/** Name, age and ✓, with @handle (and Friends) under it, in the header row beside Back; empty while the profile loads. */
function PersonTitle({ p }: { p: PersonPage | undefined }) {
  const t = useT("social"), tp = useT("profile"), { theme } = usePreferences();
  if (!p) return null;
  const name = p.age ? t("nameAge", { name: p.firstName, age: p.age }) : p.firstName;
  return <View accessible accessibilityRole="header" accessibilityLabel={[name, p.verified ? t("verified") : "", p.handle ? "@" + p.handle : "", p.friend ? tp("alreadyFriends") : ""].filter(Boolean).join(", ")}>
    <View style={[common.row, { gap: 4 }]}><T variant="subtitle" numberOfLines={1} style={[common.bold, { flexShrink: 1 }]}>{name}</T>
      {p.verified && <Icon name="checkmark-circle" size={17} color={theme.success} />}</View>
    {(!!p.handle || p.friend) && <View style={[common.row, { gap: 4 }]}>
      {!!p.handle && <T variant="small" muted numberOfLines={1} style={{ flexShrink: 1 }}>{"@" + p.handle}</T>}
      {p.friend && <>{!!p.handle && <T variant="small" muted>·</T>}<T variant="small" color={theme.success} style={common.bold}>{tp("alreadyFriends")}</T></>}
    </View>}
  </View>;
}
function PersonView({ p, me }: { p: PersonWithPosts; me: SocialMe }) {
  const t = useT("social"), tp = useT("profile"), diet = useDietText(), where = useWhere(), d = p.posts;
  return <>
    <SummaryLayout picture={<Picture p={p} />} stats={[
      { label: tp("friends"), n: d.friends },
      { label: tp("statPosts"), n: d.recipes.length + d.items.length + d.classes.length },
    ]}>
      <AreaLine parts={[where(p)]} diets={p.diets.map(diet.name).join(" · ")} />
      <BadgeRow ids={p.worn?.badges ?? []} />
    </SummaryLayout>
    <PersonAbout p={p} />
    <Relationship p={p} me={me} />
    <LifestyleDetails p={p} />
    <Spots ids={p.spots} />
    <Posts posts={d} />
    {p.friend && <View style={{ alignItems: "center" }}><Confirm link label={t("removeFriend")} text={t("removeFriendText")} action={t("removeFriend")}
      run={async () => { await removeFriend(p.id); invalidate("/api/social"); router.back(); return true; }} /></View>}
  </>;
}
/** Their first photo (or Lian) in a circle; with photos it opens them full size, and a count shows when there are several. */
function Picture({ p }: { p: PersonPage }) {
  const t = useT("social"), { theme } = usePreferences(), [open, setOpen] = useState(false), count = p.photos.length;
  const picture = <BorderFrame art={p.worn?.border ? borderArt(p.worn.border) : undefined} size={88}><Avatar uri={p.photos[0]?.thumb} size={88} /></BorderFrame>;
  if (!count) return picture;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("photosOfName", { name: p.firstName })} onPress={() => setOpen(true)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {picture}
      {count > 1 && <View style={[s.count, { backgroundColor: theme.card, borderColor: theme.background }]}>
        <Icon name="images-outline" size={12} color={theme.foreground} /><T variant="caption" style={common.bold}>{count}</T>
      </View>}
    </Pressable>
    <PhotoViewer p={p} visible={open} onClose={() => setOpen(false)} />
  </>;
}
/** Their photos, one at a time, over the dimmed page; a tap outside or Close returns. */
function PhotoViewer({ p, visible, onClose }: { p: PersonPage; visible: boolean; onClose: () => void }) {
  const tc = useT("common"), { theme } = usePreferences(), { width, height } = useWindowDimensions();
  const frame = Math.min(width - 32, 480), tall = Math.min(frame * 1.25, height * 0.72);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[s.viewer, { backgroundColor: theme.overlay }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={tc("close")} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View accessibilityViewIsModal style={{ width: frame, gap: 10 }}>
        <View style={[s.close, { backgroundColor: theme.card }]}><IconButton appearance="plain" icon="close" label={tc("close")} onPress={onClose} /></View>
        <PhotoCarousel photos={p.photos} name={p.firstName} height={tall} radius={20} />
      </View>
    </View>
  </Modal>;
}
/**
 * Where the two of you stand: Add Friend; a request you sent (Cancel); a request they sent (their hello, Decline, Accept);
 * or Message and Invite To Dinner once friends. Your own page offers Edit profile. Invalidating Social reloads this page.
 */
function Relationship({ p, me }: { p: PersonPage; me: SocialMe }) {
  const t = useT("social"), tp = useT("profile"), { setNotice, theme } = usePreferences(), problem = useSocialError();
  const [adding, setAdding] = useState(false), [busy, setBusy] = useState<"" | "accept" | "decline" | "cancel">("");
  const run = async (which: typeof busy, work: () => Promise<unknown>) => {
    setBusy(which);
    try { await work(); invalidate("/api/social"); } catch (failure) { setNotice({ text: problem(failure, p.firstName), error: true }); } finally { setBusy(""); }
  };
  if (p.id === me.id) return <Button label={tp("edit")} icon="create-outline" variant="secondary" onPress={() => router.push("/social/profile")} />;
  if (p.friend) return <View style={[common.row, { gap: 8 }]}>
    <View style={common.flex}><Button label={t("message")} icon="chatbubble-outline" onPress={() => openSocial("/chat/" + p.id)} /></View>
    {p.canInvite && <View style={common.flex}><Button label={t("inviteToDinner")} icon="restaurant-outline" variant="secondary" onPress={() => openSocial("/invite/" + p.id)} /></View>}
  </View>;
  const request = p.request;
  if (request?.mine) return <RequestCard icon="time-outline" tone="muted" title={t("requestSent")}
    trailing={<PillButton label={tp("cancel")} accessibilityLabel={tp("cancelTo", { name: p.firstName })} busy={busy === "cancel"} onPress={() => void run("cancel", () => cancelRequest(request.id))} />} />;
  if (request) return <RequestCard icon="person-add-outline" title={t("wantsToBeFriends", { name: p.firstName })}>
    {!!request.note && <View style={[s.note, { backgroundColor: theme.muted }]}><T variant="small">{request.note}</T></View>}
    <View style={[common.row, { gap: 8 }]}>
      <View style={common.flex}><Button label={t("decline")} accessibilityLabel={t("declineNamed", { name: p.firstName })} variant="secondary" loading={busy === "decline"} disabled={!!busy}
        onPress={() => void run("decline", () => declineRequest(request.id))} /></View>
      <View style={common.flex}><Button label={t("accept")} icon="checkmark" loading={busy === "accept"} disabled={!!busy} onPress={() => void run("accept", () => acceptRequest(request.id))} /></View>
    </View>
  </RequestCard>;
  return <>
    <Button label={t("addFriend")} icon="person-add-outline" onPress={() => setAdding(true)} />
    <RequestSheet person={p} visible={adding} onClose={() => setAdding(false)} />
  </>;
}
function RequestCard({ icon, tone, title, trailing, children }: { icon: IconName; tone?: Tone; title: string; trailing?: ReactNode; children?: ReactNode }) {
  const { theme } = usePreferences();
  return <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={[common.row, { gap: 12 }]}><RowIcon name={icon} tone={tone} /><T style={[common.flex, common.bold]}>{title}</T>{trailing}</View>
    {children}
  </View>;
}
function Spots({ ids }: { ids: string[] }) {
  const t = useT("social"), key = placesByIdKey(ids), rows = useRemote(key, signal => places(key!, signal)).data?.items ?? [];
  return rows.length ? <ListGroup title={t("favouritePlaces")} inset={64}>{rows.map(place => <ListItem key={place.id} title={place.name} subtitle={place.branch || undefined}
    leading={<PlaceThumb place={place} size={44} radius={10} />} onPress={() => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + place.id } } as never)} />)}</ListGroup> : null;
}
const postKinds = ["recipes", "market", "events"] as const;
/**
 * Their posts with the same tiles as the member's own grid; kind chips show only when the posts span two kinds or more. A chosen
 * kind that a reload leaves empty (or alone, with its chips gone) falls back to all.
 */
function Posts({ posts: d }: { posts: PersonPosts }) {
  const t = useT("social"), tp = useT("profile"), [picked, setKind] = useState<ContentKind>("all");
  const sizes = { recipes: d.recipes.length, market: d.items.length, events: d.classes.length };
  const kinds = postKinds.filter(id => sizes[id] > 0).map(id => ({ id, label: tp(id) })), total = sizes.recipes + sizes.market + sizes.events;
  const kind = kinds.length > 1 && kinds.some(k => k.id === picked) ? picked : "all";
  return <View style={{ gap: 8 }}>
    <T variant="small" muted style={[common.bold, s.heading]} accessibilityRole="header">{tp("statPosts")}</T>
    {kinds.length > 1 && <ChoiceChips clearable label={tp("statPosts")} options={kinds} value={kind} onChange={next => setKind(next === kind ? "all" : next)} />}
    {total ? <PersonPostGrid posts={d} kind={kind} /> : <T variant="small" muted style={s.empty}>{t("noPostsYet")}</T>}
  </View>;
}
const s = StyleSheet.create({
  count: { position: "absolute", right: -4, bottom: -2, flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 12, borderWidth: 2, paddingHorizontal: 7, paddingVertical: 2 },
  viewer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  close: { alignSelf: "flex-end", borderRadius: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  note: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  heading: { paddingHorizontal: 4 },
  empty: { textAlign: "center", paddingVertical: 16 },
});
