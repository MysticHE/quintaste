import { View } from "react-native";
import type { ShoppingRow } from "../../utils/shopping";
import { IconButton } from "../food/Controls";
import { T, common } from "../ui";
import { CheckRow } from "./CheckRow";

/** Rows tick off only; removal is "Clear ticked" or, in By Recipe view, one control per recipe section. */
export function ShoppingSection({ title, rows, recipeName, disabled, onToggle, onRemoveSection }: {
  title: string; rows: ShoppingRow[]; recipeName: (id: string) => string; disabled: boolean;
  onToggle: (row: ShoppingRow) => void; onRemoveSection?: () => void;
}) {
  return <View style={{ gap: 2 }}>
    <View style={[common.row, { minHeight: onRemoveSection ? 48 : undefined }]}>
      <T style={[common.bold, common.flex]} accessibilityRole="header">{title}</T>
      {onRemoveSection && <IconButton label={"Remove " + title + " from Shopping"} icon="trash-outline" disabled={disabled} onPress={onRemoveSection} />}
    </View>
    {rows.map(row => <CheckRow key={row.key} strike label={row.text} spoken={row.spoken} checked={row.checked} disabled={disabled} onPress={() => onToggle(row)}
      caption={row.ids.length > 1 ? "Combined from " + row.recipeIds.map(recipeName).join(" + ") : undefined} />)}
  </View>;
}
