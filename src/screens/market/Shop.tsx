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
import { useT } from "../../i18n";

/** A shop: who they are, how collection and payment work, what's on sale, and reviews. */
export default function MarketShopScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), member = useMember(), { setNotice } = usePreferences(), t = useT("market");
  const remote = useRemote("/api/market/shops/" + id, signal => loadShop(id, signal));
  const [menu, setMenu] = useState(false), [report, setReport] = useState(false);
  const s = remote.data;
  if (!s) return <Screen header={<MarketToolbar />}><RemoteStatus remote={remote} icon="storefront-outline" returnTo={"/market/shop/" + id} missing={t("shopUnavailable")} /></Screen>;
  const message = async () => {
    if (!ensureMember(member, "/market/shop/" + s.id)) return;
    try { const c = await openConversation(s.id); router.push({ pathname: "/market/chat/[id]", params: { id: c.id } }); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("conversationFailed"), error: true }); }
  };
  const blockShop = async () => { await block(s.id); invalidate("/api/market/"); setMenu(false); router.dismissTo("/cook?tab=market"); return true; };
  return <Screen header={<MarketToolbar><View style={[common.row, { justifyContent: "flex-end", gap: 6 }]}>
    {!s.own && <IconButton label={t("messageShop")} icon="chatbubble-outline" onPress={() => void message()} />}
    {!s.own && member.member && <IconButton label={t("moreOptions")} icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}
  </View></MarketToolbar>}>
    <View style={{ alignItems: "center", gap: 6 }}>
      <Initial name={s.tradingName} size={72} />
      <T variant="title" accessibilityRole="header" style={common.center}>{s.tradingName}</T>
      {s.rating !== null && <StatusPill label={`★ ${s.rating} · ${s.ratings}`} />}
      <T muted style={common.center}>{[s.area, t("completedOrders", { n: s.completed })].join(" · ")}</T>
      {!!s.about && <T style={common.center}>{s.about}</T>}
    </View>
    <ListGroup>
      {s.meetup && <ListItem title={t("meetupCollection")} subtitle={t("meetupWhere")} leading={<RowIcon name="location-outline" />} />}
      {s.delivery && <ListItem title={t("delivery") + (s.deliveryFeeCents ? " · " + marketMoney(s.deliveryFeeCents) : " · " + t("free")) + (s.deliveryMinCents ? " · " + t("minAmount", { amount: marketMoney(s.deliveryMinCents) }) : "")} subtitle={s.deliveryAreas} leading={<RowIcon name="bicycle-outline" />} wrap />}
      <ListItem title={t("payAtCollection", { methods: handoverPayment(s, t) })} subtitle={t("noTakePaymentOrCheck")} leading={<RowIcon name="cash-outline" />} />
    </ListGroup>
    {s.slots.length > 0 && <ListGroup title={t("openCollections")}><View style={{ padding: 8, gap: 8 }}>{s.slots.slice(0, 4).map(slot =>
      <SlotOption key={slot.id} slot={slot} selected={false} disabled={s.own} onPress={() => router.push({ pathname: "/market/checkout", params: { seller: s.id, slot: slot.id } })} />)}</View></ListGroup>}
    {s.items.length ? <ListingGrid items={s.items} /> : <EmptyState title={t("nothingOnSale")} text="" icon="storefront-outline" />}
    {s.reviews.length > 0 && <ListGroup title={t("reviews")}>{s.reviews.map((r, i) => <ListItem key={i} title={"★ " + r.rating + (r.dietMatched === false ? " · " + t("dietDidntMatch") : "")}
      subtitle={r.review || undefined} wrap leading={<RowIcon name="star-outline" tone={r.dietMatched === false ? "warning" : "accent"} />} />)}</ListGroup>}
    {s.own && <Button label={t("manageShop")} variant="secondary" onPress={() => router.push("/market?tab=shop")} />}
    <MarketModal visible={menu} onClose={() => setMenu(false)} label={s.tradingName}>
      <ListItem title={t("report")} leading={<RowIcon name="flag-outline" tone="warning" />} onPress={() => { setMenu(false); setReport(true); }} />
      <Confirm label={t("block")} text={t("blockShopText")} action={t("blockName", { name: s.tradingName })} run={blockShop} />
    </MarketModal>
    <ReportSheet kind="person" targetId={s.id} name={s.tradingName} visible={report} onClose={() => setReport(false)} onBlocked={() => { invalidate("/api/market/"); router.dismissTo("/cook?tab=market"); }} />
  </Screen>;
}
