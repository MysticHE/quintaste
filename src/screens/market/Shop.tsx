import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { Button, T, common } from "../../components/ui";
import { Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { Confirm } from "../../components/Actions";
import { ListingGrid } from "../../components/market/ListingGrid";
import { MarketModal, MarketToolbar } from "../../components/market/MarketChrome";
import { SlotOption } from "../../components/market/ShopParts";
import { ReportSheet } from "../../components/ReportSheet";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { openConversation, shop as loadShop } from "../../services/market-api";
import { block } from "../../services/social-api";
import { ApiError } from "../../services/community-api";
import { handoverPayment, marketMoney } from "../../utils/market";

/** A shop: who they are, how collection and payment work, what's on sale, and reviews. */
export default function MarketShopScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), member = useMember(), { setNotice } = usePreferences();
  const remote = useRemote("/api/market/shops/" + id, signal => loadShop(id, signal));
  const [menu, setMenu] = useState(false), [report, setReport] = useState(false);
  const s = remote.data;
  if (!s) return <Screen hideTimers header={<MarketToolbar />}><RemoteStatus remote={remote} icon="storefront-outline" returnTo={"/market/shop/" + id} missing="Shop Unavailable" /></Screen>;
  const message = async () => {
    if (!ensureMember(member, "/market/shop/" + s.id)) return;
    try { const c = await openConversation(s.id); router.push({ pathname: "/market/chat/[id]", params: { id: c.id } }); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "The conversation did not open. Try again.", error: true }); }
  };
  const blockShop = async () => { await block(s.id); invalidate("/api/market/"); setMenu(false); router.dismissTo("/market"); return true; };
  return <Screen hideTimers header={<MarketToolbar><View style={[common.row, { justifyContent: "flex-end", gap: 6 }]}>
    {!s.own && <IconButton label="Message Shop" icon="chatbubble-outline" onPress={() => void message()} />}
    {!s.own && member.member && <IconButton label="More Options" icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}
  </View></MarketToolbar>}>
    <View style={{ alignItems: "center", gap: 6 }}>
      <Initial name={s.tradingName} size={72} />
      <T variant="title" accessibilityRole="header" style={common.center}>{s.tradingName}</T>
      {s.rating !== null && <StatusPill label={`★ ${s.rating} · ${s.ratings}`} />}
      <T muted style={common.center}>{[s.area, s.completed + (s.completed === 1 ? " order" : " orders")].join(" · ")}</T>
      {!!s.about && <T style={common.center}>{s.about}</T>}
    </View>
    <ListGroup>
      {s.meetup && <ListItem title="Meetup collection" subtitle="At the point shown on each slot" leading={<RowIcon name="location-outline" />} />}
      {s.delivery && <ListItem title={"Delivery" + (s.deliveryFeeCents ? " · " + marketMoney(s.deliveryFeeCents) : " · free")} subtitle={s.deliveryAreas} leading={<RowIcon name="bicycle-outline" />} wrap />}
      <ListItem title={"Pay at collection · " + handoverPayment(s)} subtitle="QuinTaste doesn't take payment or check sellers" leading={<RowIcon name="cash-outline" />} />
    </ListGroup>
    {s.slots.length > 0 && <ListGroup title="Open collections"><View style={{ padding: 8, gap: 8 }}>{s.slots.slice(0, 4).map(slot =>
      <SlotOption key={slot.id} slot={slot} selected={false} disabled={s.own} onPress={() => router.push({ pathname: "/market/checkout", params: { seller: s.id, slot: slot.id } })} />)}</View></ListGroup>}
    {s.items.length ? <ListingGrid items={s.items} /> : <EmptyState title="Nothing On Sale" text="" icon="storefront-outline" />}
    {s.reviews.length > 0 && <ListGroup title="Reviews">{s.reviews.map((r, i) => <ListItem key={i} title={"★ " + r.rating + (r.dietMatched === false ? " · Diet label didn't match" : "")}
      subtitle={r.review || undefined} wrap leading={<RowIcon name="star-outline" tone={r.dietMatched === false ? "warning" : "accent"} />} />)}</ListGroup>}
    {s.own && <Button label="Manage My Shop" variant="secondary" onPress={() => router.push("/market/my-shop")} />}
    <MarketModal visible={menu} onClose={() => setMenu(false)} label={s.tradingName}>
      <ListItem title="Report" leading={<RowIcon name="flag-outline" tone="warning" />} onPress={() => { setMenu(false); setReport(true); }} />
      <Confirm label="Block" text="Hide this shop and stop messages both ways." action={"Block " + s.tradingName} run={blockShop} />
    </MarketModal>
    <ReportSheet kind="person" targetId={s.id} name={s.tradingName} visible={report} onClose={() => setReport(false)} onBlocked={() => { invalidate("/api/market/"); router.dismissTo("/market"); }} />
  </Screen>;
}
