import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/food/Controls";
import { Initial, ListGroup, ListItem, StatusPill } from "../../components/GroupedList";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { conversations } from "../../services/market-api";

/** Conversations with shops you buy from, and with buyers of your shop. */
export default function MarketInboxScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/conversations" : null, conversations, 15000), items = remote.data?.items ?? [];
  const row = (c: typeof items[number]) => <ListItem key={c.id} title={c.otherName} subtitle={c.last ?? undefined} leading={<Initial name={c.otherName} />}
    badge={c.unread ? <StatusPill label="New" tone="accent" /> : undefined} label={[c.otherName, c.unread && "unread", c.last].filter(Boolean).join(", ")}
    onPress={() => router.push({ pathname: "/market/chat/[id]", params: { id: c.id } })} />;
  return <Screen title="Inbox" hideTimers backTo="/market">
    {!member ? <MemberPrompt icon="chatbubbles-outline" returnTo="/market" /> : <>
      <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/market" />
      {remote.data && (items.length ? <>
        <ListGroup title="Shops">{items.filter(c => c.role === "buyer").map(row)}</ListGroup>
        <ListGroup title="Your buyers">{items.filter(c => c.role === "seller").map(row)}</ListGroup>
      </> : <EmptyState title="No conversations yet" text="Message a seller from any item." icon="chatbubbles-outline" primary={{ label: "Browse Food", onPress: () => router.navigate("/market") }} />)}
    </>}
  </Screen>;
}
