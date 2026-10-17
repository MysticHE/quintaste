import { Pressable, View } from "react-native";
import { Icon } from "../ui";
import { usePreferences } from "../../state/Preferences";

export function ReviewStars({ value, onChange, disabled = false }: { value: number; onChange?: (value: number) => void; disabled?: boolean }) {
  const { theme } = usePreferences(), shown = Math.round(value * 2) / 2;
  return <View accessibilityRole={onChange ? "radiogroup" : "image"} accessibilityLabel={onChange ? "Your rating" : value + " out of 5 stars"}
    accessible={!onChange} style={{ flexDirection: "row", gap: 2 }}>
    {[1, 2, 3, 4, 5].map(star => onChange ? <Pressable key={star} accessibilityRole="radio" accessibilityLabel={star + (star === 1 ? " star" : " stars")}
      accessibilityState={{ checked: value === star, disabled }} disabled={disabled} onPress={() => onChange(star)}
      style={({ pressed }) => ({ width: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: value === star || pressed ? theme.accentSoft : theme.transparent })}>
      <Icon name={star <= value ? "star" : "star-outline"} size={28} color={theme.accent} />
    </Pressable> : <Icon key={star} name={star <= shown ? "star" : star - shown === 0.5 ? "star-half" : "star-outline"} size={13} color={theme.accent} />)}
  </View>;
}
