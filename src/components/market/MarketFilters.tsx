import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { DietIcon } from "../food/DietIcon";
import { Button, T, common } from "../ui";
import { AreaField } from "./AreaField";
import { ThemedSwitch } from "../GroupedList";
import { FilterSection } from "../BrowseControls";
import { IngredientChoices } from "./Ingredients";
import { MarketModal } from "./MarketChrome";
import { kindLabels, marketLabels, practiceLabels, practices, shopCategories } from "../../config/market";
import { usePreferences } from "../../state/Preferences";
import { defaultShopFilter, type ShopFilter } from "../../types/community";

const sorts: ShopFilter["sort"][] = ["Newest", "Soonest", "Lowest first", "Highest first"];
const toggle = <T,>(list: T[], item: T) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
export function MarketFilters({ value, onApply, onClose }: { value: ShopFilter; onApply: (next: ShopFilter) => void; onClose: () => void }) {
  const { theme } = usePreferences(), [draft, setDraft] = useState(value), set = (patch: Partial<ShopFilter>) => setDraft(current => ({ ...current, ...patch }));
  return <MarketModal visible onClose={onClose} label="Market filters"><ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
    <FilterSection title="Category" icon="grid-outline"><Chips label="Market category">
      <Chip compact label="All categories" icon="grid-outline" role="radio" selected={draft.category === "All"} onPress={() => set({ category: "All" })} />
      {shopCategories.map(({ id, icon }) => <Chip key={id} compact label={id} icon={icon} role="radio" selected={draft.category === id} onPress={() => set({ category: id })} />)}
    </Chips></FilterSection>
    <FilterSection title="Sort by" icon="swap-vertical-outline"><Chips label="Sort">{sorts.map(sort =>
      <Chip key={sort} label={sort === "Soonest" ? "Soonest collection" : sort === "Lowest first" ? "Price: low to high" : sort === "Highest first" ? "Price: high to low" : sort} role="radio" compact selected={draft.sort === sort} onPress={() => set({ sort })} />)}</Chips></FilterSection>
    <FilterSection title="Diet" icon="leaf-outline">
      <Chips label="Diet labels" multiple>{marketLabels.map(label =>
        <Chip key={label} label={label} role="checkbox" compact selected={draft.labels.includes(label)}
          leading={<DietIcon diet={label} size={18} color={draft.labels.includes(label) ? theme.accent : theme.foreground} />} onPress={() => set({ labels: toggle(draft.labels, label) })} />)}</Chips>
      <Chips label="Practices" multiple>{practices.filter(practice => practice !== "no-egg").map(practice =>
        <Chip key={practice} label={practiceLabels[practice]} role="checkbox" compact selected={draft.practices.includes(practice)} onPress={() => set({ practices: toggle(draft.practices, practice) })} />)}</Chips>
    </FilterSection>
    <FilterSection title="Avoid ingredients" icon="nutrition-outline"><IngredientChoices value={draft.exclude} onChange={exclude => set({ exclude })} /></FilterSection>
    <FilterSection title="Collection" icon="bag-handle-outline"><Chips label="Collection">{(["Any", "meetup", "delivery"] as const).map(mode =>
      <Chip key={mode} label={mode === "Any" ? "Any method" : mode === "meetup" ? "Meetup" : "Delivery"} role="radio" compact selected={draft.mode === mode} onPress={() => set({ mode })} />)}</Chips></FilterSection>
    <FilterSection title="Food type" icon="restaurant-outline"><Chips label="Type">{(["Any", "made", "prepacked"] as const).map(kind =>
      <Chip key={kind} label={kind === "Any" ? "All types" : kindLabels[kind]} role="radio" compact selected={draft.kind === kind} onPress={() => set({ kind })} />)}</Chips></FilterSection>
    <FilterSection title="Location & availability" icon="location-outline">
      <AreaField label="Area" value={draft.area} onChange={area => set({ area })} placeholder="Any area" near />
      <View style={common.spread}><T variant="small" style={[common.flex, { minWidth: 0 }]}>Open for orders now</T><ThemedSwitch label="Open for orders now" value={draft.available} onChange={available => set({ available })} /></View>
    </FilterSection>
  </ScrollView><View style={common.row}><View style={common.flex}><Button label="Reset" variant="secondary" onPress={() => setDraft(defaultShopFilter())} /></View>
    <View style={common.flex}><Button label="Show results" onPress={() => { onApply(draft); onClose(); }} /></View></View>
  </MarketModal>;
}
