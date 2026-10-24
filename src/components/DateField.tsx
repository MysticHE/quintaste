import { useState } from "react";
import { Modal, Platform, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { usePreferences } from "../state/Preferences";
import { Button, Card, T, common } from "./ui";
import { dateText, formatDay, parseDay } from "../utils/day";
import { useLanguage, useT } from "../i18n";

export type DateFieldProps = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; error?: string; minimum?: string };
/** A calendar date stored as YYYY-MM-DD; Android uses the system dialog and iOS a spinner sheet. */
export function DateField({ label, value, onChange, disabled, error, minimum }: DateFieldProps) {
  const { theme } = usePreferences(), t = useT("common"), language = useLanguage();
  const start = () => parseDay(value) ?? parseDay(minimum ?? "") ?? new Date();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(start);
  const minimumDate = parseDay(minimum ?? "") ?? undefined;
  const choose = () => {
    if (Platform.OS === "android") DateTimePickerAndroid.open({ value: start(), mode: "date", minimumDate, onValueChange: (_event, day) => onChange(dateText(day)) });
    else { setDraft(start()); setOpen(true); }
  };
  return <View style={{ gap: 6 }}>
    <T variant="small" style={common.bold}>{label}</T>
    <Button label={formatDay(value, language) || t("chooseDate")} accessibilityLabel={value ? t("dateChange", { label, date: formatDay(value, language) }) : t("chooseNamed", { label })}
      icon="calendar-outline" variant="secondary" disabled={disabled} onPress={choose} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 16, backgroundColor: theme.overlay }}>
        <Card><View accessibilityViewIsModal style={{ gap: 12 }}>
          <T variant="subtitle">{label}</T>
          <DateTimePicker value={draft} mode="date" display="spinner" minimumDate={minimumDate} themeVariant={theme.dark ? "dark" : "light"} onValueChange={(_event, day) => setDraft(day)} />
          <Button label={t("useThisDate")} onPress={() => { onChange(dateText(draft)); setOpen(false); }} />
          <Button label={t("cancel")} variant="link" onPress={() => setOpen(false)} />
        </View></Card>
      </View>
    </Modal>
  </View>;
}
