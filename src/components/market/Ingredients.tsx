import { useState } from "react";
import { View } from "react-native";
import { CheckRow } from "../recipes/CheckRow";
import { Chip } from "../food/Controls";
import { Button, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { SegmentedTabs } from "../SegmentedTabs";
import { ingredientKeys, marketIngredients, readIngredientInfo, type IngredientInfo, type MarketIngredient } from "../../config/market-ingredients";
import { useT } from "../../i18n";
const commonIngredients: readonly MarketIngredient[] = ["Eggs", "Dairy", "Peanuts", "Tree nuts", "Gluten", "Soy", "Sesame", "Honey"];
export function IngredientChoices({ value, onChange, disabled = false }: {
  value: MarketIngredient[]; onChange: (value: MarketIngredient[]) => void; disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false), t = useT("market");
  const choices = marketIngredients.filter(item => expanded || commonIngredients.includes(item) || value.includes(item));
  return <View style={{ gap: 4 }}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {choices.map(item => <Chip key={item} compact role="checkbox" label={t(ingredientKeys[item])} selected={value.includes(item)} disabled={disabled}
      onPress={() => onChange(value.includes(item) ? value.filter(tag => tag !== item) : [...value, item])} />)}
    </View><Button label={t(expanded ? "fewerIngredients" : "moreIngredients")} variant="link" disabled={disabled} onPress={() => setExpanded(!expanded)} />
  </View>;
}
export function IngredientCheck({ checked, label, onPress, disabled = false }: {
  checked: boolean; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <CheckRow size="small" label={label} checked={checked} onPress={onPress} disabled={disabled} />;
}
/** Declared tags as labels; "Seller-declared" keeps the source honest without a paragraph. */
export function IngredientSummary({ value, status = true }: { value?: IngredientInfo; status?: boolean }) {
  const info = readIngredientInfo(value), t = useT("market"), name = (tag: MarketIngredient) => t(ingredientKeys[tag]).toLowerCase();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {info.contains.map(tag => <StatusPill key={"c" + tag} label={t("containsTag", { name: name(tag) })} tone="warning" />)}
    {info.mayContain.map(tag => <StatusPill key={"m" + tag} label={t("mayContainTag", { name: name(tag) })} />)}
    {status && <StatusPill label={t(info.reviewed ? "sellerDeclared" : "notChecked")} tone={info.reviewed ? "muted" : "warning"} />}
  </View>;
}
/** Contains and May contain choices, kept apart; used for listings that already state their full ingredient text. */
export function AllergenEditor({ value, onChange, disabled }: { value: IngredientInfo; onChange: (next: IngredientInfo) => void; disabled: boolean }) {
  const [section, setSection] = useState<"contains" | "mayContain">("contains"), t = useT("market");
  const sections = [{ id: "contains", label: t("sectionContains") }, { id: "mayContain", label: t("sectionMayContain") }] as const;
  const other = section === "contains" ? "mayContain" : "contains";
  return <View style={{ gap: 8 }}>
    <View style={common.row}><SegmentedTabs options={sections} value={section} onChange={setSection} label={t("allergenTags")} /></View>
    <IngredientChoices value={value[section]} disabled={disabled} onChange={tags => onChange({ ...value, [section]: tags, [other]: value[other].filter(tag => !tags.includes(tag)) })} />
    <IngredientSummary value={{ ...value, reviewed: true }} status={false} />
  </View>;
}
