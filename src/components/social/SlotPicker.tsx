import { useState } from "react";
import { View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { FieldLabel } from "../GroupedList";
import { useMinuteClock } from "../food/Timers";
import { slotLabel } from "../../utils/social-match";
import { SgDateTimeField } from "./SgDateTimeField";
import { useLanguage, useT } from "../../i18n";

/** Suggested slots as chips, then Other for any date and time. `value` is "YYYY-MM-DD HH:mm" Singapore time. */
export function SlotPicker({ label: given, slots, value, onChange }: { label?: string; slots: string[]; value: string; onChange: (value: string) => void }) {
  const now = useMinuteClock(), t = useT("social"), language = useLanguage(), label = given ?? t("when"), [other, setOther] = useState(() => !!value && !slots.includes(value));
  return <View style={{ gap: 6 }}>
    <FieldLabel>{label}</FieldLabel>
    <Chips label={label}>
      {slots.map(slot => <Chip key={slot} label={slotLabel(slot, now, language)} role="radio" selected={!other && value === slot} onPress={() => { setOther(false); onChange(slot); }} />)}
      <Chip label={t("other")} icon="calendar-outline" role="radio" selected={other} onPress={() => setOther(true)} />
    </Chips>
    {other && <SgDateTimeField label={t("dateAndTime")} value={value} onChange={onChange} />}
  </View>;
}
