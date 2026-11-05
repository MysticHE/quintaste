import { useRef, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, T, common } from "../ui";
import { StatusPill, SwitchRow } from "../GroupedList";
import { Sheet } from "../Sheet";
import { Tile, TileGrid, TaskBar } from "./CollectionParts";
import { CollectionSection } from "./CollectionUI";
import { BadgeFocus, ProfilePreview } from "./ProfilePreview";
import { BadgeOrder } from "./BadgeOrder";
import { ProfilePicture } from "../social/ProfilePicture";
import { badgeArt, borderArt, SHOWN_MAX } from "../../config/collection";
import { buyBorder, collectionKey, showBadges, wearBorder, type Collection } from "../../services/collection-api";
import { invalidate, setRemoteData } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe } from "../../types/community";
import type collectionMessages from "../../i18n/en/collection";

export { TasksTab } from "./CollectionTasks";
type Key = keyof typeof collectionMessages;
const nothing = () => undefined;

/** Keep mutations single-flight, including two taps before React paints the busy state. */
function useAction() {
  const { setNotice } = usePreferences(), t = useT("collection"), [busy, setBusy] = useState(false), pending = useRef(false);
  const run = async (work: () => Promise<Collection>, done: string) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true);
    try {
      setRemoteData(collectionKey, await work()); setNotice({ text: done }); invalidate("/api/social/me");
      return true;
    } catch (error) {
      setNotice({ text: error instanceof Error && error.message ? error.message : t("actionFailed"), error: true });
      return false;
    } finally { pending.current = false; setBusy(false); }
  };
  return { busy, run };
}

export function BordersTab({ data, me }: { data: Collection; me: SocialMe | undefined }) {
  const t = useT("collection"), tc = useT("common"), { busy, run } = useAction();
  const [selected, setSelected] = useState(() => data.borders.find(b => b.equipped)?.id ?? data.borders[0]?.id);
  const [purchase, setPurchase] = useState<string | null>(null);
  const b = data.borders.find(x => x.id === selected) ?? data.borders[0], buying = data.borders.find(x => x.id === purchase);
  if (!b) return null;
  const name = t(("border_" + b.id) as Key) as string, available = data.credits - data.owed;
  const action = b.equipped ? <Button label={t("takeOff")} variant="secondary" loading={busy} onPress={() => void run(() => wearBorder(null), t("tookOff"))} />
    : b.owned ? <Button label={t("wear")} loading={busy} disabled={!data.hasProfile} onPress={() => void run(() => wearBorder(b.id), t("nowWearing", { name }))} />
    : b.credits <= available ? <Button label={t("exchange", { n: b.credits.toLocaleString() })} loading={busy} onPress={() => setPurchase(b.id)} />
    : <Button label={t("needMore", { n: (b.credits - available).toLocaleString() })} variant="secondary" disabled onPress={nothing} />;
  return <>
    <ProfilePreview me={me} border={b.id} badges={data.shown.filter(id => data.badges.some(x => x.id === id && x.earned && !x.revoked))} previewOnly={!b.equipped} />
    <View style={{ gap: 10 }}>
      <T variant="subtitle" style={common.bold}>{name}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <StatusPill label={t(`rarity_${b.rarity}` as Key) as string} tone="accent" />
        {b.owned && <StatusPill label={t(b.equipped ? "wearing" : "owned")} tone="success" />}
      </View>
      {!data.hasProfile && b.owned && <T variant="small" muted>{t("setUpFirst")}</T>}
      {action}
    </View>
    <CollectionSection title={t("chooseBorder")}>
      <TileGrid columns={2}>{width => data.borders.map(x => <Tile key={x.id} width={width} art={borderArt(x.id)} pulse={0} inside={size => <ProfilePicture data={me} size={size} />}
        name={t(("border_" + x.id) as Key) as string} selected={x.id === b.id} onPress={() => setSelected(x.id)}
        sub={x.equipped ? t("wearing") : x.owned ? t("owned") : t("costChip", { n: x.credits.toLocaleString() })} subTone={x.equipped ? "success" : "muted"}
        label={[t(("border_" + x.id) as Key) as string, x.equipped ? t("wearing") : x.owned ? t("owned") : t("costChip", { n: x.credits.toLocaleString() })].join(", ")} />)}</TileGrid>
    </CollectionSection>
    <Sheet visible={!!buying} onClose={() => { if (!busy) setPurchase(null); }} title={t("confirmExchange")}>
      {buying && <>
        <T>{t("exchangeQuestion", { name: t(("border_" + buying.id) as Key) as string, n: buying.credits.toLocaleString() })}</T>
        <T variant="small" muted>{t("exchangeFinal")}</T>
        <Button label={t("exchange", { n: buying.credits.toLocaleString() })} loading={busy} disabled={buying.owned || buying.credits > available}
          onPress={() => { void run(() => buyBorder(buying.id), t("exchanged", { name: t(("border_" + buying.id) as Key) as string })).then(ok => { if (ok) setPurchase(null); }); }} />
        <Button label={tc("cancel")} variant="link" disabled={busy} onPress={() => setPurchase(null)} />
      </>}
    </Sheet>
  </>;
}

export function BadgesTab({ data, me }: { data: Collection; me?: SocialMe }) {
  const t = useT("collection"), { setNotice } = usePreferences(), { busy, run } = useAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null), [details, setDetails] = useState(false);
  const b = data.badges.find(x => x.id === selected), shown = !!b && data.shown.includes(b.id);
  const earned = data.badges.filter(x => x.earned && !x.revoked);
  const displayed = data.shown.flatMap(id => earned.find(x => x.id === id) ?? []);
  const draft = order?.filter(id => earned.some(x => x.id === id)) ?? null;
  const unlocked = (badge: Collection["badges"][number]) => badge.accessUnlocked ?? (data.master && !badge.earnedAt);
  const toggle = (on: boolean) => {
    if (!b || !b.earned || b.revoked || busy) return;
    if (on && data.shown.length >= SHOWN_MAX) { setNotice({ text: t("showLimit"), error: true }); return; }
    void run(() => showBadges(on ? [...data.shown, b.id] : data.shown.filter(id => id !== b.id)), t(on ? "shownNotice" : "hiddenNotice"));
  };
  return <>
    <ProfilePreview me={me} border={data.borders.find(x => x.equipped)?.id ?? null} badges={draft ?? displayed.map(x => x.id)}
      action={draft ? <View style={common.row}>
        <Button label={t("cancelOrder")} variant="link" disabled={busy} onPress={() => setOrder(null)} />
        <Button label={t("saveBadgeOrder")} variant="link" loading={busy} disabled={draft.join() === displayed.map(x => x.id).join()} onPress={() => {
          void run(() => showBadges([...draft]), t("orderSaved")).then(ok => { if (ok) setOrder(null); });
        }} />
      </View> : displayed.length > 1 ? <Button variant="link" label={t("editBadges")} disabled={busy} onPress={() => setOrder(displayed.map(x => x.id))} /> : undefined}
      editor={draft ? <BadgeOrder ids={draft} onChange={setOrder} disabled={busy} /> : undefined} />
    <CollectionSection title={t("yourBadges")} aside={t("unlockedCount", { done: earned.length, of: data.badges.length })}>
      <TileGrid columns={2}>{width => data.badges.map(x => {
        const completed = x.tasks.filter(task => task.done >= task.of).length;
        const progress = x.tasks.reduce((sum, task) => sum + (task.of > 0 ? Math.max(0, Math.min(1, task.done / task.of)) : 0), 0) / Math.max(1, x.tasks.length);
        const state = x.revoked ? t("revoked") : x.earned ? t(data.shown.includes(x.id) ? "shown" : unlocked(x) ? "unlocked" : "earned") : t("requirementsCount", { done: completed, of: x.tasks.length });
        return <Tile key={x.id} width={width} art={badgeArt(x.id)} pulse={0} dim={!x.earned || x.revoked}
          name={t(("badge_" + x.id) as Key) as string} selected={x.id === selected} disabled={draft !== null} onPress={() => { setDetails(false); setSelected(x.id); }}
          sub={state} subTone={x.earned && !x.revoked ? "success" : "muted"} bar={!x.earned && !x.revoked ? progress : undefined}
          label={[t(("badge_" + x.id) as Key) as string, t(`tier_${x.tier}` as Key) as string, state].join(", ")} />;
      })}</TileGrid>
      {!data.badges.length && <T variant="small" muted>{t("noBadges")}</T>}
    </CollectionSection>
    <Sheet visible={!!b} fullScreen onClose={() => setSelected(null)} title={b ? t(("badge_" + b.id) as Key) as string : t("tabBadges")}>
      {b && <>
        <BadgeFocus id={b.id} dim={!b.earned || b.revoked} level={b.tier} tier={t(`tier_${b.tier}` as Key) as string} status={b.revoked ? t("revoked") : b.earned ? t(unlocked(b) ? "unlocked" : "earned") : t("inProgress")} />
        <T variant="small" muted style={{ textAlign: "center" }}>{t(("badgePurpose_" + b.id) as Key) as string}</T>
        <View style={{ gap: 14 }}>
          <T variant="small" muted>{t(b.revoked ? "badgeRemovedNote" : unlocked(b) ? "badgeAccessNote" : b.earned ? "badgeKeptNote" : "allRequirements")}</T>
          <View style={{ gap: 16 }}>{b.tasks.map(task => <TaskBar key={task.key} label={t(`bt_${b.id}_${task.key}` as Key, { n: task.of }) as string} done={task.done} of={task.of} />)}</View>
        </View>
        <CollectionSection title={t("whatCounts")} expanded={details} onToggle={() => setDetails(!details)}>
          {details && <T variant="small" muted>{t(("badgeHelp_" + b.id) as Key) as string}</T>}
        </CollectionSection>
        {b.earned && !b.revoked ? <>
          <SwitchRow label={t("showOnProfile")} value={shown} disabled={busy} onChange={toggle} />
          {!shown && data.shown.length >= SHOWN_MAX && <T variant="small" muted>{t("showLimit")}</T>}
        </> : !b.revoked ? <>
          {b.id !== "lotus-legend" && <Button label={t(b.id === "explorer" ? "explorePlaces" : b.id === "home-cook" ? "browseRecipes" : "viewDining")}
            onPress={() => { setSelected(null); router.push(b.id === "explorer" ? "/" : b.id === "home-cook" ? "/cook" : "/social/community"); }} />}
          <T variant="small" muted>{t("unlockToShow")}</T>
        </> : null}
      </>}
    </Sheet>
  </>;
}
