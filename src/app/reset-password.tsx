import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Field, T } from '../components/ui';
import { accountRequest } from '../services/auth-client';
import { usePreferences } from '../state/Preferences';
import { useT } from '../i18n';

export default function ResetPassword() {
  const { username: initialUsername } = useLocalSearchParams<{ username?: string }>();
  const { theme } = usePreferences(), t = useT('me');
  const [username, setUsername] = useState(initialUsername || ''), [code, setCode] = useState('');
  const [password, setPassword] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await accountRequest<{ message: string }>('recover', {
        method: 'POST', body: JSON.stringify({ username, code, password }),
      });
      setCode(''); setPassword(''); setMessage(result.message);
    } catch (problem) { setError(problem instanceof Error ? problem.message : t('unableToConnect')); }
    finally { setBusy(false); }
  };
  return <Screen title={t('recoverAccount')}>
    {message ? <T accessibilityLiveRegion="polite">{message}</T> : <>
      <T>{t('recoverNote')}</T>
      <Field label={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={30} />
      <Field label={t('recoveryCode')} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={80} secureTextEntry />
      <Field label={t('newPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={128} placeholder={t('atLeast15')} />
      {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={t('resetPassword')} loading={busy} disabled={!username || !code || password.length < 15} onPress={() => void submit()} />
      <T muted>{t('noEmailRecovery')}</T>
    </>}
    <Button label={t('backToSignIn')} variant="link" disabled={busy} onPress={() => router.replace({ pathname: '/login', params: { username } })} />
  </Screen>;
}
