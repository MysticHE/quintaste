import { useState } from "react";
import { View } from "react-native";
import { Icon } from "../ui";
import { ItemArt, useGlintClock } from "./Glint";
import { Tile, TileGrid } from "./CollectionParts";
import { useGiftName, useGiftOpener } from "./Gifts";
import { ListGroup, ListItem, SwitchRow } from "../GroupedList";
import { ChoiceChips } from "../social/ProfileControls";
import { ApiError } from "../../services/community-api";
import { giftsKey, setReceiving, type Gifts } from "../../services/gifts-api";
import { setRemoteData } from "../../hooks/useRemote";
import { giftArt } from "../../config/collection";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { chatTime } from "../../utils/chat-time";

type Side = "received" | "sent";
/**
 * Collection › Gifts: Received (how many of each, then each gift, unopened ones dim, and Receive gifts) and Sent (who you
 * sent each gift to, and a heart once they liked it). Tapping a gift plays its opening; a received one can be liked there.
 */
export function GiftsTab({ data }: { data: Gifts }) {
  const t = useT("collection"), giftName = useGiftName(), language = useLanguage(), { theme, setNotice } = usePreferences();
  const [side, setSide] = useState<Side>("received"), [busy, setBusy] = useState(false), opener = useGiftOpener(data.catalog);
  const count = (id: string) => data.received.filter(g => g.gift === id).length, clock = useGlintClock(data.catalog.length);
  const receive = async (on: boolean) => {
    setBusy(true);
    try { await setReceiving(on); setRemoteData(giftsKey, { ...data, receiving: on }); }
    catch (failure) { setNotice({ text: failure instanceof ApiError ? failure.message : t("actionFailed") as string, error: true }); }
    finally { setBusy(false); }
  };
  const heart = <Icon name="heart" size={16} color={theme.accent} />;
  const when = (at: string) => chatTime(at, language);
  return <>
    <ChoiceChips label={t("tabGifts")} value={side} onChange={setSide} options={[{ id: "received", label: t("tabReceived") }, { id: "sent", label: t("tabSent") }]} />
    {side === "received" && <>
      <TileGrid>{width => data.catalog.map((g, index) => {
        const n = count(g.id), last = data.received.find(r => r.gift === g.id);
        return <Tile key={g.id} width={width} art={giftArt(g.id)} pulse={clock.tile(index)} dim={!n} name={giftName(g.id)} sub={t("giftCount", { n })} selected={false}
          onPress={() => last && opener.show(last, last.fromName, false)} label={giftName(g.id) + ", " + t("giftCount", { n })} />;
      })}</TileGrid>
      <ListGroup>
        {!data.received.length && <ListItem title={t("noGifts")} />}
        {data.received.map(g => <ListItem key={g.id} title={t("giftFrom", { name: g.fromName }) as string} subtitle={g.note || giftName(g.gift)} detail={when(g.at)}
          leading={<ItemArt art={giftArt(g.gift)} size={40} dim={!g.opened} />} badge={g.liked ? heart : undefined}
          label={[t("giftFrom", { name: g.fromName }), giftName(g.gift), g.note, g.opened ? "" : t("tapToOpen"), g.liked ? t("giftStateYouLiked") : ""].filter(Boolean).join(", ")}
          onPress={() => opener.show(g, g.fromName, false)} />)}
      </ListGroup>
      <ListGroup><View style={{ paddingHorizontal: 14 }}><SwitchRow label={t("receiveGifts")} value={data.receiving} onChange={receive} disabled={busy} /></View></ListGroup>
    </>}
    {side === "sent" && <ListGroup>
      {!data.sent.length && <ListItem title={t("noSent")} />}
      {data.sent.map(g => <ListItem key={g.id} title={t("giftTo", { name: g.toName }) as string} subtitle={g.note || giftName(g.gift)} detail={when(g.at)}
        leading={<ItemArt art={giftArt(g.gift)} size={40} />} badge={g.liked ? heart : undefined}
        label={[t("giftTo", { name: g.toName }), giftName(g.gift), g.note, g.liked ? t("giftStateLiked") : ""].filter(Boolean).join(", ")}
        onPress={() => opener.show(g, "", true)} />)}
    </ListGroup>}
    {opener.opening}
  </>;
}
