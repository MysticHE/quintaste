import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { Button, Card, T, common } from '../ui';
import { usePreferences } from '../../state/Preferences';
import { useT } from '../../i18n';

export function RecoveryCodes({ username, codes, onDone, busy }: {
  username: string; codes: string[]; onDone: () => void; busy?: boolean;
}) {
  const { theme } = usePreferences(), t = useT('me');
  const [error, setError] = useState('');
  const save = async () => {
    setError('');
    const content = t('recoveryFile', { username, codes: codes.join('\n') });
    try {
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url; link.download = 'quintaste-recovery-codes.txt'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else await Share.share({ title: t('saveRecoveryTitle'), message: content });
    } catch { setError(t('recoveryExportFailed')); }
  };
  return <Card style={common.stack}>
    <T variant="subtitle">{t('saveRecoveryCodes')}</T>
    <T selectable>{t('usernameLine', { username })}</T>
    <T>{t('recoveryNote')}</T>
    <T selectable accessibilityLabel={t('eightCodes')} style={{ lineHeight: 30 }}>{codes.join('\n')}</T>
    <T variant="small" muted>{t('recoveryWarning')}</T>
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t('exportRecoveryCodes')} variant="secondary" onPress={() => void save()} />
    <Button label={t('savedRecoveryCodes')} loading={busy} onPress={onDone} />
  </Card>;
}
