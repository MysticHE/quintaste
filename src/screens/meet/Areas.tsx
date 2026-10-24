import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, T, common } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { AreaMap, areaMapCredit } from "../../components/areas/AreaMap";
import { Screen } from "../../components/Screen";
import { MemberGate } from "../../components/social/MeetUI";
import { useRemote } from "../../hooks/useRemote";
import { areaSnapshot, myAreas } from "../../services/areas-api";
import { tables, tablesKey } from "../../services/social-api";
import { formatSgShort } from "../../utils/sg-datetime";
import { planningAreaByCode } from "../../utils/planning-area";
import type { AreaBand, AreaLayer } from "../../types/areas";
import { useLanguage, useT, type Language } from "../../i18n";
import { formatDay } from "../../utils/day";

// The switch picks the map layer (everyone); "Your areas" below is the member's own Home and Work.
const layers = [{ id: "home", label: "layerLive" }, { id: "work", label: "layerWork" }] as const;
const rank: Record<AreaBand, number> = { "100+": 4, "50+": 3, "20+": 2, "10+": 1 };
const weekDate = (week: string, language: Language) => language === "zh" ? formatDay(week, language)
  : new Date(week + "T00:00:00+08:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
const editPlace = (layer: AreaLayer) => router.push({ pathname: "/location-place", params: { kind: layer } });

/** Open tables in this area this week, each opening its table page. */
function AreaTables({ area }: { area: string }) {
  const key = tablesKey("", { area, day: "week" }), remote = useRemote(key, signal => tables(key, signal)), items = remote.data?.items ?? [];
  const t = useT("social"), language = useLanguage();
  if (!items.length) return null;
  return <ListGroup title={t("tablesThisWeek", { n: items.length })}>{items.slice(0, 3).map(table =>
    <ListItem key={table.id} title={table.place?.name ?? table.venue} subtitle={formatSgShort(table.starts, language) + " · " + t("heldOf", { held: table.held, size: table.size })}
      onPress={() => router.push(("/social/table/" + table.id) as never)} />)}</ListGroup>;
}
/** The Areas map, opened from Nearby. */
export function MeetAreasScreen() {
  return <Screen title={useT("social")("areas")} backTo="/social"><MemberGate returnTo="/social/areas"><AreasView query="" /></MemberGate></Screen>;
}
/** Where members live and work, by planning area. Only weekly bands of 10 or more are shown. */
export function AreasView({ query }: { query: string }) {
  const [layer, setLayer] = useState<AreaLayer>("home"), [selected, setSelected] = useState<string | null>(null), t = useT("social"), language = useLanguage();
  const layerOptions = useMemo(() => layers.map(option => ({ ...option, label: t(option.label) })), [t]);
  const snapshot = useRemote("/api/areas", areaSnapshot), mine = useRemote("/api/areas/me", myAreas);
  const bands = useMemo(() => new Map((snapshot.data?.[layer] ?? []).map(item => [item.area, item.band])), [snapshot.data, layer]);
  const other = useMemo(() => new Map((snapshot.data?.[layer === "home" ? "work" : "home"] ?? []).map(item => [item.area, item.band])), [snapshot.data, layer]);
  const own = mine.data?.[layer]?.area ?? null, area = selected ? planningAreaByCode.get(selected) : undefined;
  const select = useCallback((code: string) => setSelected(current => current === code ? null : code), []);
  const search = query.trim().toLowerCase();
  const active = [...bands].map(([code, band]) => ({ area: planningAreaByCode.get(code), band }))
    .filter((item): item is { area: NonNullable<typeof item.area>; band: AreaBand } => !!item.area && item.area.name.toLowerCase().includes(search))
    .sort((a, b) => rank[b.band] - rank[a.band] || a.area.name.localeCompare(b.area.name));
  const status = (code: string | null, from: Map<string, AreaBand>) => !code ? t("notShared") : from.get(code) ?? t("notEnoughYet");
  return <>
    <SegmentedTabs options={layerOptions} value={layer} onChange={value => { setLayer(value); setSelected(null); }} label={t("mapLayer")} />
    <RemoteStatus remote={snapshot} icon="map-outline" returnTo="/social" />
    {snapshot.data && <>
      <AreaMap layer={layer} bands={bands} mine={own} selected={selected} onSelect={select} />
      <T variant="caption" muted>{(snapshot.data.week ? t("weekOf", { date: weekDate(snapshot.data.week, language) }) : t("firstUpdate")) + " · " + areaMapCredit}</T>
    </>}
    {area && <Card style={common.stack}>
      <View style={common.spread}><View style={common.flex}><T variant="subtitle" accessibilityRole="header">{area.name}</T><T variant="small" muted>{area.region}</T></View>
        {area.code === own && <StatusPill label={t(layer === "home" ? "yourHome" : "yourWork")} tone="accent" />}</View>
      <View style={[common.row, { gap: 8, flexWrap: "wrap" }]}>
        <StatusPill label={t("liveHere", { band: (layer === "home" ? bands : other).get(area.code) ?? t("notEnoughYet") })} />
        <StatusPill label={t("workHere", { band: (layer === "work" ? bands : other).get(area.code) ?? t("notEnoughYet") })} />
      </View>
      <AreaTables area={area.code} />
      <Button label={t("startTableHere")} icon="restaurant-outline" variant="secondary"
        onPress={() => router.push({ pathname: "/social/table/[id]", params: { id: "new", area: area.code } })} />
    </Card>}
    <ListGroup title={t("yourAreas")}>
      {(["home", "work"] as const).map(kind => {
        const code = mine.data?.[kind]?.area ?? null, name = code ? planningAreaByCode.get(code)?.name : undefined;
        return <ListItem key={kind} title={t(kind)} subtitle={name ?? t("notShared")} leading={<RowIcon name={kind === "home" ? "home-outline" : "briefcase-outline"} tone={code ? "accent" : "muted"} />}
          trailing={code ? <StatusPill label={status(code, kind === layer ? bands : other)} /> : undefined} onPress={() => editPlace(kind)} />;
      })}
    </ListGroup>
    {snapshot.data && (active.length ? <ListGroup title={t("mostActive")}>{active.map(item => <ListItem key={item.area.code} title={item.area.name} subtitle={item.area.region}
      trailing={<StatusPill label={item.band} tone={item.band === "10+" || item.band === "20+" ? "muted" : "accent"} />} onPress={() => select(item.area.code)} />)}</ListGroup>
      : <EmptyState title={t(search ? "noMatchingAreas" : "noAreasYet")} text="" icon="map-outline"
        action={!search && !own ? t("countMeIn") : undefined} onPress={() => editPlace(layer)} />)}
  </>;
}
