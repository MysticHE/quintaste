import { useId } from "react";
import { View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { T, common } from "./ui";
import type { DateFieldProps } from "./DateField";

/** The browser date input already edits a calendar day as YYYY-MM-DD. */
export function DateField({ label, value, onChange, disabled, error, minimum, maximum }: DateFieldProps) {
  const { theme, textMultiplier } = usePreferences(), id = useId();
  return <View style={{ gap: 6 }}>
    <T variant="small" nativeID={id} style={common.bold}>{label}</T>
    <input type="date" aria-labelledby={id} aria-invalid={!!error} value={value} disabled={disabled} min={minimum} max={maximum} onChange={event => onChange(event.target.value)}
      style={{ boxSizing: "border-box", width: "100%", minWidth: 0, minHeight: 50, padding: "12px 14px", borderRadius: 12, border: `1px solid ${error ? theme.error : theme.border}`,
        background: theme.card, color: theme.foreground, fontFamily: "inherit", fontSize: 16 * textMultiplier, colorScheme: theme.dark ? "dark" : "light" }} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </View>;
}
