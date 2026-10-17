import { useId } from 'react';
import { View } from 'react-native';
import { usePreferences } from '../../state/Preferences';
import { T } from '../ui';
import { birthDateValue, type DateOfBirthProps } from './date-of-birth';

export function DateOfBirthField({ value, onChange, disabled }: DateOfBirthProps) {
  const { theme, textMultiplier } = usePreferences();
  const id = useId();
  return <View style={{ gap: 6 }}>
    <T variant="small" nativeID={id}>Date of birth</T>
    <input type="date" aria-labelledby={id} value={value} disabled={disabled} autoComplete="off"
      min="1900-01-01" max={birthDateValue(new Date())} onChange={event => onChange(event.target.value)}
      style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 52, padding: '12px 14px', borderRadius: 14,
        border: `1px solid ${theme.border}`, background: theme.card, color: theme.foreground,
        fontFamily: 'inherit', fontSize: 16 * textMultiplier, colorScheme: theme.dark ? 'dark' : 'light' }} />
  </View>;
}
