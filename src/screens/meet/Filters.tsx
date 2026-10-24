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
import { useT } from "../../i18n";
import { useDietText } from "../../components/food/DietLabels";
export function MeetFiltersScreen() {
  const t = useT("social"), tc = useT("common");
  return <Screen title={t("peopleFilters")} backTo="/social"
    headerAction={<Button label={tc("done")} variant="link" onPress={() => goBack("/social")} />}><Filters /></Screen>;
}
function Group({ label, icon, checks = false, children }: PropsWithChildren<{ label: string; icon: IconName; checks?: boolean }>) {
  return <FilterSection title={label} icon={icon}><Chips label={label} multiple={checks}>{children}</Chips></FilterSection>;
}
/** Each choice saves on this device and applies immediately. */
function Filters() {
  const { network, commit, ready } = useMeet(), [busy, setBusy] = useState(false), locked = useRef(false);
  const filters = network.filters, disabled = busy || !ready, { theme } = usePreferences(), t = useT("social"), diet = useDietText();
  const change = async (patch: Partial<MeetFilters>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { await commit({ type: "filters", filters: { ...filters, ...patch } }); } finally { locked.current = false; setBusy(false); }
  };
  const many = (key: "religions" | "languages" | "hobbies", value: string) => void change({ [key]: filters[key].includes(value) ? filters[key].filter(v => v !== value) : [...filters[key], value] });
  return <>
    <Group label={t("hereFor")} icon="hand-left-outline">{(["Any", ...hereForOptions.map(o => o.id)] as const).map(id =>
      <Chip compact key={id} label={id === "Any" ? t("anyone") : t("optHereFor", { value: id })} role="radio" disabled={disabled} selected={filters.hereFor === id} onPress={() => void change({ hereFor: id })} />)}</Group>
    <Group label={t("filterAge")} icon="person-outline" checks>{ageBands.map(band => <Chip compact key={band} label={t("optAge", { value: band })} role="checkbox" disabled={disabled} selected={filters.ages.includes(band)}
      onPress={() => void change({ ages: filters.ages.includes(band) ? filters.ages.filter(b => b !== band) : [...filters.ages, band] })} />)}</Group>
    <Group label={t("religion")} icon="sunny-outline" checks>{religions.filter(r => r !== "Prefer not to say").map(r => <Chip compact key={r} label={t("optReligion", { value: r })} role="checkbox" disabled={disabled}
      selected={filters.religions.includes(r)} onPress={() => many("religions", r)} />)}</Group>
    <Group label={t("languages")} icon="language-outline" checks>{languageOptions.filter(l => l !== "Other").map(l => <Chip compact key={l} label={t("optLanguage", { value: l })} role="checkbox" disabled={disabled}
      selected={filters.languages.includes(l)} onPress={() => many("languages", l)} />)}</Group>
    <Group label={t("filterHobbies")} icon="bicycle-outline" checks>{[...new Set([...hobbyOptions.slice(0, 16), ...filters.hobbies])].map(h => <Chip compact key={h} label={t("optHobby", { value: h })} role="checkbox" disabled={disabled}
      selected={filters.hobbies.includes(h)} onPress={() => many("hobbies", h)} />)}</Group>
    <ListGroup><ListItem title={t("sameAreaTitle")} leading={<RowIcon name="location-outline" />}
      trailing={<ThemedSwitch label={t("sameArea")} value={filters.sameArea} disabled={disabled} onChange={sameArea => void change({ sameArea })} />} /></ListGroup>
    <Group label={t("filterGroupSize")} icon="people-outline">{(["Any", ...groupSizes] as const).map(size =>
      <Chip compact key={size} label={size === "Any" ? t("anySize") : t("peopleCount", { n: size })} role="radio" disabled={disabled} selected={filters.prefers === size} onPress={() => void change({ prefers: size })} />)}</Group>
    <Group label={t("diet")} icon="leaf-outline" checks>{(["Vegan", "Vegetarian"] as const).map(label => {
      const on = filters.diets.includes(label);
      return <Chip compact key={label} label={diet.name(label)} role="checkbox" disabled={disabled} selected={on}
        leading={<DietIcon diet={label} size={20} color={on ? theme.accent : theme.mutedForeground} />}
        onPress={() => void change({ diets: on ? filters.diets.filter(d => d !== label) : [...filters.diets, label] })} />;
    })}</Group>
    <Group label={t("usuallyFreeGroup")} icon="time-outline">{["Any", ...meetTimes].map(time =>
      <Chip compact key={time} label={time === "Any" ? t("anyTime") : t("optTime", { value: time })} role="radio" disabled={disabled} selected={filters.time === time} onPress={() => void change({ time })} />)}</Group>
    <Button label={t("resetFilters")} variant="link" disabled={disabled || !activePeopleFilters(filters)} onPress={() => void change(defaultMeetFilters())} />
  </>;
}
