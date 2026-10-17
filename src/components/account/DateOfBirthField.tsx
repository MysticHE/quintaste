import { useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { usePreferences } from '../../state/Preferences';
import { Button, Card, T } from '../ui';
import { birthDateValue, initialBirthDate, type DateOfBirthProps } from './date-of-birth';

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthProps) {
  const { theme } = usePreferences();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(() => initialBirthDate(value));
  const choose = () => {
    const date = initialBirthDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'date', display: 'spinner',
        minimumDate: new Date(1900, 0, 1), maximumDate: new Date(),
        onValueChange: (_event, selected) => onChange(birthDateValue(selected)) });
    } else { setDraft(date); setOpen(true); }
  };
  return <View style={{ gap: 6 }}>
    <T variant="small">Date of birth</T>
    <Button label={value ? initialBirthDate(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Date'}
      accessibilityLabel={value ? `Date of birth, ${value}. Change date` : 'Select date of birth'} icon="calendar-outline" variant="secondary" disabled={disabled} onPress={choose} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.overlay }}>
        <Card><View accessibilityViewIsModal style={{ gap: 12 }}>
          <T variant="subtitle">Date Of Birth</T>
          <DateTimePicker value={draft} mode="date" display="spinner" minimumDate={new Date(1900, 0, 1)} maximumDate={new Date()}
            themeVariant={theme.dark ? 'dark' : 'light'} onValueChange={(_event, selected) => setDraft(selected)} />
          <Button label="Use This Date" onPress={() => { onChange(birthDateValue(draft)); setOpen(false); }} />
          <Button label="Cancel" variant="link" onPress={() => setOpen(false)} />
        </View></Card>
      </View>
    </Modal>
  </View>;
}
