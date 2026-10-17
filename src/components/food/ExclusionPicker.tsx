import { View } from "react-native";
import { alliums, animalExclusions, exclusionPresets, otherExclusions, traditionExclusions, type Exclusion } from "../../config/preferences";
import { T, common } from "../ui";
import { Chip, Chips } from "./Controls";
import { titleCaseLabel } from "../../utils/ui-label";

export function ExclusionPicker({ value, onChange }: { value: Exclusion[]; onChange: (value: Exclusion[]) => void }) {
  const toggle = (item: Exclusion) => onChange(value.includes(item) ? value.filter(entry => entry !== item) : [...value, item]);
  const group = (title: string, items: readonly Exclusion[]) => <View style={common.stack}>
    <T style={common.bold} accessibilityRole="header">{title}</T>
    <Chips>{items.map(item => <Chip key={item} label={titleCaseLabel(item)} role="checkbox" selected={value.includes(item)} onPress={() => toggle(item)} />)}</Chips>
  </View>;
  return <View style={common.stack}>
    <View style={common.stack}>
      <T style={common.bold} accessibilityRole="header">Presets</T>
      <Chips>{exclusionPresets.map(preset => {
        const selected = preset.items.every(item => value.includes(item));
        return <Chip key={preset.label} label={preset.label} icon="leaf-outline" role="checkbox" selected={selected}
          onPress={() => onChange(selected ? value.filter(item => !preset.items.includes(item)) : [...new Set([...value, ...preset.items])])} />;
      })}</Chips>
      <T variant="small" muted>Presets fill in the choices below. Practice varies, so adjust any item.</T>
    </View>
    {group("Non-vegan", animalExclusions)}
    <View style={common.stack}>
      <T style={common.bold} accessibilityRole="header">Alliums</T>
      <Chips>{alliums.map(item => <Chip key={item} label={item} role="checkbox" selected={value.includes(item)} onPress={() => toggle(item)} />)}</Chips>
    </View>
    {group("Other Ingredient Choices", [...otherExclusions, ...traditionExclusions])}
    <T variant="small" muted>These choices help you ask the right questions. They do not confirm that food is free from allergens or cross-contact.</T>
  </View>;
}
