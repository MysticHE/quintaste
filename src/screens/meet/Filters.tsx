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
import { ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { ageBands, hereForOptions, hobbyOptions, languageOptions, religions } from "../../config/social-profile";
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
  const many = (key: "religions" | "languages" | "hobbies", value: string) => void change({ [key]: filters[key].includes(value) ? filters[key].filter(v => v !== value) : [...filters[key], value] });
  return <>
    <Group label="Here for" icon="hand-left-outline">{(["Any", ...hereForOptions.map(o => o.id)] as const).map(id =>
      <Chip compact key={id} label={id === "Any" ? "Anyone" : hereForOptions.find(o => o.id === id)!.label} role="radio" disabled={disabled} selected={filters.hereFor === id} onPress={() => void change({ hereFor: id })} />)}</Group>
    <Group label="Age" icon="person-outline" checks>{ageBands.map(band => <Chip compact key={band} label={band} role="checkbox" disabled={disabled} selected={filters.ages.includes(band)}
      onPress={() => void change({ ages: filters.ages.includes(band) ? filters.ages.filter(b => b !== band) : [...filters.ages, band] })} />)}</Group>
    <Group label="Religion" icon="sunny-outline" checks>{religions.filter(r => r !== "Prefer not to say").map(r => <Chip compact key={r} label={r} role="checkbox" disabled={disabled}
      selected={filters.religions.includes(r)} onPress={() => many("religions", r)} />)}</Group>
    <Group label="Languages" icon="language-outline" checks>{languageOptions.filter(l => l !== "Other").map(l => <Chip compact key={l} label={l} role="checkbox" disabled={disabled}
      selected={filters.languages.includes(l)} onPress={() => many("languages", l)} />)}</Group>
    <Group label="Hobbies" icon="bicycle-outline" checks>{[...new Set([...hobbyOptions.slice(0, 16), ...filters.hobbies])].map(h => <Chip compact key={h} label={h} role="checkbox" disabled={disabled}
      selected={filters.hobbies.includes(h)} onPress={() => many("hobbies", h)} />)}</Group>
    <ListGroup><ListItem title="Same Area As Me" leading={<RowIcon name="location-outline" />}
      trailing={<ThemedSwitch label="Same area as me" value={filters.sameArea} disabled={disabled} onChange={sameArea => void change({ sameArea })} />} /></ListGroup>
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
