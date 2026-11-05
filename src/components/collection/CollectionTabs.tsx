import { useRef, useState } from "react";
import { router } from "expo-router";
import { Platform, Pressable, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { StatusPill, SwitchRow } from "../GroupedList";
import { Sheet } from "../Sheet";
import { Tile, TileGrid, TaskBar } from "./CollectionParts";
import { CollectionSection } from "./CollectionUI";
import { ItemArt } from "./Glint";
import { BadgeFocus, ProfilePreview } from "./ProfilePreview";
import { IconButton } from "../food/Controls";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
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
  const t = useT("collection"), { theme, setNotice } = usePreferences(), { busy, run } = useAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null), [preview, setPreview] = useState(false);
  const b = data.badges.find(x => x.id === selected), shown = !!b && data.shown.includes(b.id);
  const earned = data.badges.filter(x => x.earned && !x.revoked);
  const displayed = data.shown.flatMap(id => earned.find(x => x.id === id) ?? []);
  const toggle = (on: boolean) => {
    if (!b || !b.earned || b.revoked || busy) return;
    if (on && data.shown.length >= SHOWN_MAX) { setNotice({ text: t("showLimit"), error: true }); return; }
    void run(() => showBadges(on ? [...data.shown, b.id] : data.shown.filter(id => id !== b.id)), t(on ? "shownNotice" : "hiddenNotice"));
  };
  return <>
    <ProfilePreview me={me} border={data.borders.find(x => x.equipped)?.id ?? null} badges={displayed.map(x => x.id)} />
    <CollectionSection title={t("onProfile")} aside={t("slotCount", { done: displayed.length, of: SHOWN_MAX })}>
      {displayed.length > 1 && <Button variant="secondary" label={t("arrangeBadges")} onPress={() => setOrder(displayed.map(x => x.id))} disabled={busy} />}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {displayed.map(x => <ProfileBadgeSlot key={x.id} id={x.id} onPress={() => { setPreview(false); setSelected(x.id); }} />)}
        {Array.from({ length: Math.max(0, SHOWN_MAX - displayed.length) }, (_, index) => <View key={`empty-${index}`} accessible accessibilityLabel={t("emptyBadgeSlot")}
          style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: theme.border, alignItems: "center", justifyContent: "center" }}>
          <Icon name="remove-outline" size={18} />
        </View>)}
      </View>
    </CollectionSection>
    <CollectionSection title={t("yourBadges")} aside={t("earnedCount", { done: earned.length, of: data.badges.length })}>
      <TileGrid columns={2}>{width => data.badges.map(x => {
        const completed = x.tasks.filter(task => task.done >= task.of).length;
        const progress = x.tasks.reduce((sum, task) => sum + (task.of > 0 ? Math.max(0, Math.min(1, task.done / task.of)) : 0), 0) / Math.max(1, x.tasks.length);
        const state = x.revoked ? t("revoked") : x.earned ? t(data.shown.includes(x.id) ? "shown" : "earned") : t("requirementsCount", { done: completed, of: x.tasks.length });
        return <Tile key={x.id} width={width} art={badgeArt(x.id)} pulse={0} dim={!x.earned || x.revoked}
          name={t(("badge_" + x.id) as Key) as string} selected={x.id === selected} onPress={() => { setPreview(false); setSelected(x.id); }}
          sub={state} subTone={x.earned && !x.revoked ? "success" : "muted"} bar={!x.earned && !x.revoked ? progress : undefined}
          label={[t(("badge_" + x.id) as Key) as string, t(`tier_${x.tier}` as Key) as string, state].join(", ")} />;
      })}</TileGrid>
      {!data.badges.length && <T variant="small" muted>{t("noBadges")}</T>}
    </CollectionSection>
    <Sheet visible={!!b} swipeToClose onClose={() => setSelected(null)} title={b ? t(("badge_" + b.id) as Key) as string : t("tabBadges")}>
      {b && <>
        <BadgeFocus id={b.id} dim={!b.earned || b.revoked} level={b.tier} tier={t(`tier_${b.tier}` as Key) as string} status={b.revoked ? t("revoked") : b.earned ? t("earned") : t("inProgress")} />
        {b.earned && !b.revoked && <>
          <Button variant="secondary" label={t(preview ? "hidePreview" : "previewOnProfile")} onPress={() => setPreview(!preview)} />
          {preview && <ProfilePreview me={me} border={data.borders.find(x => x.equipped)?.id ?? null} badges={shown ? displayed.map(x => x.id) : [...displayed.map(x => x.id), b.id]} previewOnly />}
        </>}
        <View style={{ gap: 14 }}>
          <T variant="small" muted>{t("allRequirements")}</T>
          <View style={{ gap: 14 }}>{b.tasks.map(task => <TaskBar key={task.key} label={t(`bt_${b.id}_${task.key}` as Key) as string} done={task.done} of={task.of} />)}</View>
        </View>
        {b.earned && !b.revoked ? <>
          <SwitchRow label={t("showOnProfile")} value={shown} disabled={busy} onChange={toggle} />
          {!shown && data.shown.length >= SHOWN_MAX && <T variant="small" muted>{t("showLimit")}</T>}
        </> : !b.revoked && (b.id === "explorer" || b.id === "home-cook") ? <Button label={t(b.id === "explorer" ? "explorePlaces" : "browseRecipes")}
          onPress={() => { setSelected(null); router.push(b.id === "explorer" ? "/" : "/cook"); }} /> : null}
      </>}
    </Sheet>
    <Sheet visible={order !== null} onClose={() => { if (!busy) setOrder(null); }} title={t("arrangeBadges")}>
      {order && <>
        <ProfilePreview me={me} border={data.borders.find(x => x.equipped)?.id ?? null} badges={order} previewOnly />
        <T variant="small" muted>{t("arrangeHint")}</T>
        {order.map((id, index) => {
          const name = t(("badge_" + id) as Key) as string;
          const move = (delta: number) => setOrder(current => {
            if (!current || busy) return current;
            const next = [...current], target = index + delta;
            if (target < 0 || target >= next.length) return current;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
          });
          return <View key={id} testID="badge-order-row" style={[{ flexDirection: "row", gap: 8, alignItems: "center", minHeight: 56 }]}>
            <ItemArt art={badgeArt(id)} size={32} />
            <T variant="small" style={{ flex: 1 }}>{name}</T>
            <IconButton label={t("moveEarlier", { name })} icon="arrow-up" disabled={busy || index === 0} onPress={() => move(-1)} />
            <IconButton label={t("moveLater", { name })} icon="arrow-down" disabled={busy || index === order.length - 1} onPress={() => move(1)} />
          </View>;
        })}
        <Button label={t("saveOrder")} loading={busy} disabled={order.join() === displayed.map(x => x.id).join()} onPress={() => {
          const ids = [...order];
          void run(() => showBadges(ids), t("orderSaved")).then(ok => { if (ok) setOrder(null); });
        }} />
        <Button label={t("cancelOrder")} variant="link" disabled={busy} onPress={() => setOrder(null)} />
      </>}
    </Sheet>
  </>;
}

function ProfileBadgeSlot({ id, onPress }: { id: string; onPress: () => void }) {
  const t = useT("collection"), { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={t(("badge_" + id) as Key) as string + ", " + t("shown")}
    onPress={onPress} {...focusProps} style={({ pressed }) => [{ width: 56, height: 56, borderRadius: 12, borderWidth: 2,
      borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.accentSoft : theme.card, alignItems: "center", justifyContent: "center" },
      Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]}>
    <ItemArt art={badgeArt(id)} size={42} fx />
  </Pressable>;
}
