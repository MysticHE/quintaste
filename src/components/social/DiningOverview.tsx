import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { EmptyState, SearchField } from "../food/Controls";
import { RemoteStatus } from "../CommunityGate";
import { DateTile, ListGroup, StatusPill } from "../GroupedList";
import { Avatar } from "./SocialPhoto";
import { DinnerRow, useDinnerStatus, usePayText } from "./DinnerParts";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { dinnerHistory, dinnerHistoryKey, dinners } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { formatSgShort, sgDateTile } from "../../utils/sg-datetime";
import type { Dinner } from "../../types/community";

export function DinnerSummary({ dinner: d, compact = false }: { dinner: Dinner; compact?: boolean }) {
  const { theme } = usePreferences(), t = useT("profile"), language = useLanguage(), tile = sgDateTile(d.starts, language), [status, tone] = useDinnerStatus()(d), pay = usePayText()(d);
  return <Pressable accessibilityRole="button" accessibilityLabel={[t("dinnerWith", { name: d.withName }), formatSgShort(d.starts, language), d.placeName, status, pay].join(", ")}
    onPress={() => router.push({ pathname: "/social/dinner/[id]", params: { id: d.id } })} style={({ pressed }) => ({ backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: compact ? 12 : 16, gap: 12 })}>
    <View style={[common.row, { gap: 12, alignItems: "flex-start" }]}>
      {!compact && tile && <DateTile day={tile.day} month={tile.month} />}
      <View style={[common.flex, { gap: 6 }]}><View style={[common.row, { gap: 8, flexWrap: "wrap" }]}><Avatar uri={d.photo} size={30} /><T style={[common.bold, common.flex]}>{t("dinnerWith", { name: d.withName })}</T></View>
        <StatusPill label={status} tone={tone} /><T variant="small">{formatSgShort(d.starts, language)}</T>
        <View style={[common.row, { gap: 5 }]}><Icon name="location-outline" size={16} /><T variant="small" style={common.flex}>{d.placeName}</T></View>
        <T variant="small" muted>{pay}</T>
      </View>
    </View><View style={[common.row, { borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: 10, justifyContent: "space-between" }]}><T variant="button" color={theme.accent}>{t(d.status === "invited" && d.yourTurn ? "viewInvite" : "openDinner")}</T><Icon name="chevron-forward" size={18} color={theme.accent} /></View>
  </Pressable>;
}
const needsYou = (d: Dinner) => (d.status === "invited" && d.yourTurn) || (d.reportOpen && !d.reported);
const ahead = (d: Dinner) => d.status === "invited" || (d.status === "accepted" && !d.past);
const SHORT = 5;
/**
 * History, all time, from /api/social/dinners/history: its first page reloads with the rest of Social (invalidate), and
 * pages loaded with Show More stay only while that first page is the same one, so a reload never doubles or keeps stale rows.
 */
function useDinnerHistory(q: string) {
  const t = useT("profile"), { setNotice } = usePreferences(), key = dinnerHistoryKey(q);
  const first = useRemote(key, signal => dinnerHistory(q, 0, signal), { keepPrevious: true });
  const [extra, setExtra] = useState<{ base: unknown; items: Dinner[]; more: boolean } | null>(null), [busy, setBusy] = useState(false);
  const own = extra && extra.base === first.data ? extra : null;
  const items = [...(first.data?.items ?? []), ...(own?.items ?? [])], more = own ? own.more : !!first.data?.more;
  const loadMore = async () => {
    setBusy(true);
    try { const page = await dinnerHistory(q, items.length); setExtra({ base: first.data, items: [...(own?.items ?? []), ...page.items], more: page.more }); }
    catch { setNotice({ text: t("historyFailed"), error: true }); }
    finally { setBusy(false); }
  };
  return { remote: first, items, more, loadMore, busy };
}
/**
 * Every dinner in one place, the Social profile's Dining tab (owner, 1 Nov 2026; the separate Dinners screen is gone): what
 * needs you (an invite to answer, a dinner to tell us about), what's coming up (confirmed, or waiting on them), then the
 * whole history (past, declined, cancelled, expired), newest first, five until Show All, then 20 more at a time. A search
 * box (once there are more than five) finds a dinner by place or person across all of it.
 */
export function DiningOverview() {
  const t = useT("profile"), ts = useT("social"), remote = useRemote("/api/social/dinners", dinners, 30000), data = remote.data;
  const [query, setQuery] = useState(""), q = useDebounced(query).trim(), lower = q.toLowerCase(), [open, setOpen] = useState(false);
  const has = (d: Dinner) => !lower || (d.placeName + " " + d.withName).toLowerCase().includes(lower);
  const all = data ? [...data.upcoming, ...data.past] : [], soonest = (a: Dinner, b: Dinner) => a.starts.localeCompare(b.starts);
  const waiting = all.filter(d => needsYou(d) && has(d)).sort(soonest), coming = all.filter(d => !needsYou(d) && ahead(d) && has(d)).sort(soonest);
  const history = useDinnerHistory(q), full = open || !!q, shown = full ? history.items : history.items.slice(0, SHORT);
  const searchable = !!query || waiting.length + coming.length + history.items.length > SHORT;
  const invite = () => router.push("/social/friends");
  const nothing = !!data && !!history.remote.data && !history.remote.stale && !waiting.length && !coming.length && !history.items.length;
  return <>
    <View style={[common.row, { gap: 8 }]}><View style={common.flex}><Button label={t("findPeople")} icon="person-add-outline" variant="secondary" onPress={() => router.push("/social/community")} /></View>
      <View style={common.flex}><Button label={t("friends")} icon="people-outline" variant="secondary" onPress={() => router.push("/social/friends")} /></View></View>
    {searchable && <SearchField value={query} onChange={setQuery} placeholder={t("findDinners")} />}
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social?tab=dining" />
    <ListGroup title={ts("needsYou")} inset={72}>{waiting.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>
    {q ? <ListGroup title={t("comingUp")} inset={72}>{coming.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>
      : data && (coming.length || waiting.length ? <>
        <ListGroup title={t("comingUp")} inset={72}>{coming.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>
        <Button label={t("invite")} icon="person-add-outline" variant="secondary" onPress={invite} />
      </> : <EmptyState title={t("noDinner")} text={t("noDinnerText")} icon="restaurant-outline" action={t("invite")} onPress={invite} />)}
    <RemoteStatus remote={history.remote} icon="time-outline" returnTo="/social?tab=dining" placeholder={null} />
    <View style={{ gap: 8, opacity: history.remote.stale ? 0.55 : 1 }}>
      <ListGroup title={t("history")} inset={72}>{shown.map(d => <DinnerRow key={d.id} dinner={d} />)}</ListGroup>
    </View>
    {!full && history.items.length > SHORT ? <Centered><Button variant="link" label={t("showAll")} onPress={() => setOpen(true)} /></Centered>
      : full && history.more && <Centered><Button variant="link" label={t("more")} loading={history.busy} onPress={() => void history.loadMore()} /></Centered>}
    {q && nothing && <T muted style={{ textAlign: "center" }}>{t("noMatchingDinners")}</T>}
  </>;
}
const Centered = ({ children }: { children: ReactNode }) => <View style={{ alignItems: "center" }}>{children}</View>;
