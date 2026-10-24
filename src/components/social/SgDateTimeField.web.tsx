import { useId, useState } from "react";
import { View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { T, common } from "../ui";
import { sgDateTimeText } from "../../utils/sg-datetime";
import type { SgDateTimeProps } from "./SgDateTimeField";

/** The browser input edits Singapore wall-clock time directly; the label says so. */
export function SgDateTimeField({ label, value, onChange, disabled }: SgDateTimeProps) {
  const { theme, textMultiplier } = usePreferences(), t = useT("social"), id = useId(), [min] = useState(() => sgDateTimeText(Date.now()).replace(" ", "T"));
  return <View style={{ gap: 6 }}>
    <T variant="small" nativeID={id} style={common.bold}>{t("sgTime", { label })}</T>
    <input type="datetime-local" aria-labelledby={id} value={value.replace(" ", "T")} disabled={disabled} min={min}
      onChange={event => onChange(event.target.value.replace("T", " ").slice(0, 16))}
      style={{ boxSizing: "border-box", width: "100%", minWidth: 0, minHeight: 52, padding: "12px 14px", borderRadius: 14, border: `1px solid ${theme.border}`,
        background: theme.card, color: theme.foreground, fontFamily: "inherit", fontSize: 16 * textMultiplier, colorScheme: theme.dark ? "dark" : "light" }} />
  </View>;
}
