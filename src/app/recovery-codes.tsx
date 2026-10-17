import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Field, T } from '../components/ui';
import { RecoveryCodes } from '../components/account/RecoveryCodes';
import { accountRequest } from '../services/auth-client';
import { useAuth } from '../state/Auth';
import { usePreferences } from '../state/Preferences';

export default function RecoverySettings() {
  const { user, pending } = useAuth();
  const { theme } = usePreferences();
  const [remaining, setRemaining] = useState<number | null>(null), [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (user) void accountRequest<{ remaining: number }>('recovery-codes').then(result => {
      if (active) setRemaining(result.remaining);
    }).catch(() => { if (active) setError('Could not load the remaining count. You can still replace your codes.'); });
    return () => { active = false; };
  }, [user]);
  const replace = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await accountRequest<{ codes: string[] }>('recovery-codes', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setCodes(result.codes); setRemaining(result.codes.length);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to connect. Please retry.'); }
    finally { setBusy(false); }
  };
  if (!user) return <Screen title="Recovery Codes"><T>{pending ? 'Checking your session…' : 'Sign in to manage your recovery codes.'}</T>
    <Button label="Sign In" onPress={() => router.push({ pathname: '/login', params: { returnTo: '/recovery-codes' } })} /></Screen>;
  return <Screen title="Recovery Codes">
    {codes.length ? <RecoveryCodes username={user.username || ''} codes={codes} onDone={() => { setCodes([]); router.back(); }} /> : <>
      <T>{remaining === null ? 'Your codes are private and cannot be displayed again.' : `${remaining} unused recovery codes remain.`}</T>
      <T>Replacing codes immediately invalidates all previous codes. Enter your current password, then save the new set before leaving.</T>
      <Field label="Current Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={128} />
      {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label="Replace Recovery Codes" loading={busy} disabled={!password} onPress={() => void replace()} />
    </>}
  </Screen>;
}
