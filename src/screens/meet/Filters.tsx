import { useRef, useState, type PropsWithChildren } from "react";
import { Screen } from "../../components/Screen";
import { Chip, Chips } from "../../components/food/Controls";
import { FilterSection } from "../../components/BrowseControls";
import { Button, type IconName } from "../../components/ui";
import { goBack } from "../../utils/navigation";
import { useMeet } from "../../hooks/useMeet";
import { defaultMeetFilters, groupSizes, meetTimes, type MeetFilters } from "../../types/meet";
import { activePeopleFilters } from "./Home";
import { DietIcon } from "../../components/food/DietIcon";
import { usePreferences } from "../../state/Preferences";
export function MeetFiltersScreen() {
  return <Screen title="People filters" backTo="/social"
    headerAction={<Button label="Done" variant="link" onPress={() => goBack("/social")} />}><Filters /></Screen>;
}
function Group({ label, icon, checks = false, children }: PropsWithChildren<{ label: string; icon: IconName; checks?: boolean }>) {
  return <FilterSection title={label} icon={icon}><Chips label={label} multiple={checks}>{children}</Chips></FilterSection>;
}
/** Each choice saves on this device and applies immediately. */
function Filters() {
  const { network, commit, ready } = useMeet(), [busy, setBusy] = useState(false), locked = useRef(false);
  const filters = network.filters, disabled = busy || !ready, { theme } = usePreferences();
  const change = async (patch: Partial<MeetFilters>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await commit({ type: "filters", filters: { ...filters, ...patch } }); } finally { locked.current = false; setBusy(false); }
  };
  return <>
    <Group label="Group size" icon="people-outline">{(["Any", ...groupSizes] as const).map(size =>
      <Chip compact key={size} label={size === "Any" ? "Any size" : size + " people"} role="radio" disabled={disabled} selected={filters.prefers === size} onPress={() => void change({ prefers: size })} />)}</Group>
    <Group label="Diet" icon="leaf-outline" checks>{(["Vegan", "Vegetarian"] as const).map(label => {
      const on = filters.diets.includes(label);
      return <Chip compact key={label} label={label} role="checkbox" disabled={disabled} selected={on}
        leading={<DietIcon diet={label} size={20} color={on ? theme.accent : theme.mutedForeground} />}
        onPress={() => void change({ diets: on ? filters.diets.filter(d => d !== label) : [...filters.diets, label] })} />;
    })}</Group>
    <Group label="Usually free" icon="time-outline">{["Any", ...meetTimes].map(time =>
      <Chip compact key={time} label={time === "Any" ? "Any time" : time} role="radio" disabled={disabled} selected={filters.time === time} onPress={() => void change({ time })} />)}</Group>
    <Button label="Reset filters" variant="link" disabled={disabled || !activePeopleFilters(filters)} onPress={() => void change(defaultMeetFilters())} />
  </>;
}
