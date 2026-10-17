import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, T, common } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { AreaMap, areaMapCredit } from "../../components/areas/AreaMap";
import { useRemote } from "../../hooks/useRemote";
import { areaSnapshot, myAreas } from "../../services/areas-api";
import { planningAreaByCode } from "../../utils/planning-area";
import type { AreaBand, AreaLayer } from "../../types/areas";

const layers = [{ id: "home", label: "Live here" }, { id: "work", label: "Work here" }] as const;
const rank: Record<AreaBand, number> = { "100+": 4, "50+": 3, "20+": 2, "10+": 1 };
const weekLabel = (week: string) => "Week of " + new Date(week + "T00:00:00+08:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" });
const editPlace = (layer: AreaLayer) => router.push({ pathname: "/location-place", params: { kind: layer } });

/** Where members live and work, by planning area. Only weekly bands of 10 or more are shown. */
export function AreasView({ query }: { query: string }) {
  const [layer, setLayer] = useState<AreaLayer>("home"), [selected, setSelected] = useState<string | null>(null);
  const snapshot = useRemote("/api/areas", areaSnapshot), mine = useRemote("/api/areas/me", myAreas);
  const bands = useMemo(() => new Map((snapshot.data?.[layer] ?? []).map(item => [item.area, item.band])), [snapshot.data, layer]);
  const other = useMemo(() => new Map((snapshot.data?.[layer === "home" ? "work" : "home"] ?? []).map(item => [item.area, item.band])), [snapshot.data, layer]);
  const own = mine.data?.[layer]?.area ?? null, area = selected ? planningAreaByCode.get(selected) : undefined;
  const select = useCallback((code: string) => setSelected(current => current === code ? null : code), []);
  const search = query.trim().toLowerCase();
  const active = [...bands].map(([code, band]) => ({ area: planningAreaByCode.get(code), band }))
    .filter((item): item is { area: NonNullable<typeof item.area>; band: AreaBand } => !!item.area && item.area.name.toLowerCase().includes(search))
    .sort((a, b) => rank[b.band] - rank[a.band] || a.area.name.localeCompare(b.area.name));
  const status = (code: string | null, from: Map<string, AreaBand>) => !code ? "Not shared" : from.get(code) ?? "Not enough yet";
  return <>
    <SegmentedTabs options={layers} value={layer} onChange={value => { setLayer(value); setSelected(null); }} label="Map layer" />
    <RemoteStatus remote={snapshot} icon="map-outline" returnTo="/social" />
    {snapshot.data && <>
      <AreaMap layer={layer} bands={bands} mine={own} selected={selected} onSelect={select} />
      <T variant="caption" muted>{(snapshot.data.week ? weekLabel(snapshot.data.week) : "First update this week") + " · " + areaMapCredit}</T>
    </>}
    {area && <Card style={common.stack}>
      <View style={common.spread}><View style={common.flex}><T variant="subtitle" accessibilityRole="header">{area.name}</T><T variant="small" muted>{area.region}</T></View>
        {area.code === own && <StatusPill label={layer === "home" ? "Your Home" : "Your Work"} tone="accent" />}</View>
      <View style={[common.row, { gap: 8, flexWrap: "wrap" }]}>
        <StatusPill label={"Live here · " + ((layer === "home" ? bands : other).get(area.code) ?? "Not enough yet")} />
        <StatusPill label={"Work here · " + ((layer === "work" ? bands : other).get(area.code) ?? "Not enough yet")} />
      </View>
      <Button label="Plan A Gathering Here" icon="people-outline" variant="secondary"
        onPress={() => router.push({ pathname: "/social/gathering/[id]", params: { id: "new", area: area.name } })} />
    </Card>}
    <ListGroup title="Your Areas">
      {(["home", "work"] as const).map(kind => {
        const code = mine.data?.[kind]?.area ?? null, name = code ? planningAreaByCode.get(code)?.name : undefined;
        return <ListItem key={kind} title={kind === "home" ? "Home" : "Work"} subtitle={name ?? "Not shared"} leading={<RowIcon name={kind === "home" ? "home-outline" : "briefcase-outline"} tone={code ? "accent" : "muted"} />}
          trailing={code ? <StatusPill label={status(code, kind === layer ? bands : other)} /> : undefined} onPress={() => editPlace(kind)} />;
      })}
    </ListGroup>
    {snapshot.data && (active.length ? <ListGroup title="Active Areas">{active.map(item => <ListItem key={item.area.code} title={item.area.name} subtitle={item.area.region}
      trailing={<StatusPill label={item.band} tone={item.band === "10+" || item.band === "20+" ? "muted" : "accent"} />} onPress={() => select(item.area.code)} />)}</ListGroup>
      : <EmptyState title={search ? "No Matching Areas" : "No Areas With 10+ Members Yet"} text="" icon="map-outline"
        action={!search && !own ? "Count Me In" : undefined} onPress={() => editPlace(layer)} />)}
  </>;
}
