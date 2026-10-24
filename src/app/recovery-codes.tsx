import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Field, T } from '../components/ui';
import { RecoveryCodes } from '../components/account/RecoveryCodes';
import { accountRequest } from '../services/auth-client';
import { useAuth } from '../state/Auth';
import { usePreferences } from '../state/Preferences';
import { useT } from '../i18n';

export default function RecoverySettings() {
  const { user, pending } = useAuth();
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common');
  const [remaining, setRemaining] = useState<number | null>(null), [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (user) void accountRequest<{ remaining: number }>('recovery-codes').then(result => {
      if (active) setRemaining(result.remaining);
    }).catch(() => { if (active) setError(t('recoveryCountFailed')); });
    return () => { active = false; };
  }, [user, t]);
  const replace = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await accountRequest<{ codes: string[] }>('recovery-codes', { method: 'POST', body: JSON.stringify({ password }) });
      setPassword(''); setCodes(result.codes); setRemaining(result.codes.length);
    } catch (problem) { setError(problem instanceof Error ? problem.message : t('unableToConnect')); }
    finally { setBusy(false); }
  };
  if (!user) return <Screen title={t('recoveryCodes')}><T>{pending ? t('checkingSession') : t('signInForRecovery')}</T>
    <Button label={tc('signIn')} onPress={() => router.push({ pathname: '/login', params: { returnTo: '/recovery-codes' } })} /></Screen>;
  return <Screen title={t('recoveryCodes')}>
    {codes.length ? <RecoveryCodes username={user.username || ''} codes={codes} onDone={() => { setCodes([]); router.back(); }} /> : <>
      <T>{remaining === null ? t('codesPrivate') : t('codesRemaining', { n: remaining })}</T>
      <T>{t('replaceCodesNote')}</T>
      <Field label={t('currentPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={128} />
      {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={t('replaceCodes')} loading={busy} disabled={!password} onPress={() => void replace()} />
    </>}
  </Screen>;
}
