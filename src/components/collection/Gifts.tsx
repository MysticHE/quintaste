import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Field, Icon, T, common } from "../ui";
import { Sheet } from "../Sheet";
import { ItemArt, useGlintClock } from "./Glint";
import { Burst } from "./Fx";
import { TileGrid } from "./CollectionParts";
import { ApiError } from "../../services/community-api";
import { checkGift, giftCatalogKey, giftsKey, likeGift, loadGiftCatalog, loadGifts, openGift, sendGift, sgd, thankGift, type GiftCatalog } from "../../services/gifts-api";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { giftArt } from "../../config/collection";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { ReportSheet } from "../ReportSheet";
import { buyGift, giftStore } from "../../services/gift-store";
import type collectionMessages from "../../i18n/en/collection";

type Key = keyof typeof collectionMessages;
/** One gift as the opening, chat card and Gifts lists see it. */
export type GiftView = { id: string; gift: string; note: string; opened: boolean; liked?: boolean; thanked?: boolean; fromId?: string | null };
/** The gift's name in the reader's language. */
export function useGiftName() {
  const t = useT("collection");
  return (id: string) => t(("gift_" + id) as Key) as string;
}
/**
 * Gifts, while the gifts service is on (it answers 503 while switched off, and nothing about gifts is shown): the full lists
 * for Collection › Gifts, or just what the picker needs elsewhere.
 */
export const useGifts = (on = true) => useRemote(on ? giftsKey : null, loadGifts);
export const useGiftCatalog = (on = true) => useRemote(on ? giftCatalogKey : null, loadGiftCatalog);
const errorKeys: Record<string, Key> = { GIFT_STORE: "giftStore", GIFT_PURCHASE: "giftPurchase", GIFTS_OFF: "giftsOff", GIFT_LIMIT: "giftLimit", SOCIAL_SETUP: "giftSetup" };
/** A refused send in the reader's language; "unavailable" (404) covers hidden, blocked and profile-less receivers. */
function sendError(failure: unknown, t: ReturnType<typeof useT<"collection">>) {
  if (!(failure instanceof ApiError)) return t("actionFailed") as string;
  const key = failure.code ? errorKeys[failure.code] : failure.status === 404 ? "giftUnavailable" : undefined;
  return key ? t(key) as string : failure.message;
}
/** Gift changes show in Gifts, friend chats (gift lines) and the inbox count. */
export const refreshGifts = () => invalidate(giftsKey, "/api/social/chats", "/api/inbox");

/**
 * Pick a gift for member `to`, add a note and send it. Each time it opens, this week's free Rose is picked while it is left
 * (else the first gift); the master account sends every gift free; other gifts show their store price and are bought in
 * the App Store or Google Play (the store sheet opens; the gift goes once the store confirms the payment). The web and
 * Expo Go can't buy them.
 */
export function GiftSheet({ visible, onClose, to, data }: { visible: boolean; onClose: () => void; to: string; data: GiftCatalog }) {
  const t = useT("collection"), giftName = useGiftName(), { theme, setNotice } = usePreferences(), first = data.weekly ?? data.catalog[0]?.id ?? "";
  const [picked, setPicked] = useState(first), [note, setNote] = useState(""), [busy, setBusy] = useState(false), [problem, setProblem] = useState("");
  const clock = useGlintClock(visible ? data.catalog.length : 0);
  // Opening again starts from this week's choice (state adjusted during render, not in an effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) { setWasVisible(visible); if (visible) { setPicked(first); setProblem(""); } }
  const gift = data.catalog.find(g => g.id === picked), isFree = (id: string) => data.sending === "free" || id === data.weekly;
  const store = giftStore(), canBuy = !!store && !!data.stores?.[store];
  const priceOf = (id: string, cents: number) => isFree(id) ? t("giftFree") : t("giftPrice", { price: sgd(cents) });
  const close = () => { setProblem(""); onClose(); };
  const send = async () => {
    if (!gift) return;
    setBusy(true); setProblem("");
    try {
      if (isFree(gift.id)) await sendGift(to, gift.id, note.trim());
      else {
        if (!canBuy) { setProblem(t("giftStore") as string); return; }
        // The same checks as sending run first, so nobody pays for a gift that can't go.
        const { pay, product } = await checkGift(to, gift.id);
        if (pay !== "store") await sendGift(to, gift.id, note.trim());
        else {
          const result = await buyGift({ to, gift: gift.id, note: note.trim() }, product);
          if (result === "cancelled") return;
          if (result === "failed") { setProblem(t("giftBuyFailed") as string); return; }
        }
      }
      refreshGifts();
      setNote(""); close();
      setNotice({ text: t("giftSent", { gift: giftName(gift.id) }) });
    } catch (failure) { setProblem(sendError(failure, t)); }
    finally { setBusy(false); }
  };
  const footer = <View style={{ gap: 8 }}>
    {!!problem && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{problem}</T>}
    <Button label={!gift ? t("sendGift") : isFree(gift.id) ? t("sendFree") : t("sendPrice", { price: sgd(gift.priceCents) })} onPress={send} loading={busy} disabled={!gift} />
  </View>;
  return <Sheet visible={visible} onClose={close} title={t("sendGift")} footer={footer}>
    <View accessibilityRole="radiogroup">
      <TileGrid>{width => data.catalog.map((g, index) => {
        const selected = g.id === picked, price = priceOf(g.id, g.priceCents), weekly = g.id === data.weekly && data.sending !== "free";
        // The free weekly Rose reads "Free" on the tile (green) and "Free this week" to screen readers.
        return <Pressable key={g.id} onPress={() => setPicked(g.id)} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
          accessibilityLabel={giftName(g.id) + ", " + (weekly ? t("giftWeekly") : price)}
          style={({ pressed }) => [s.tile, { width, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.accent : theme.border,
            backgroundColor: selected ? theme.accentSoft : theme.card, opacity: pressed ? 0.85 : 1 }]}>
          <ItemArt art={giftArt(g.id)} size={width * 0.6} pulse={clock.tile(index)} />
          <View style={s.grow}><T variant="small" numberOfLines={2} style={[common.bold, s.center]}>{giftName(g.id)}</T></View>
          <T variant="caption" numberOfLines={1} color={weekly ? theme.success : theme.mutedForeground} style={weekly && common.bold}>{price}</T>
        </Pressable>;
      })}</TileGrid>
    </View>
    <Field label={t("giftNote")} showLabel={false} placeholder={t("giftNote")} value={note} onChangeText={setNote} maxLength={100} />
  </Sheet>;
}

type Opened = { view: GiftView; from: string; mine: boolean };
/**
 * Opening a gift: the gift on a soft spotlight while a few star glints play one after another (more for bigger gifts), as
 * in the owner's reference video, with who sent it, the note and, for the receiver, Like, Say thanks and Report (gifts can
 * come from strangers). The sender sees whether it was liked and thanked. Reduce motion shows it still. Tapping outside the
 * card closes it.
 */
function GiftOpening({ open, onLike, onThanks, onReport, onClose }: {
  open: Opened | null; onLike: (on: boolean) => void; onThanks: () => void; onReport: () => void; onClose: () => void;
}) {
  const t = useT("collection"), giftName = useGiftName(), { theme, reducedMotion } = usePreferences(), gift = open?.view.gift, art = gift ? giftArt(gift) : undefined;
  const liked = !!open?.view.liked, thanked = !!open?.view.thanked;
  const state = (icon: "heart" | "happy", text: string) => <View style={[common.row, { gap: 6 }]}>
    <Icon name={icon} size={18} color={theme.accent} /><T variant="small" color={theme.accent} style={common.bold}>{text}</T></View>;
  return <Modal visible={!!open} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={onClose}>
    <View style={[s.opening, { backgroundColor: theme.overlay }]}>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("tapToClose")} style={StyleSheet.absoluteFill} />
      {open && <View style={[s.card, { backgroundColor: theme.background }]} accessibilityViewIsModal>
        <View style={[s.spot, { backgroundColor: theme.accentSoft }]}>
          <View style={{ width: 184, height: 184 }}>
            <ItemArt art={art} size={184} fx />
            {/* The moment it opens: a flash of the gift's colour and sparks, once per gift. */}
            {art && <Burst key={open.view.id} art={art} size={184} />}
          </View>
        </View>
        <T variant="title" numberOfLines={1} style={[common.bold, s.center]} accessibilityRole="header">{giftName(open.view.gift)}</T>
        {!!open.from && <T muted numberOfLines={1} style={s.center}>{t("giftFrom", { name: open.from })}</T>}
        {!!open.view.note && <T style={s.center}>{open.view.note}</T>}
        {open.mine
          ? (liked || thanked) && <View style={[common.row, { gap: 16, flexWrap: "wrap", justifyContent: "center" }]}>
              {liked && state("heart", t("giftStateLiked"))}{thanked && state("happy", t("giftStateThanked"))}</View>
          : <View style={[common.row, { gap: 8, flexWrap: "wrap", justifyContent: "center" }]}>
              <Pressable onPress={() => onLike(!liked)} accessibilityRole="button" accessibilityState={{ selected: liked }} accessibilityLabel={liked ? t("unlikeGift") : t("likeGift")}
                style={({ pressed }) => [s.react, { borderColor: liked ? theme.accent : theme.border, backgroundColor: liked ? theme.accentSoft : theme.card, opacity: pressed ? 0.85 : 1 }]}>
                <Icon name={liked ? "heart" : "heart-outline"} size={20} color={theme.accent} />
                <T style={common.bold} numberOfLines={1} color={liked ? theme.accent : theme.foreground}>{liked ? t("liked") : t("like")}</T>
              </Pressable>
              <Pressable onPress={onThanks} disabled={thanked} accessibilityRole="button" accessibilityState={{ disabled: thanked }} accessibilityLabel={thanked ? t("giftStateYouThanked") : t("sayThanks")}
                style={({ pressed }) => [s.react, { borderColor: thanked ? theme.accent : theme.border, backgroundColor: thanked ? theme.accentSoft : theme.card, opacity: pressed ? 0.85 : 1 }]}>
                <Icon name={thanked ? "happy" : "happy-outline"} size={20} color={theme.accent} />
                <T style={common.bold} numberOfLines={1} color={thanked ? theme.accent : theme.foreground}>{thanked ? t("thanked") : t("sayThanks")}</T>
              </Pressable>
            </View>}
        {!open.mine && !!open.view.fromId && <View style={{ alignSelf: "center" }}>
          <Button variant="link" icon="flag-outline" label={t("reportSender", { name: open.from })} onPress={onReport} /></View>}
      </View>}
    </View>
  </Modal>;
}

/** A gift in a friend chat: the gift's name and where it stands (Tap to open, Opened, Liked), on your side or theirs. */
export function GiftLine({ gift, mine, onPress }: { gift: GiftView | null | undefined; mine: boolean; onPress: () => void }) {
  const t = useT("collection"), giftName = useGiftName(), { theme } = usePreferences();
  if (!gift) return <T variant="small" muted style={[s.center, { paddingVertical: 4 }]}>{t("giftLineGone")}</T>;
  const waiting = !mine && !gift.opened, liked = !!gift.liked;
  const state = waiting ? t("tapToOpen") : liked ? (mine ? t("giftStateLiked") : t("giftStateYouLiked")) : mine ? t("giftStateSent") : t("giftStateOpened");
  const title = t(mine ? "giftLineMine" : "giftLineTheirs", { gift: giftName(gift.gift) }) as string;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title + ", " + state}
    style={({ pressed }) => [s.line, { alignSelf: mine ? "flex-end" : "flex-start", backgroundColor: theme.accentSoft, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
    <ItemArt art={giftArt(gift.gift)} size={44} dim={waiting} />
    <View style={{ flexShrink: 1, minWidth: 0, gap: 2 }}>
      <T variant="small" numberOfLines={1} style={common.bold}>{giftName(gift.gift)}</T>
      <View style={[common.row, { gap: 4 }]}>
        {liked && <Icon name="heart" size={13} color={theme.accent} />}
        <T variant="caption" numberOfLines={1} color={waiting || liked ? theme.accent : theme.mutedForeground}>{state}</T>
      </View>
    </View>
  </Pressable>;
}

/**
 * Plays a gift's opening. The receiver's first look marks it opened, and they can Like it, or report (and block) the sender,
 * from there.
 */
export function useGiftOpener() {
  const { setNotice } = usePreferences(), t = useT("collection"), [open, setOpen] = useState<Opened | null>(null);
  const [report, setReport] = useState<{ id: string; name: string } | null>(null);
  const show = (view: GiftView, from: string, mine: boolean) => {
    setOpen({ view, from: mine ? "" : from, mine });
    if (!mine && !view.opened) openGift(view.id).then(refreshGifts, () => undefined);
  };
  const like = async (on: boolean) => {
    if (!open) return;
    setOpen({ ...open, view: { ...open.view, liked: on, opened: true } });
    try { await likeGift(open.view.id, on); refreshGifts(); }
    catch { setOpen(current => current && { ...current, view: { ...current.view, liked: !on } }); setNotice({ text: t("actionFailed") as string, error: true }); }
  };
  const thanks = async () => {
    if (!open || open.view.thanked) return;
    setOpen({ ...open, view: { ...open.view, thanked: true, opened: true } });
    try { await thankGift(open.view.id); refreshGifts(); }
    catch { setOpen(current => current && { ...current, view: { ...current.view, thanked: false } }); setNotice({ text: t("actionFailed") as string, error: true }); }
  };
  const reportSender = () => { if (open?.view.fromId) setReport({ id: open.view.fromId, name: open.from }); setOpen(null); };
  return { show, opening: <>
    <GiftOpening open={open} onLike={like} onThanks={thanks} onReport={reportSender} onClose={() => setOpen(null)} />
    {report && <ReportSheet kind="person" targetId={report.id} name={report.name} hasPhoto={false} visible onClose={() => setReport(null)}
      onBlocked={() => invalidate("/api/social", giftsKey, "/api/inbox")} />}
  </> };
}

const s = StyleSheet.create({
  center: { textAlign: "center" },
  grow: { flexGrow: 1, justifyContent: "center" },
  tile: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", gap: 4 },
  opening: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 24, padding: 24, gap: 10, alignItems: "center", width: "100%", maxWidth: 360 },
  spot: { width: 216, height: 216, borderRadius: 108, alignItems: "center", justifyContent: "center" },
  react: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, minWidth: 128, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, borderWidth: 1, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, maxWidth: "80%" },
});
