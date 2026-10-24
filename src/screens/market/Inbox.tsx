import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/food/Controls";
import { Initial, ListGroup, ListItem, StatusPill } from "../../components/GroupedList";
import { MemberPrompt, RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { conversations } from "../../services/market-api";
import { useT } from "../../i18n";

/** Conversations with shops you buy from, and with buyers of your shop. */
export default function MarketInboxScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/market/conversations" : null, conversations, 15000), items = remote.data?.items ?? [], t = useT("market");
  const row = (c: typeof items[number]) => <ListItem key={c.id} title={c.otherName} subtitle={c.last ?? undefined} leading={<Initial name={c.otherName} />}
    badge={c.unread ? <StatusPill label={t("newBadge")} tone="accent" /> : undefined} label={[c.otherName, c.unread && t("unread"), c.last].filter(Boolean).join(", ")}
    onPress={() => router.push({ pathname: "/market/chat/[id]", params: { id: c.id } })} />;
  return <Screen title={t("inboxTitle")} hideTimers backTo="/market">
    {!member ? <MemberPrompt icon="chatbubbles-outline" returnTo="/market" /> : <>
      <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/market" />
      {remote.data && (items.length ? <>
        <ListGroup title={t("shops")}>{items.filter(c => c.role === "buyer").map(row)}</ListGroup>
        <ListGroup title={t("yourBuyers")}>{items.filter(c => c.role === "seller").map(row)}</ListGroup>
      </> : <EmptyState title={t("noConversations")} text={t("noConversationsText")} icon="chatbubbles-outline" primary={{ label: t("browseFood"), onPress: () => router.navigate("/market") }} />)}
    </>}
  </Screen>;
}
