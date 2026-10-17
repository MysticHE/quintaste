import { StyleSheet } from "react-native";
import { FilterSection } from "../BrowseControls";
import { Chip, Chips } from "../food/Controls";
import { DietIcon } from "../food/DietIcon";
import { DiscoveryToggle } from "./DiscoveryToggle";
import { usePreferences } from "../../state/Preferences";
import type { ExploreFilters } from "../../types/food";
import type { FilterChange } from "../../hooks/useDiscoverySettings";
import type { LocationMode } from "../../utils/discovery-filters";
import { locationMode, toggleFilter } from "../../utils/discovery-filters";

export function DiscoveryFilterOptions({ filters, change, diets, selected, disabled, followingCustom = false, selectLocation }: {
  filters: ExploreFilters; change: (value: FilterChange) => void; diets: ("Vegetarian" | "Vegan")[];
  selected: boolean; disabled: boolean; followingCustom?: boolean; selectLocation: (mode: LocationMode) => void;
}) {
  // Following a custom default place matches none of these choices, so none is shown as selected.
  const { theme } = usePreferences(), mode = followingCustom ? null : locationMode(filters);
  // Every published place is Vegetarian or Vegan, so both together match the same places as Any diet and show as Any diet.
  const restricted = anyDiet(diets);
  const locations: { mode: LocationMode; label: string; icon: "globe-outline" | "location-outline" | "home-outline" | "briefcase-outline" }[] = [
    { mode: "singapore", label: "Singapore", icon: "globe-outline" },
    { mode: "selected", label: "Current search", icon: "location-outline" },
    { mode: "home", label: "Near Home", icon: "home-outline" },
    { mode: "work", label: "Near Work", icon: "briefcase-outline" },
  ];
  return <>
    <FilterSection title="Diet" icon="leaf-outline">
      <Chips label="Diet" multiple><Chip label="Any diet" compact role="checkbox" selected={!restricted.length} disabled={disabled} onPress={() => change({ diets: [], diet: null })} />
        {(["Vegetarian", "Vegan"] as const).map(value => <Chip compact key={value} label={value} role="checkbox"
        leading={<DietIcon diet={value} color={restricted.includes(value) ? theme.accent : theme.foreground} />}
        selected={restricted.includes(value)} disabled={disabled} onPress={() => change({ diets: anyDiet(toggleFilter(restricted, value)), diet: null })} />)}</Chips>
      <DiscoveryToggle label="Allium-free" accessibilityLabel="Allium-free venue claims" checked={filters.noAlliums} disabled={disabled}
        onPress={() => change(current => ({ ...current, noAlliums: !current.noAlliums }))} />
    </FilterSection>
    <FilterSection title="Location" icon="location-outline">
      <Chips label="Search Around">{locations.map(item => <Chip key={item.mode} label={item.label} icon={item.icon} role="radio" compact style={s.locationChoice}
        disabled={disabled || item.mode === "selected" && !selected} selected={mode === item.mode}
        onPress={() => selectLocation(item.mode)} />)}</Chips>
    </FilterSection>
  </>;
}
const anyDiet = (diets: ("Vegetarian" | "Vegan")[]) => diets.length > 1 ? [] : diets;
const s = StyleSheet.create({
  locationChoice: { flexBasis: "48%", flexGrow: 1, paddingHorizontal: 4, gap: 4 },
});
