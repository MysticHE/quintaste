import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Field, T } from '../components/ui';
import { accountRequest } from '../services/auth-client';
import { usePreferences } from '../state/Preferences';

export default function ResetPassword() {
  const { username: initialUsername } = useLocalSearchParams<{ username?: string }>();
  const { theme } = usePreferences();
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
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to connect. Please retry.'); }
    finally { setBusy(false); }
  };
  return <Screen title="Recover Account">
    {message ? <T accessibilityLiveRegion="polite">{message}</T> : <>
      <T>Use one of the recovery codes you saved. A successful reset uses that code and signs out all devices.</T>
      <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={30} />
      <Field label="Recovery Code" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} autoComplete="off" maxLength={80} secureTextEntry />
      <Field label="New Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" maxLength={128} placeholder="At least 15 characters" />
      {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label="Reset Password" loading={busy} disabled={!username || !code || password.length < 15} onPress={() => void submit()} />
      <T muted>There is no email recovery. Without your password or an unused code, we cannot restore access. If you still know your password, sign in and replace your recovery codes from Your account.</T>
    </>}
    <Button label="Back To Sign In" variant="link" disabled={busy} onPress={() => router.replace({ pathname: '/login', params: { username } })} />
  </Screen>;
}
