import { FilterSection } from "../BrowseControls";
import { DiscoveryToggle } from "./DiscoveryToggle";
import type { ExploreFilters } from "../../types/food";
import type { FilterChange } from "../../hooks/useDiscoverySettings";
import { useT } from "../../i18n";

export function DiscoveryPlaceFilters({ filters, change, disabled }: {
  filters: ExploreFilters; change: (value: FilterChange) => void; disabled: boolean;
}) {
  const t = useT("explore");
  return <FilterSection title={t("moreOptionsSection")} icon="options-outline">
      <DiscoveryToggle label={t("savedPlacesOnly")} checked={filters.savedOnly} disabled={disabled}
        onPress={() => change(current => ({ ...current, savedOnly: !current.savedOnly }))} />
  </FilterSection>;
}
