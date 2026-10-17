import { useRef, useState, type PropsWithChildren } from "react";
import { Screen } from "../../components/Screen";
import { Chip, Chips } from "../../components/food/Controls";
import { FilterSection } from "../../components/BrowseControls";
import { Button, type IconName } from "../../components/ui";
import { goBack } from "../../utils/navigation";
import { useMeet } from "../../hooks/useMeet";
import { defaultMeetFilters, groupSizes, meetTimes, type MeetFilters } from "../../types/meet";
import { activePeopleFilters } from "./Home";
export function MeetFiltersScreen() {
  return <Screen title="People filters" contentStyle={{ paddingHorizontal: 12 }} backTo="/social"
    headerAction={<Button label="Done" variant="link" onPress={() => goBack("/social")} />}><Filters /></Screen>;
}
function Group({ label, icon, checks = false, children }: PropsWithChildren<{ label: string; icon: IconName; checks?: boolean }>) {
  return <FilterSection title={label} icon={icon}><Chips label={label} multiple={checks}>{children}</Chips></FilterSection>;
}
/** Each choice saves on this device and applies immediately. */
function Filters() {
  const { network, commit, ready } = useMeet(), [busy, setBusy] = useState(false), locked = useRef(false);
  const filters = network.filters, disabled = busy || !ready;
  const change = async (patch: Partial<MeetFilters>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await commit({ type: "filters", filters: { ...filters, ...patch } }); } finally { locked.current = false; setBusy(false); }
  };
  return <>
    <Group label="Group size" icon="people-outline">{(["Any", ...groupSizes] as const).map(size =>
      <Chip compact key={size} label={size === "Any" ? "Any size" : size + " people"} role="radio" disabled={disabled} selected={filters.prefers === size} onPress={() => void change({ prefers: size })} />)}</Group>
    <Group label="Diet" icon="leaf-outline">{(["All", "Vegan", "Vegetarian"] as const).map(diet =>
      <Chip compact key={diet} label={diet === "All" ? "All diets" : diet} role="radio" disabled={disabled} selected={filters.diet === diet} onPress={() => void change({ diet })} />)}</Group>
    <Group label="Dietary practice" icon="nutrition-outline" checks><Chip compact label="No five pungent (五辛)" icon="leaf-outline" role="checkbox" disabled={disabled} selected={filters.fivePungentFree}
      onPress={() => void change({ fivePungentFree: !filters.fivePungentFree })} /></Group>
    <Group label="Usually free" icon="time-outline">{["Any", ...meetTimes].map(time =>
      <Chip compact key={time} label={time === "Any" ? "Any time" : time} role="radio" disabled={disabled} selected={filters.time === time} onPress={() => void change({ time })} />)}</Group>
    {activePeopleFilters(filters) && <Button label="Clear Filters" variant="link" disabled={disabled} onPress={() => void change(defaultMeetFilters())} />}
  </>;
}
