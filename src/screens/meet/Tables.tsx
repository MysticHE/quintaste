import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Chip, EmptyState, HorizontalChips } from "../../components/food/Controls";
import { TableRow } from "../../components/social/TableCards";
import { openSocial } from "../../components/social/Shared";
import { RemoteStatus } from "../../components/CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { tables, tablesKey } from "../../services/social-api";
import { planningAreaByCode } from "../../utils/planning-area";

const days = [{ id: null, label: "Any day" }, { id: "today", label: "Today" }, { id: "week", label: "This week" }, { id: "weekend", label: "Weekend" }] as const;
type Day = typeof days[number]["id"];
/** Every open table members have started; an area from Nearby narrows the list until cleared. */
export function TablesView({ query, area }: { query: string; area: string | null }) {
  const [day, setDay] = useState<Day>(null), search = useDebounced(query), key = tablesKey(search, { area, day });
  const remote = useRemote(key, signal => tables(key, signal), 30000), items = remote.data?.items ?? [];
  const areaName = area ? planningAreaByCode.get(area)?.name ?? area : "";
  return <>
    <HorizontalChips bleed>
      {area && <Chip label={areaName} icon="close" a11y={"Showing " + areaName + ". Clear area"} selected onPress={() => router.setParams({ area: undefined })} />}
      {days.map(option => <Chip key={option.label} label={option.label} role="radio" compact selected={day === option.id} onPress={() => setDay(option.id)} />)}
    </HorizontalChips>
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social" />
    {remote.data && (items.length ? <View style={{ gap: 10 }}>{items.map(t => <TableRow key={t.id} table={t} />)}</View>
      : <EmptyState title={search.trim() || area || day ? "No Matching Tables" : "No Tables Yet"} text="" icon="restaurant-outline"
        action="Start A Table" onPress={() => openSocial("/table/new" + (area ? "?area=" + area : ""))} />)}
  </>;
}
