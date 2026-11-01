import { useId } from 'react';
import { View } from 'react-native';
import { usePreferences } from '../../state/Preferences';
import { T } from '../ui';
import { EARLIEST_BIRTH, birthDateValue, type DateOfBirthProps } from './date-of-birth';
import { useT } from '../../i18n';

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthProps) {
  const { theme, textMultiplier } = usePreferences();
  const id = useId(), t = useT('me');
  return <View style={{ gap: 6 }}>
    <T variant="small" nativeID={id}>{t('dateOfBirth')}</T>
    <input type="date" aria-labelledby={id} value={value} disabled={disabled} autoComplete="off"
      min={EARLIEST_BIRTH} max={birthDateValue(new Date())} onChange={event => onChange(event.target.value)}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 52, padding: '12px 14px', borderRadius: 14,
        border: `1px solid ${theme.border}`, background: theme.card, color: theme.foreground,
        fontFamily: 'inherit', fontSize: 16 * textMultiplier, colorScheme: theme.dark ? 'dark' : 'light' }} />
  </View>;
}
