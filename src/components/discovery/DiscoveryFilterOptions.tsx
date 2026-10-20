import { StyleSheet } from "react-native";
import { FilterSection } from "../BrowseControls";
import { Chip, Chips } from "../food/Controls";
import { DietIcon } from "../food/DietIcon";
import { usePreferences } from "../../state/Preferences";
import type { ExploreFilters } from "../../types/food";
import type { PlaceLabel } from "../../types/discovery";
import type { FilterChange } from "../../hooks/useDiscoverySettings";
import type { LocationMode } from "../../utils/discovery-filters";
import { locationMode, placeLabelChoices, placeLabelsOf, toggleFilter } from "../../utils/discovery-filters";

export function DiscoveryFilterOptions({ filters, change, labels, selected, disabled, followingCustom = false, selectLocation }: {
  filters: ExploreFilters; change: (value: FilterChange) => void; labels: PlaceLabel[];
  selected: boolean; disabled: boolean; followingCustom?: boolean; selectLocation: (mode: LocationMode) => void;
}) {
  // Following a custom default place matches none of these choices, so none is shown as selected.
  const { theme } = usePreferences(), mode = followingCustom ? null : locationMode(filters);
  const locations: { mode: LocationMode; label: string; icon: "globe-outline" | "location-outline" | "home-outline" | "briefcase-outline" }[] = [
    { mode: "singapore", label: "Singapore", icon: "globe-outline" },
    { mode: "selected", label: "Current search", icon: "location-outline" },
    { mode: "home", label: "Near Home", icon: "home-outline" },
    { mode: "work", label: "Near Work", icon: "briefcase-outline" },
  ];
  return <>
    <FilterSection title="Diet" icon="leaf-outline">
      <Chips label="Diet" multiple><Chip label="Any" a11y="Any diet" compact role="checkbox" selected={!labels.length} disabled={disabled} onPress={() => change({ labels: [] })} />
        {placeLabelChoices.map(value => <Chip compact key={value} label={value} role="checkbox"
        leading={<DietIcon diet={value} color={labels.includes(value) ? theme.accent : theme.foreground} />}
        selected={labels.includes(value)} disabled={disabled} onPress={() => change({ labels: placeLabelsOf(toggleFilter(labels, value)) })} />)}</Chips>
    </FilterSection>
    <FilterSection title="Location" icon="location-outline">
      <Chips label="Search Around">{locations.filter(item => item.mode !== "selected" || selected || mode === "selected").map(item => <Chip key={item.mode} label={item.label} icon={item.icon} role="radio" compact style={s.locationChoice}
        disabled={disabled || item.mode === "selected" && !selected} selected={mode === item.mode}
        onPress={() => selectLocation(item.mode)} />)}</Chips>
    </FilterSection>
  </>;
}
const s = StyleSheet.create({
  locationChoice: { flexBasis: "48%", flexGrow: 1, paddingHorizontal: 4, gap: 4 },
});
