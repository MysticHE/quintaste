import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { T, common } from "../../components/ui";
import { IconButton, SearchField } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, useSocialError } from "../../components/social/SocialState";
import { PersonRow } from "../../components/social/PersonRow";
import { PillButton } from "../../components/social/PillButton";
import { cleanHandle } from "../../components/social/HandleField";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { acceptRequest, cancelRequest, declineRequest, findKey, findPeople, friends as loadFriends, requestFriend } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { FriendRequest, HandleMatch } from "../../types/community";

/**
 * Add friend, one screen for every member (owner, 25 Oct 2026; no age or photo check): friend requests to accept or decline
 * and requests sent, until the member types; then people whose handle contains the text. Typed without @.
 */
export function AddFriendScreen() {
  const t = useT("profile"), [query, setQuery] = useState(""), q = cleanHandle(useDebounced(query));
  return <Screen title={t("addFriend")} backTo="/social" hideTimers>
    <MemberGate returnTo="/social/add-friend">
      <SearchField value={query} onChange={setQuery} placeholder={t("search")} />
      {q.length >= 2 ? <Results q={q} /> : <Requests />}
    </MemberGate>
  </Screen>;
}
function Results({ q }: { q: string }) {
  const t = useT("profile"), found = useRemote(findKey(q), signal => findPeople(q, signal), { keepPrevious: true }), items = found.data?.items ?? [];
  return <>
    <RemoteStatus remote={found} icon="search-outline" returnTo="/social/add-friend" />
    {/* While a new search loads, the last results stay, faded; "no match" waits for this search's own answer. */}
    {found.data && (items.length ? <View style={{ opacity: found.stale ? 0.55 : 1 }}><Section title={t("results")}>{items.map(m => <MatchRow key={m.id} match={m} q={q} />)}</Section></View>
      : !found.stale && <T muted style={{ textAlign: "center", paddingVertical: 16 }}>{t("noHandleMatch")}</T>)}
  </>;
}
function Requests() {
  const t = useT("profile"), remote = useRemote("/api/social/friends", loadFriends, 15000), d = remote.data;
  return <>
    <RemoteStatus remote={remote} icon="person-add-outline" returnTo="/social/add-friend" />
    {!!d?.received.length && <Section title={t("requests")}>{d.received.map(r => <RequestRow key={r.id} request={r} received />)}</Section>}
    {!!d?.sent.length && <Section title={t("sent")}>{d.sent.map(r => <RequestRow key={r.id} request={r} received={false} />)}</Section>}
    {d && !d.received.length && !d.sent.length && <T muted style={{ textAlign: "center", paddingVertical: 16 }}>{t("noRequests")}</T>}
  </>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 2 }}><T variant="small" muted style={[common.bold, { marginTop: 8 }]} accessibilityRole="header">{title}</T>{children}</View>;
}
/** Runs a friend action, refreshes Social (requests, friends, search, inbox counts) and words a failure. */
function useFriendAction(name: string) {
  const { setNotice } = usePreferences(), problem = useSocialError(), [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); invalidate("/api/social"); }
    catch (failure) { setNotice({ text: problem(failure, name), error: true }); }
    finally { setBusy(false); }
  };
  return { busy, run };
}
function MatchRow({ match: m, q }: { match: HandleMatch; q: string }) {
  const t = useT("profile"), { theme } = usePreferences(), { busy, run } = useFriendAction(m.firstName), at = m.handle.indexOf(q);
  const handle = at < 0 ? m.handle : <>{m.handle.slice(0, at)}<T variant="small" color={theme.foreground} style={common.bold}>{m.handle.slice(at, at + q.length)}</T>{m.handle.slice(at + q.length)}</>;
  const trailing = m.state === "none" ? <PillButton primary label={t("add")} accessibilityLabel={t("addNamed", { name: m.firstName })} busy={busy} onPress={() => void run(() => requestFriend(m.id, ""))} />
    : m.state === "received" && m.requestId ? <PillButton primary label={t("accept")} accessibilityLabel={t("acceptFrom", { name: m.firstName })} busy={busy} onPress={() => void run(() => acceptRequest(m.requestId!))} />
    : <T variant="small" muted style={common.bold}>{t(m.state === "friend" ? "alreadyFriends" : "requested")}</T>;
  return <PersonRow id={m.id} name={m.firstName} photo={m.photo} verified={m.verified} trailing={trailing}
    line={<T variant="small" muted numberOfLines={1}>{"@"}{handle}{m.area ? " · " + m.area : ""}</T>} />;
}
function RequestRow({ request: r, received }: { request: FriendRequest; received: boolean }) {
  const t = useT("profile"), { busy, run } = useFriendAction(r.firstName);
  const line = [r.handle ? "@" + r.handle : "", r.area].filter(Boolean).join(" · ");
  return <PersonRow id={r.userId} name={r.firstName} photo={r.photo} verified={r.verified}
    line={<>{!!line && <T variant="small" muted numberOfLines={1}>{line}</T>}{received && !!r.note && <T variant="small" numberOfLines={2}>{r.note}</T>}</>}
    trailing={received ? <View style={[common.row, { gap: 6 }]}>
      <IconButton icon="close" label={t("declineFrom", { name: r.firstName })} disabled={busy} onPress={() => void run(() => declineRequest(r.id))} />
      <PillButton primary label={t("accept")} accessibilityLabel={t("acceptFrom", { name: r.firstName })} busy={busy} onPress={() => void run(() => acceptRequest(r.id))} />
    </View> : <PillButton label={t("cancel")} accessibilityLabel={t("cancelTo", { name: r.firstName })} busy={busy} onPress={() => void run(() => cancelRequest(r.id))} />} />;
}
