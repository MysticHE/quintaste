import { StyleSheet } from "react-native";
import { FilterSection } from "../BrowseControls";
import { Chip, Chips } from "../food/Controls";
import { DietIcon } from "../food/DietIcon";
import { DietLabelHelp, useDietText } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import type { ExploreFilters } from "../../types/food";
import type { PlaceLabel } from "../../types/discovery";
import type { FilterChange } from "../../hooks/useDiscoverySettings";
import type { LocationMode } from "../../utils/discovery-filters";
import { locationMode, placeLabelChoices, placeLabelsOf, toggleFilter } from "../../utils/discovery-filters";
import { useT } from "../../i18n";

export function DiscoveryFilterOptions({ filters, change, labels, selected, disabled, followingCustom = false, selectLocation, searchLayout = false }: {
  filters: ExploreFilters; change: (value: FilterChange) => void; labels: PlaceLabel[];
  selected: boolean; disabled: boolean; followingCustom?: boolean; selectLocation: (mode: LocationMode) => void; searchLayout?: boolean;
}) {
  // Following a custom default place matches none of these choices, so none is shown as selected.
  const { theme } = usePreferences(), dietText = useDietText(), mode = followingCustom ? null : locationMode(filters), t = useT("explore");
  const locations: { mode: LocationMode; label: string; icon: "globe-outline" | "location-outline" | "home-outline" | "briefcase-outline" }[] = [
    { mode: "singapore", label: t("singapore"), icon: "globe-outline" },
    { mode: "selected", label: t("currentSearch"), icon: "location-outline" },
    { mode: "home", label: t("nearHome"), icon: "home-outline" },
    { mode: "work", label: t("nearWork"), icon: "briefcase-outline" },
  ];
  return <>
    <FilterSection prominent={searchLayout} title={t("diet")} icon="leaf-outline">
      <Chips label={t("diet")} multiple><Chip label={t("any")} a11y={t("anyDiet")} compact={!searchLayout} role="checkbox" selected={!labels.length} disabled={disabled} onPress={() => change({ labels: [] })} />
        {(searchLayout ? [...placeLabelChoices].reverse() : placeLabelChoices).map(value => <Chip compact={!searchLayout} key={value} label={dietText.line(value)} role="checkbox"
        leading={<DietIcon diet={value} color={labels.includes(value) ? theme.accent : theme.foreground} />}
        selected={labels.includes(value)} disabled={disabled} onPress={() => change({ labels: placeLabelsOf(toggleFilter(labels, value)) })} />)}</Chips>
      <DietLabelHelp />
    </FilterSection>
    <FilterSection prominent={searchLayout} title={t("location")} icon="location-outline">
      <Chips label={t("searchAround")}>{locations.filter(item => searchLayout || item.mode !== "selected" || selected || mode === "selected").map(item => <Chip key={item.mode} label={item.label} icon={item.icon} role="radio" compact={!searchLayout} style={s.locationChoice}
        disabled={disabled || item.mode === "selected" && !selected} selected={mode === item.mode}
        onPress={() => selectLocation(item.mode)} />)}</Chips>
    </FilterSection>
  </>;
}
const s = StyleSheet.create({
  locationChoice: { flexBasis: "48%", flexGrow: 1, paddingHorizontal: 4, gap: 4 },
});
