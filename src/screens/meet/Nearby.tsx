import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Button, T, common } from "../../components/ui";
import { HorizontalChips } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { useMinuteClock } from "../../components/food/Timers";
import { AreaCard, AreaRow } from "../../components/social/AreaCard";
import { TableChip } from "../../components/social/TableCards";
import { ProfileRow, profileState, useSocialMe } from "../../components/social/MeetUI";
import { openSocial } from "../../components/social/Shared";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { nearby, places, placesByIdKey, tables, tablesKey } from "../../services/social-api";
import type { NearbyArea } from "../../types/community";
import { useT } from "../../i18n";

/** Work leads on weekdays and Home on weekends (Singapore time). */
function ordered(areas: NearbyArea[], now: number) {
  const day = new Date(now + 8 * 3600000).getUTCDay(), weekend = day === 0 || day === 6;
  return [...areas].sort((a, b) => (a.layer === (weekend ? "home" : "work") ? -1 : 0) - (b.layer === (weekend ? "home" : "work") ? -1 : 0));
}
/** Your areas, the spots people there usually eat at, and tables coming up nearby. */
export function NearbyView({ query }: { query: string }) {
  const now = useMinuteClock(), me = useSocialMe().data?.profile, [lead, setLead] = useState<string | null>(null), t = useT("social");
  const remote = useRemote("/api/social/nearby", nearby), areas = ordered(remote.data?.areas ?? [], now);
  const first = areas.find(a => a.layer + a.area === lead) ?? areas[0], rest = areas.filter(a => a !== first);
  const ids = [...new Set(areas.flatMap(a => a.spots.map(s => s.id)))], placesKey = placesByIdKey(ids);
  const spotPlaces = useRemote(placesKey, signal => places(placesKey!, signal)), byId = new Map((spotPlaces.data?.items ?? []).map(p => [p.id, p]));
  const key = tablesKey(query, { day: "week" }), upcoming = useRemote(key, signal => tables(key, signal), 60000);
  const mine = new Set(areas.map(a => a.area)), list = (upcoming.data?.items ?? []).filter(t => !mine.size || (t.areaCode && mine.has(t.areaCode)));
  return <>
    {me && profileState(me).id !== "open" && <ListGroup><ProfileRow profile={me} /></ListGroup>}
    <RemoteStatus remote={remote} icon="location-outline" returnTo="/social" />
    {remote.data && !areas.length && <FirstRunState icon="location-outline" title={t("seeWhoEats")} text={t("countArea")}
      action={{ label: t("countMeIn"), icon: "add", onPress: () => router.push("/private-places") }} />}
    {first && <AreaCard area={first} places={byId} />}
    {rest.map(a => <ListGroup key={a.layer}><AreaRow area={a} onPress={() => setLead(a.layer + a.area)} /></ListGroup>)}
    {!!list.length && <View style={{ gap: 8 }}>
      <View style={common.spread}><T style={common.bold} accessibilityRole="header">{t("tablesNearWeek")}</T>
        <Button label={t("seeAll")} variant="link" onPress={() => router.setParams({ tab: "tables" })} /></View>
      <HorizontalChips bleed>{list.slice(0, 8).map(t => <TableChip key={t.id} table={t} />)}</HorizontalChips>
    </View>}
    {remote.data && <ListGroup><ListItem title={t("showMap")} leading={<RowIcon name="map-outline" />} onPress={() => openSocial("/areas")} /></ListGroup>}
  </>;
}
