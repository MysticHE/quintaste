import { useState } from "react";
import { Modal, Platform, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { Button, Card, T, common } from "../ui";
import { formatSgText, parseSgDateTime, sgDateTimeText } from "../../utils/sg-datetime";

export type SgDateTimeProps = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean };
/** Start from the saved time, or the next full hour. */
export const initialPlanDate = (value: string) => { const at = parseSgDateTime(value); if (at !== null) return new Date(at); const next = new Date(); next.setMinutes(0, 0, 0); next.setHours(next.getHours() + 1); return next; };
export function SgDateTimeField({ label, value, onChange, disabled }: SgDateTimeProps) {
  const { theme } = usePreferences(), t = useT("social"), tc = useT("common"), language = useLanguage(), shown = formatSgText(value, language);
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(() => initialPlanDate(value));
  const choose = () => {
    const start = initialPlanDate(value);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: start, mode: "date", minimumDate: new Date(), onValueChange: (_event, day) => {
        DateTimePickerAndroid.open({ value: day, mode: "time", onValueChange: (_timeEvent, time) => onChange(sgDateTimeText(time.getTime())) });
      } });
    } else { setDraft(start); setOpen(true); }
  };
  return <View style={{ gap: 6 }}>
    <T variant="small" style={common.bold}>{t("sgTime", { label })}</T>
    <Button label={value ? shown || t("chooseDateTime") : t("chooseDateTime")} accessibilityLabel={value ? t("changeA11y", { label, value: shown }) : t("chooseLabel", { label })}
      icon="calendar-outline" variant="secondary" disabled={disabled} onPress={choose} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: theme.overlay }}>
        <Card><View accessibilityViewIsModal style={{ gap: 12 }}>
          <T variant="subtitle">{label}</T>
          <DateTimePicker value={draft} mode="datetime" display="spinner" minimumDate={new Date()} themeVariant={theme.dark ? "dark" : "light"} onValueChange={(_event, selected) => setDraft(selected)} />
          <Button label={t("useThisTime")} onPress={() => { onChange(sgDateTimeText(draft.getTime())); setOpen(false); }} />
          <Button label={tc("cancel")} variant="link" onPress={() => setOpen(false)} />
        </View></Card>
      </View>
    </Modal>
  </View>;
}
