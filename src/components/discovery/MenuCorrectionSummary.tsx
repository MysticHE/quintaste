import { View } from "react-native";
import { T, common } from "../ui";
import type { MenuChange } from "../../types/explore-local";
import { isMenuPrice } from "../../utils/menu-correction";

export function MenuCorrectionSummary({ change }: { change?: MenuChange }) {
  if (!change) return null;
  const labels = { add: "Add dish", edit: "Edit dish", remove: "Remove dish" };
  const price = change.price ? isMenuPrice(change.price) ? "S$" + Number(change.price).toFixed(2) : "Price incomplete" : "";
  return <View style={{ gap: 4 }} testID="menu-correction-summary">
    <T style={common.bold}>{labels[change.action]}</T>
    {change.action !== "add" && <T variant="small" muted>Listed: {change.originalName}
      {change.originalPrice ? " · " + change.originalPrice : ""}</T>}
    {change.action !== "remove" && <>
      <T>{change.name}{price ? " · " + price : ""}</T>
      {!!change.category && <T variant="small" muted>{change.category}</T>}
    </>}
  </View>;
}
