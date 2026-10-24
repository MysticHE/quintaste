import { View } from "react-native";
import { alliums, animalExclusions, exclusionNameKeys, exclusionPresets, otherExclusions, traditionExclusions, type Exclusion } from "../../config/preferences";
import { T, common } from "../ui";
import { Chip, Chips } from "./Controls";
import { useT } from "../../i18n";

export function ExclusionPicker({ value, onChange }: { value: Exclusion[]; onChange: (value: Exclusion[]) => void }) {
  const t = useT("me"), tc = useT("common");
  const toggle = (item: Exclusion) => onChange(value.includes(item) ? value.filter(entry => entry !== item) : [...value, item]);
  const group = (title: string, items: readonly Exclusion[]) => <View style={common.stack}>
    <T style={common.bold} accessibilityRole="header">{title}</T>
    <Chips>{items.map(item => <Chip key={item} label={tc(exclusionNameKeys[item])} role="checkbox" selected={value.includes(item)} onPress={() => toggle(item)} />)}</Chips>
  </View>;
  return <View style={common.stack}>
    <View style={common.stack}>
      <T style={common.bold} accessibilityRole="header">{t("presets")}</T>
      <Chips>{exclusionPresets.map(preset => {
        const selected = preset.items.every(item => value.includes(item));
        return <Chip key={preset.label} label={tc(preset.nameKey)} icon="leaf-outline" role="checkbox" selected={selected}
          onPress={() => onChange(selected ? value.filter(item => !preset.items.includes(item)) : [...new Set([...value, ...preset.items])])} />;
      })}</Chips>
    </View>
    {group(t("nonVegan"), animalExclusions)}
    {group(t("alliums"), alliums)}
    {group(t("otherIngredients"), [...otherExclusions, ...traditionExclusions])}
    <T variant="small" muted>{t("notAllergen")}</T>
  </View>;
}
