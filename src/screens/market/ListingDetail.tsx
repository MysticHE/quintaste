import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { IconButton } from "../../components/food/Controls";
import { Button, T, common } from "../../components/ui";
import { Initial, ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { IngredientSummary } from "../../components/market/Ingredients";
import { ListingGallery } from "../../components/market/ListingGallery";
import { MarketModal, MarketToolbar } from "../../components/market/MarketChrome";
import { DietPills, SlotOption } from "../../components/market/ShopParts";
import { ReportSheet } from "../../components/ReportSheet";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { listing as loadListing, openConversation, toggleSaved } from "../../services/market-api";
import { ApiError } from "../../services/community-api";
import { handoverPayment, marketMoney } from "../../utils/market";
import { formatDay } from "../../utils/day";
import type { ListingDetail } from "../../types/community";

export default function ListingDetailScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), remote = useRemote("/api/market/listings/" + id, signal => loadListing(id, signal));
  if (!remote.data) return <Screen hideTimers header={<MarketToolbar />}>
    <RemoteStatus remote={remote} icon="storefront-outline" returnTo={"/market/listing/" + id} missing="Item Unavailable" /></Screen>;
  return <Detail item={remote.data} />;
}
function Detail({ item }: { item: ListingDetail }) {
  const member = useMember(), { theme, setNotice } = usePreferences();
  const [menu, setMenu] = useState(false), [report, setReport] = useState(false), [override, setOverride] = useState<{ value: boolean; base: ListingDetail }>();
  const s = item.seller, ordered = !item.own && item.slots.length > 0;
  const saving = useRef(false);
  const saved = override?.base === item ? override.value : item.saved;
  const save = async () => {
    if (!ensureMember(member, "/market/listing/" + item.id) || saving.current) return;
    saving.current = true;
    try { const value = (await toggleSaved(item.id)).saved; setOverride({ value, base: item }); invalidate("/api/market/listings"); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "That did not save. Try again.", error: true }); }
    finally { saving.current = false; }
  };
  const message = async () => {
    if (!ensureMember(member, "/market/listing/" + item.id)) return;
    try { const { id } = await openConversation(s.id); router.push({ pathname: "/market/chat/[id]", params: { id } }); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "The conversation did not open. Try again.", error: true }); }
  };
  const share = async () => {
    try { await Share.share({ message: [item.name, marketMoney(item.priceCents), s.tradingName].join(" · ") }); }
    catch { setNotice({ text: "Sharing is unavailable. Try again.", error: true }); }
  };
  const collection = [s.meetup && "Meetup", s.delivery && `Delivery${s.deliveryFeeCents ? " " + marketMoney(s.deliveryFeeCents) : ""} · ${s.deliveryAreas}`].filter(Boolean).join(" · ");
  return <Screen fill hideTimers header={<MarketToolbar><View style={[common.row, { gap: 6, justifyContent: "flex-end" }]}>
    <IconButton label="Share Item" icon="share-outline" onPress={() => void share()} />
    {!item.own && <IconButton label="More Options" icon="ellipsis-horizontal" onPress={() => setMenu(true)} />}
  </View></MarketToolbar>}>
    <ScrollView style={common.flex} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
      <ListingGallery name={item.name} photos={item.photos} />
      <View style={{ gap: 4 }}>
        <T variant="title" color={theme.accent}>{marketMoney(item.priceCents)} <T muted>{item.portion}</T></T>
        <T variant="subtitle">{item.name}</T>
        {!!item.description && <T>{item.description}</T>}
      </View>
      <DietPills value={item.diets} />
      <ListGroup><ListItem title={s.tradingName} subtitle={[s.area, s.rating !== null ? "★ " + s.rating : ""].filter(Boolean).join(" · ") || undefined}
        leading={<Initial name={s.tradingName} />} onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: s.id } })} /></ListGroup>
      <ListGroup title="Ingredients"><View style={st.ingredients}><T>{item.ingredients}</T>
        <IngredientSummary value={{ contains: item.contains, mayContain: item.mayContain, reviewed: true }} status={false} /></View></ListGroup>
      <ListGroup>
        <ListItem title={item.storage} leading={<RowIcon name="snow-outline" />} wrap />
        {item.kind === "prepacked" && !!item.dateMark && <ListItem title={"Date mark " + formatDay(item.dateMark)} subtitle={item.lot ? "Lot " + item.lot : undefined} leading={<RowIcon name="calendar-outline" />} />}
        <ListItem title={item.leadDays ? `Order ${item.leadDays} ${item.leadDays === 1 ? "day" : "days"} ahead` : "Order by the slot cut-off"} subtitle={collection} leading={<RowIcon name="time-outline" />} wrap />
        <ListItem title={"Pay the seller at collection · " + handoverPayment(s)} subtitle="QuinTaste doesn't take payment or check sellers" leading={<RowIcon name="cash-outline" />} wrap />
      </ListGroup>
      {item.slots.length > 0 && <ListGroup title="Next collections"><View style={st.slots}>{item.slots.slice(0, 3).map(slot =>
        <SlotOption key={slot.id} slot={slot} selected={false} onPress={() => router.push({ pathname: "/market/checkout", params: { seller: s.id, listing: item.id, slot: slot.id } })} />)}</View></ListGroup>}
    </ScrollView>
    <View style={[st.bar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {item.own ? <View style={common.flex}><Button label="Edit Item" icon="create-outline" onPress={() => router.push({ pathname: "/market/edit", params: { id: item.id } })} /></View> : <>
        <IconButton label={saved ? "Unsave Item" : "Save Item"} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} onPress={() => void save()} />
        <IconButton label="Message Seller" icon="chatbubble-outline" onPress={() => void message()} />
        <View style={common.flex}><Button label={ordered ? "Order" : "No Collections Open"} icon={ordered ? "bag-add-outline" : undefined} disabled={!ordered}
          onPress={() => { if (ensureMember(member, "/market/listing/" + item.id)) router.push({ pathname: "/market/checkout", params: { seller: s.id, listing: item.id } }); }} /></View>
      </>}
    </View>
    <MarketModal visible={menu} onClose={() => setMenu(false)} label={item.name}>
      <Button label="Report Item" icon="flag-outline" variant="secondary" onPress={() => { if (ensureMember(member, "/market/listing/" + item.id)) { setMenu(false); setReport(true); } }} />
    </MarketModal>
    <ReportSheet kind="listing" targetId={item.id} name={item.name} visible={report} onClose={() => setReport(false)} />
  </Screen>;
}
const st = StyleSheet.create({
  ingredients: { padding: 14, gap: 10 },
  slots: { padding: 8, gap: 8 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, borderWidth: 1, borderRadius: 18 },
});
