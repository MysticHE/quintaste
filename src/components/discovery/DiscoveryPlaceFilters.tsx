import { FilterSection } from "../BrowseControls";
import { DiscoveryToggle } from "./DiscoveryToggle";
import type { ExploreFilters } from "../../types/food";
import type { FilterChange } from "../../hooks/useDiscoverySettings";

export function DiscoveryPlaceFilters({ filters, change, disabled }: {
  filters: ExploreFilters; change: (value: FilterChange) => void; disabled: boolean;
}) {
  return <FilterSection title="More options" icon="options-outline">
      <DiscoveryToggle label="Saved places only" checked={filters.savedOnly} disabled={disabled}
        onPress={() => change(current => ({ ...current, savedOnly: !current.savedOnly }))} />
  </FilterSection>;
}
