import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, T, common } from "../ui";
import { ItemArt } from "./Glint";
import { useGiftName, useGiftOpener } from "./Gifts";
import { GiftRecipient } from "./GiftRecipient";
import { ListItem, StatusPill, SwitchRow } from "../GroupedList";
import { ChoiceChips } from "../social/ProfileControls";
import { Sheet } from "../Sheet";
import { ApiError } from "../../services/community-api";
import { giftsKey, seeSentGifts, setReceiving, type Gifts } from "../../services/gifts-api";
import { invalidate, setRemoteData } from "../../hooks/useRemote";
import { inboxPath } from "../InboxCounts";
import { giftArt } from "../../config/collection";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { chatTime } from "../../utils/chat-time";

type Side = "received" | "sent";
/** One gift inbox: sender, date and delivery/reaction status, without a duplicate catalogue. */
export function GiftsTab({ data, preferences, onClosePreferences }: { data: Gifts; preferences: boolean; onClosePreferences: () => void }) {
  const t = useT("collection"), giftName = useGiftName(), language = useLanguage(), { theme, setNotice } = usePreferences();
  const news = data.sent.some(g => g.news), [side, setSide] = useState<Side>(news && !data.received.some(g => !g.opened) ? "sent" : "received");
  const [busy, setBusy] = useState(false), [sending, setSending] = useState(false), [weekly, setWeekly] = useState(false), opener = useGiftOpener();
  const [localPreferences, setLocalPreferences] = useState(false);
  const pending = useRef(false), latest = useRef(data);
  useEffect(() => { latest.current = data; }, [data]);
  const receive = async (on: boolean) => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { const result = await setReceiving(on); setRemoteData(giftsKey, { ...latest.current, receiving: result.receiving }); }
    catch (failure) { setNotice({ text: failure instanceof ApiError ? failure.message : t("actionFailed"), error: true }); }
    finally { pending.current = false; setBusy(false); }
  };
  const seen = useRef(""), newsKey = data.sent.filter(g => g.news).map(g => g.id).join();
  useEffect(() => {
    if (side !== "sent" || !newsKey || seen.current === newsKey) return;
    seen.current = newsKey;
    const ids = new Set(data.sent.filter(g => g.news).map(g => g.id));
    seeSentGifts().then(() => {
      setRemoteData(giftsKey, { ...latest.current, sent: latest.current.sent.map(g => ids.has(g.id) ? { ...g, news: false } : g) }); invalidate(inboxPath);
    }, () => { seen.current = ""; });
  }, [side, newsKey, data.sent]);
  const empty = side === "received" ? !data.received.length : !data.sent.length;
  const state = (g: { opened: boolean; liked: boolean; thanked: boolean }, sent: boolean) =>
    g.thanked ? t("thanked") : g.liked ? t("giftLikedShort") : g.opened ? t("giftOpened") : t(sent ? "giftDelivered" : "giftNew");
  return <>
    <ChoiceChips label={t("tabGifts")} value={side} onChange={setSide} options={[{ id: "received", label: t("tabReceived") }, { id: "sent", label: t("tabSent") }]} />
    {empty ? <View testID="gift-empty" style={{ alignItems: "center", gap: 12, paddingVertical: 28 }}>
      <ItemArt art={giftArt("rose")} size={76} fx />
      <T variant="subtitle" style={common.bold}>{t(side === "received" ? "noGifts" : "noSent")}</T>
      <T variant="small" muted style={{ textAlign: "center", maxWidth: 300 }}>{t(side === "received" ? "giftEmptyReceived" : "giftEmptySent")}</T>
      <View style={{ marginTop: 4 }}><Button label={t("sendGift")} onPress={() => setSending(true)} /></View>
    </View> : <View testID="gift-inbox">
      {(side === "received" ? data.received : data.sent).map(g => {
        const sent = "toName" in g, person = sent ? g.toName : g.fromName;
        return <View key={g.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.divider }}>
          <ListItem title={giftName(g.gift)} subtitle={t(sent ? "giftTo" : "giftFrom", { name: person })}
            detail={chatTime(g.at, language)} wrap leading={<ItemArt art={giftArt(g.gift)} size={48} />}
            badge={<StatusPill label={state(g, sent)} tone={!g.opened && !sent ? "accent" : "muted"} />}
            label={[giftName(g.gift), t(sent ? "giftTo" : "giftFrom", { name: person }), state(g, sent), chatTime(g.at, language)].join(", ")}
            onPress={() => opener.show(g, sent ? "" : person, sent)} />
        </View>;
      })}
      <View style={{ alignSelf: "flex-end" }}><Button variant="link" label={t("sendGift")} onPress={() => setSending(true)} /></View>
    </View>}
    {data.sending !== "free" && <ListItem title={t("weeklyRose")} subtitle={t(data.weekly ? "weeklyRoseAvailable" : "weeklyRoseUsed")} wrap
      leading={<ItemArt art={giftArt("rose")} size={36} />} onPress={() => setWeekly(true)} />}
    <View style={{ alignSelf: "flex-start" }}><Button variant="link" label={t(data.receiving ? "receivingOn" : "receivingOff")} onPress={() => setLocalPreferences(true)} /></View>
    {opener.opening}
    <Sheet visible={preferences || localPreferences} onClose={() => { if (!busy) { onClosePreferences(); setLocalPreferences(false); } }} title={t("giftPreferences")}>
      <SwitchRow label={t("receiveGifts")} value={data.receiving} onChange={receive} disabled={busy} />
      <T variant="small" muted>{t("receivingHelp")}</T>
    </Sheet>
    <Sheet visible={weekly} onClose={() => setWeekly(false)} title={t("weeklyRose")}>
      <T>{t(data.weekly ? "weeklyRoseAvailable" : "weeklyRoseUsed")}</T><T variant="small" muted>{t("weeklyRoseHelp")}</T>
      {data.weekly && <Button label={t("sendGift")} onPress={() => { setWeekly(false); setSending(true); }} />}
    </Sheet>
    {sending && <GiftRecipient data={data} onClose={() => setSending(false)} />}
  </>;
}
