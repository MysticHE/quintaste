import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { Button, T, common } from "../ui";
import { AreaField } from "./AreaField";
import { ThemedSwitch } from "../GroupedList";
import { FilterSection } from "../BrowseControls";
import { IngredientChoices } from "./Ingredients";
import { MarketModal } from "./MarketChrome";
import { kindKeys, marketLabels, practiceKeys, practices, shopCategories } from "../../config/market";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import { defaultShopFilter, type ShopFilter } from "../../types/community";

const sorts: ShopFilter["sort"][] = ["Newest", "Soonest", "Lowest first", "Highest first"];
const sortKeys: Record<ShopFilter["sort"], MarketKey> = { "Newest": "sortNewest", "Soonest": "sortSoonest", "Lowest first": "sortLowest", "Highest first": "sortHighest" };
const modeKeys: Record<ShopFilter["mode"], MarketKey> = { Any: "anyMethod", meetup: "meetup", delivery: "delivery" };
const toggle = <T,>(list: T[], item: T) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
export function MarketFilters({ value, onApply, onClose }: { value: ShopFilter; onApply: (next: ShopFilter) => void; onClose: () => void }) {
  const { theme } = usePreferences(), [draft, setDraft] = useState(value), set = (patch: Partial<ShopFilter>) => setDraft(current => ({ ...current, ...patch }));
  const t = useT("market"), tc = useT("common"), diet = useDietText();
  return <MarketModal visible onClose={onClose} label={t("marketFilters")}><ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
    <FilterSection title={t("category")} icon="grid-outline"><Chips label={t("marketCategory")}>
      <Chip compact label={t("allCategories")} icon="grid-outline" role="radio" selected={draft.category === "All"} onPress={() => set({ category: "All" })} />
      {shopCategories.map(({ id, icon, label }) => <Chip key={id} compact label={t(label)} icon={icon} role="radio" selected={draft.category === id} onPress={() => set({ category: id })} />)}
    </Chips></FilterSection>
    <FilterSection title={t("sortBy")} icon="swap-vertical-outline"><Chips label={t("sort")}>{sorts.map(sort =>
      <Chip key={sort} label={t(sortKeys[sort])} role="radio" compact selected={draft.sort === sort} onPress={() => set({ sort })} />)}</Chips></FilterSection>
    <FilterSection title={t("diet")} icon="leaf-outline">
      <Chips label={t("dietLabelsGroup")} multiple>{marketLabels.map(label =>
        <Chip key={label} label={diet.name(label)} role="checkbox" compact selected={draft.labels.includes(label)}
          leading={<DietIcon diet={label} size={18} color={draft.labels.includes(label) ? theme.accent : theme.foreground} />} onPress={() => set({ labels: toggle(draft.labels, label) })} />)}</Chips>
      <Chips label={t("practices")} multiple>{practices.filter(practice => practice !== "no-egg").map(practice =>
        <Chip key={practice} label={t(practiceKeys[practice])} role="checkbox" compact selected={draft.practices.includes(practice)} onPress={() => set({ practices: toggle(draft.practices, practice) })} />)}</Chips>
    </FilterSection>
    <FilterSection title={t("avoidIngredients")} icon="nutrition-outline"><IngredientChoices value={draft.exclude} onChange={exclude => set({ exclude })} /></FilterSection>
    <FilterSection title={t("collection")} icon="bag-handle-outline"><Chips label={t("collection")}>{(["Any", "meetup", "delivery"] as const).map(mode =>
      <Chip key={mode} label={t(modeKeys[mode])} role="radio" compact selected={draft.mode === mode} onPress={() => set({ mode })} />)}</Chips></FilterSection>
    <FilterSection title={t("foodType")} icon="restaurant-outline"><Chips label={t("type")}>{(["Any", "made", "prepacked"] as const).map(kind =>
      <Chip key={kind} label={t(kind === "Any" ? "allTypes" : kindKeys[kind])} role="radio" compact selected={draft.kind === kind} onPress={() => set({ kind })} />)}</Chips></FilterSection>
    <FilterSection title={t("locationAvailability")} icon="location-outline">
      <AreaField label={t("area")} value={draft.area} onChange={area => set({ area })} placeholder={t("anyArea")} near />
      <View style={common.spread}><T variant="small" style={[common.flex, { minWidth: 0 }]}>{t("openNow")}</T><ThemedSwitch label={t("openNow")} value={draft.available} onChange={available => set({ available })} /></View>
    </FilterSection>
  </ScrollView><View style={common.row}><View style={common.flex}><Button label={tc("reset")} variant="secondary" onPress={() => setDraft(defaultShopFilter())} /></View>
    <View style={common.flex}><Button label={t("showResults")} onPress={() => { onApply(draft); onClose(); }} /></View></View>
  </MarketModal>;
}
