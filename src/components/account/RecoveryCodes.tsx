import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { Button, Card, T, common } from '../ui';
import { usePreferences } from '../../state/Preferences';

export function RecoveryCodes({ username, codes, onDone, busy }: {
  username: string; codes: string[]; onDone: () => void; busy?: boolean;
}) {
  const { theme } = usePreferences();
  const [error, setError] = useState('');
  const save = async () => {
    setError('');
    const content = `QuinTaste recovery codes\nUsername: ${username}\n\n${codes.join('\n')}\n\nKeep these private. Each code resets your password once. Replacing codes invalidates all older codes.\n`;
    try {
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url; link.download = 'quintaste-recovery-codes.txt'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else await Share.share({ title: 'Save QuinTaste recovery codes', message: content });
    } catch { setError('Export failed. Select and copy the codes into a safe place before continuing.'); }
  };
  return <Card style={common.stack}>
    <T variant="subtitle">Save Your Recovery Codes</T>
    <T selectable>Username: {username}</T>
    <T>Save these privately. Each code resets your password once.</T>
    <T selectable accessibilityLabel="Your eight recovery codes" style={{ lineHeight: 30 }}>{codes.join('\n')}</T>
    <T variant="small" muted>Shown only once. Anyone with a code can access your account. Without your password or a code, recovery is unavailable.</T>
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Export Recovery Codes" variant="secondary" onPress={() => void save()} />
    <Button label="I've Saved My Recovery Codes" loading={busy} onPress={onDone} />
  </Card>;
}
