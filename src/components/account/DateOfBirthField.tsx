import { useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { usePreferences } from '../../state/Preferences';
import { Button, Card, T } from '../ui';
import { EARLIEST_BIRTH, birthDateValue, initialBirthDate, type DateOfBirthProps } from './date-of-birth';
import { useLanguage, useT } from '../../i18n';

const earliest = new Date(Number(EARLIEST_BIRTH.slice(0, 4)), 0, 1);

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthProps) {
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common'), language = useLanguage();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState(() => initialBirthDate(value));
  const choose = () => {
    const date = initialBirthDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode: 'date', display: 'spinner',
        minimumDate: earliest, maximumDate: new Date(),
        onValueChange: (_event, selected) => onChange(birthDateValue(selected)) });
    } else { setDraft(date); setOpen(true); }
  };
  return <View style={{ gap: 6 }}>
    <T variant="small">{t('dateOfBirth')}</T>
    <Button label={value ? shownDate(value, language) : t('selectDate')}
      accessibilityLabel={value ? t('dateOfBirthChange', { date: value }) : t('selectDateOfBirth')} icon="calendar-outline" variant="secondary" disabled={disabled} onPress={choose} />
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: theme.overlay }}>
        <Card><View accessibilityViewIsModal style={{ gap: 12 }}>
          <T variant="subtitle">{t('dateOfBirthTitle')}</T>
          <DateTimePicker value={draft} mode="date" display="spinner" minimumDate={earliest} maximumDate={new Date()}
            themeVariant={theme.dark ? 'dark' : 'light'} onValueChange={(_event, selected) => setDraft(selected)} />
          <Button label={tc('useThisDate')} onPress={() => { onChange(birthDateValue(draft)); setOpen(false); }} />
          <Button label={tc('cancel')} variant="link" onPress={() => setOpen(false)} />
        </View></Card>
      </View>
    </Modal>
  </View>;
}
/** The phone's own short date in English; Chinese reads "2001年3月12日". */
function shownDate(value: string, language: 'en' | 'zh') {
  const [year, month, day] = value.split('-').map(Number);
  return language === 'zh' ? `${year}年${month}月${day}日` : initialBirthDate(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
