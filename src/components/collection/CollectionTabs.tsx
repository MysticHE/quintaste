import { useState } from "react";
import { View } from "react-native";
import { Button, T } from "../ui";
import { ListGroup, ListItem, RowIcon, SwitchRow } from "../GroupedList";
import { FeatureCard, Tile, TileGrid, TaskBar, rarityTone, tierTone } from "./CollectionParts";
import { useGlintClock } from "./Glint";
import { ProfilePicture } from "../social/ProfilePicture";
import { badgeArt, borderArt, SHOWN_MAX } from "../../config/collection";
import { buyBorder, collectionKey, showBadges, wearBorder, type Collection } from "../../services/collection-api";
import { invalidate, setRemoteData } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe } from "../../types/community";
import type collectionMessages from "../../i18n/en/collection";

type Key = keyof typeof collectionMessages;
const nothing = () => undefined;
/** Runs a Collection change, shows the Collection it returns, and reloads the profile (which shows the border and badges). */
function useAction() {
  const { setNotice } = usePreferences(), t = useT("collection"), [busy, setBusy] = useState(false);
  const run = async (work: () => Promise<Collection>, done: string) => {
    if (busy) return;
    setBusy(true);
    try { setRemoteData(collectionKey, await work()); setNotice({ text: done }); invalidate("/api/social/me"); }
    catch (error) { setNotice({ text: error instanceof Error && error.message ? error.message : t("actionFailed"), error: true }); }
    finally { setBusy(false); }
  };
  return { busy, run };
}

export function BordersTab({ data, me }: { data: Collection; me: SocialMe | undefined }) {
  const t = useT("collection"), { busy, run } = useAction(), clock = useGlintClock(data.borders.length);
  const [selected, setSelected] = useState(() => data.borders.find(b => b.equipped)?.id ?? data.borders[0].id);
  const b = data.borders.find(x => x.id === selected) ?? data.borders[0], name = t(("border_" + b.id) as Key) as string;
  const picture = (size: number) => <ProfilePicture data={me} size={size} />;
  const action = b.equipped ? <><Button label={t("wearing")} icon="checkmark" variant="secondary" disabled onPress={nothing} />
      <Button label={t("takeOff")} variant="secondary" loading={busy} onPress={() => void run(() => wearBorder(null), t("tookOff"))} /></>
    : b.owned ? <Button label={t("wear")} loading={busy} disabled={!data.hasProfile} onPress={() => void run(() => wearBorder(b.id), t("nowWearing", { name }))} />
    : b.credits <= data.credits - data.owed ? <Button label={t("exchange", { n: b.credits.toLocaleString() })} loading={busy} onPress={() => void run(() => buyBorder(b.id), t("exchanged", { name }))} />
    : <Button label={t("needMore", { n: (b.credits - (data.credits - data.owed)).toLocaleString() })} variant="secondary" disabled onPress={nothing} />;
  return <>
    <FeatureCard art={borderArt(b.id)} pulse={clock.feature} inside={picture} title={name}
      pills={[[t(`rarity_${b.rarity}` as Key) as string, rarityTone[b.rarity]], ...(b.owned ? [] : [[t("costChip", { n: b.credits.toLocaleString() }), "muted"] as [string, "muted"]])]}>
      <T variant="small" muted style={{ textAlign: "center" }}>{t(("borderDesc_" + b.id) as Key) as string}</T>
      {!data.hasProfile && b.owned && <T variant="small" muted style={{ textAlign: "center" }}>{t("setUpFirst")}</T>}
      <View style={{ alignSelf: "stretch", gap: 8 }}>{action}</View>
    </FeatureCard>
    <TileGrid>{width => data.borders.map((x, i) => <Tile key={x.id} width={width} art={borderArt(x.id)} pulse={clock.tile(i)} inside={picture}
      name={t(("border_" + x.id) as Key) as string} selected={x.id === b.id} onPress={() => setSelected(x.id)}
      sub={x.equipped ? t("wearing") : x.owned ? t("owned") : t("costChip", { n: x.credits.toLocaleString() })} subTone={x.equipped ? "success" : "muted"}
      label={[t(("border_" + x.id) as Key) as string, x.equipped ? t("wearing") : x.owned ? t("owned") : t("costChip", { n: x.credits.toLocaleString() })].join(", ")} />)}</TileGrid>
  </>;
}

export function BadgesTab({ data }: { data: Collection }) {
  const t = useT("collection"), { setNotice } = usePreferences(), { busy, run } = useAction(), clock = useGlintClock(data.badges.length);
  const [selected, setSelected] = useState(() => (data.badges.find(b => b.earned) ?? data.badges[0])?.id);
  const b = data.badges.find(x => x.id === selected) ?? data.badges[0];
  if (!b) return null;
  const name = t(("badge_" + b.id) as Key) as string, shown = data.shown.includes(b.id);
  const toggle = (on: boolean) => {
    if (on && data.shown.length >= SHOWN_MAX) { setNotice({ text: t("showLimit"), error: true }); return; }
    void run(() => showBadges(on ? [...data.shown, b.id] : data.shown.filter(id => id !== b.id)), t(on ? "shownNotice" : "hiddenNotice"));
  };
  const progress = (x: Collection["badges"][number]) => x.tasks.reduce((sum, task) => sum + task.done / task.of, 0) / Math.max(1, x.tasks.length);
  return <>
    <FeatureCard art={badgeArt(b.id)} pulse={b.earned ? clock.feature : 0} dim={!b.earned} title={name}
      pills={[[t(`tier_${b.tier}` as Key) as string, tierTone[b.tier]], ...(b.earned ? [[t("earned"), "success"] as [string, "success"]] : []), ...(b.revoked ? [[t("revoked"), "muted"] as [string, "muted"]] : [])]}>
      <View style={{ alignSelf: "stretch", gap: 10 }}>
        {b.tasks.map(task => <TaskBar key={task.key} label={t(`bt_${b.id}_${task.key}` as Key) as string} done={task.done} of={task.of} />)}
      </View>
      {b.earned && <View style={{ alignSelf: "stretch" }}><SwitchRow label={t("showOnProfile")} value={shown} disabled={busy} onChange={toggle} /></View>}
    </FeatureCard>
    <TileGrid>{width => data.badges.map((x, i) => <Tile key={x.id} width={width} art={badgeArt(x.id)} pulse={x.earned ? clock.tile(i) : 0} dim={!x.earned}
      name={t(("badge_" + x.id) as Key) as string} selected={x.id === b.id} onPress={() => setSelected(x.id)}
      sub={x.earned ? t("earned") : t(`tier_${x.tier}` as Key) as string} subTone={x.earned ? "success" : "muted"} bar={x.earned ? undefined : progress(x)}
      label={[t(("badge_" + x.id) as Key) as string, x.earned ? t("earned") : t(`tier_${x.tier}` as Key) as string].join(", ")} />)}</TileGrid>
  </>;
}

export function TasksTab({ data }: { data: Collection }) {
  const t = useT("collection"), { theme } = usePreferences(), tasks = data.tasks;
  const plus = (n: number) => <T variant="small" style={{ fontWeight: "700" }} color={theme.accent}>{t("plus", { n })}</T>;
  return <>
    {data.owed > 0 && <ListGroup><ListItem title={t("owedTitle", { n: data.owed })} subtitle={t("owedText")} wrap leading={<RowIcon name="alert-circle-outline" tone="warning" />} /></ListGroup>}
    <ListGroup title={t("groupStart")}>{tasks.start.map(task => <ListItem key={task.key} title={t(`start_${task.key}` as Key) as string} wrap
      leading={<RowIcon name={task.done ? "checkmark-circle" : "ellipse-outline"} tone={task.done ? "success" : "muted"} />}
      trailing={task.done ? <T variant="small" color={theme.success}>{t("done")}</T> : plus(task.credits)} />)}</ListGroup>
    <ListGroup title={t("groupEveryday")}>{tasks.everyday.map(task => <ListItem key={task.key} title={t(`everyday_${task.key}` as Key) as string} wrap
      subtitle={[t("everydayLine", { credits: task.credits, used: task.used, limit: task.limit, per: task.per }), task.waiting ? t("waiting", { n: task.waiting }) : ""].filter(Boolean).join(" · ")}
      leading={<RowIcon name="sparkles-outline" />} />)}</ListGroup>
    <ListGroup title={t("groupMilestones")}>{tasks.milestones.map(task => {
      const next = task.steps.find(step => !step.done);
      return <ListItem key={task.key} title={t(`milestone_${task.key}` as Key) as string} wrap leading={<RowIcon name="flag-outline" />}
        subtitle={next ? t("milestoneNext", { count: task.count, at: next.at, credits: next.credits }) : t("milestoneDone", { count: task.count })} />;
    })}</ListGroup>
  </>;
}
