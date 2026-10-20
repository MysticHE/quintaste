import { View } from "react-native";
import { Chip, HorizontalChips } from "../food/Controls";
import { Field } from "../ui";
import { areas } from "../../data/areas";
import { useFood } from "../../state/Food";
import { planningAreaFor } from "../../utils/planning-area";
import type { PrivatePlaceKind } from "../../types/food";

/** Singapore area names sellers and buyers pick from, so a shop's area and a buyer's filter use the same words. */
export const marketAreas = [...new Set(areas.map(area => area.name).filter(name => name !== "Singapore"))].sort();
const matches = (text: string) => {
  const term = text.trim().toLowerCase();
  if (!term || marketAreas.some(name => name.toLowerCase() === term)) return [];
  return marketAreas.filter(name => name.toLowerCase().startsWith(term)).concat(marketAreas.filter(name => !name.toLowerCase().startsWith(term) && name.toLowerCase().includes(term))).slice(0, 8);
};
/** The planning area of the member's saved Home or Work place, worked out on the device; only the area name is ever sent. */
export function useNearAreas() {
  const { doc } = useFood();
  return (["home", "work"] as PrivatePlaceKind[]).flatMap(kind => {
    const point = doc.privatePlaces.find(place => place.kind === kind)?.point, name = point ? planningAreaFor(point.latitude, point.longitude)?.name : undefined;
    return name ? [{ kind, name, label: kind === "home" ? "Near Home" : "Near Work" }] : [];
  });
}
/** An area text field with matching Singapore area names under it; `near` adds Near Home and Near Work. */
export function AreaField({ label, value, onChange, placeholder, near = false, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; near?: boolean; disabled?: boolean;
}) {
  const nearby = useNearAreas(), suggestions = matches(value);
  return <View style={{ gap: 6 }}>
    <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} maxLength={60} editable={!disabled} />
    {(suggestions.length > 0 || (near && nearby.length > 0)) && <HorizontalChips>
      {near && nearby.map(area => <Chip key={area.kind} compact icon={area.kind === "home" ? "home-outline" : "briefcase-outline"} label={area.label}
        role="radio" selected={value === area.name} disabled={disabled} onPress={() => onChange(value === area.name ? "" : area.name)} />)}
      {suggestions.map(name => <Chip key={name} compact icon="location-outline" label={name} disabled={disabled} onPress={() => onChange(name)} />)}
    </HorizontalChips>}
  </View>;
}
