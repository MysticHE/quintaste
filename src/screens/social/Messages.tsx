import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate } from "../../components/social/SocialState";
import { ThreadRow, useThreads, type MessageSide, type MessageTab, type Thread } from "../../components/social/MessageThreads";
import { TopBar, TopTabs } from "../../components/TopTabs";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { IconButton, SearchField, EmptyState } from "../../components/food/Controls";
import { useMessages } from "../../hooks/useMessages";
import { useRemote } from "../../hooks/useRemote";
import { dinners as loadDinners } from "../../services/social-api";
import { useT } from "../../i18n";

const sides: Record<"market" | "events", readonly [MessageSide, MessageSide]> = { market: ["buy", "sell"], events: ["join", "host"] };
const empties = { buy: "noBuy", sell: "noSell", join: "noJoin", host: "noHost" } as const;
/** Older links: ?kind=market (from /market/inbox) and ?kind=classes keep working. */
const readTab = (kind: string | undefined): MessageTab | null => kind === "friends" || kind === "market" ? kind : kind === "classes" || kind === "events" ? "events" : null;
const readSide = (side: string | undefined): MessageSide | null => side === "buy" || side === "sell" || side === "join" || side === "host" ? side : null;
/** Where Messages first opens: the first tab, and side within it, with something waiting. */
function landing(rows: Thread[], tabs: MessageTab[]): { tab: MessageTab; side: MessageSide | null } {
  const tab = tabs.find(id => rows.some(r => r.tab === id && r.attention)) ?? tabs[0];
  return { tab, side: tab === "friends" ? null : sideFor(rows, tab) };
}
const sideFor = (rows: Thread[], tab: "market" | "events") => sides[tab].find(id => rows.some(r => r.side === id && r.attention)) ?? sides[tab][0];

/**
 * Messages (owner, 25 Oct 2026): Friends (friend chats and dinner plans), Market split into Buy and Sell, and Events split into
 * Join and Host, because one account can buy and sell, join and teach. New orders and class bookings arrive in these chats.
 */
export function MessagesScreen() {
  const t = useT("profile"), data = useMessages(), params = useLocalSearchParams<{ kind?: string; side?: string }>();
  // Dinner plans exist only for members who can use Dining.
  const dinners = useRemote(data.me.data?.standing.canMeet ? "/api/social/dinners" : null, loadDinners, 30000);
  const rows = useThreads({ friends: data.allowed ? data.friends.data?.friends ?? [] : [], dinners: dinners.data?.upcoming ?? [],
    market: data.market.data?.items ?? [], classes: data.classes.data?.items ?? [] });
  const tabs: MessageTab[] = ["friends", "market", "events"];
  const [chosen, setChosen] = useState(() => ({ tab: readTab(params.kind), side: readSide(params.side) }));
  const [searching, setSearching] = useState(false), [query, setQuery] = useState("");
  // Pick the landing tab once everything has loaded, then keep it: reading a chat must not move the screen.
  const settled = [data.market, data.classes, ...(data.allowed ? [data.friends] : [])].every(s => s.data || s.error) && !!data.me.data;
  const [landed, setLanded] = useState<ReturnType<typeof landing> | null>(null);
  // A link that names the tab (an older Market inbox link) lands on that tab, on the side with something waiting.
  if (!landed && settled) setLanded(landing(rows, chosen.tab && tabs.includes(chosen.tab) ? [chosen.tab] : tabs));
  const tab = chosen.tab && tabs.includes(chosen.tab) ? chosen.tab : landed?.tab ?? tabs[0];
  const pair = tab === "friends" ? null : sides[tab];
  const side = !pair ? null : chosen.side && pair.includes(chosen.side) ? chosen.side : landed?.tab === tab && landed.side ? landed.side : pair[0];
  const pickTab = (next: MessageTab) => setChosen({ tab: next, side: next === "friends" ? null : sideFor(rows, next) });
  const term = query.trim().toLowerCase();
  // A search looks through every conversation, as its hint says; otherwise the list is the selected tab and side.
  const visible = rows.filter(r => term ? [r.name, r.context, r.preview].join(" ").toLowerCase().includes(term) : r.tab === tab && (!side || r.side === side));
  const sources = term ? [data.market, data.classes, data.friends] : tab === "friends" ? [data.me, data.friends] : [tab === "market" ? data.market : data.classes];
  const loading = sources.some(s => s.loading && !s.data), failed = sources.some(s => s.error);
  const label = (id: MessageTab | MessageSide) => t(id === "friends" ? "friends" : id);
  return <Screen title={t("messages")} backTo="/social" hideTimers headerAction={<IconButton appearance="plain" icon={searching ? "close" : "search-outline"}
    label={t(searching ? "closeSearch" : "searchToggle")} onPress={() => { setSearching(!searching); setQuery(""); }} />}>
    <MemberGate returnTo="/messages">
      {searching && <SearchField value={query} onChange={setQuery} placeholder={t("searchMessages")} input={{ autoFocus: true }} />}
      {!term && <TopBar><TopTabs label={t("messages")} value={tab} onChange={pickTab} tabs={tabs.map(id => {
        const dot = id !== tab && rows.some(r => r.tab === id && r.attention);
        return { id, label: label(id), dot, accessibleLabel: dot ? t("hasNew", { label: label(id) }) : undefined };
      })} /></TopBar>}
      {/* SegmentedTabs fills its row; the wrapper keeps it from growing down the page. */}
      {!term && pair && <View style={{ flexDirection: "row" }}><SegmentedTabs label={label(tab)} value={side!} onChange={next => setChosen({ tab, side: next })} options={pair.map(id => {
        const dot = id !== side && rows.some(r => r.side === id && r.attention);
        return { id, label: label(id), dot, accessibleLabel: dot ? t("hasNew", { label: label(id) }) : undefined };
      })} /></View>}
      {sources.map((remote, i) => <RemoteStatus key={i} remote={remote} icon="chatbubble-outline" returnTo="/messages" />)}
      {visible.map(r => <ThreadRow key={r.id} thread={r} />)}
      {!loading && !failed && !visible.length && <EmptyState icon="chatbubbles-outline" title={t(term ? "noMessageMatch" : side ? empties[side] : "noFriendChats")} text="" />}
    </MemberGate>
  </Screen>;
}
