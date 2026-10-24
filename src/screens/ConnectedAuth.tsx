import { useRef, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, Card, Field, T } from '../components/ui';
import { useAuth } from '../state/Auth';
import { RecoveryCodes } from '../components/account/RecoveryCodes';
import { GoogleSignIn } from '../components/account/GoogleSignIn';
import { DateOfBirthField } from '../components/account/DateOfBirthField';
import { authClient, accountRequest } from '../services/auth-client';
import { usePreferences } from '../state/Preferences';
import { safeReturn } from '../utils/navigation';
import { getSignInDestination, setSignInDestination } from '../services/sign-in-destination';
import { useT } from '../i18n';

export function ConnectedAuthScreen({ signup = false }: { signup?: boolean }) {
  const { returnTo, username: initialUsername } = useLocalSearchParams<{ returnTo?: string; username?: string }>();
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common');
  const { user } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [name, setName] = useState(''), [username, setUsername] = useState(initialUsername || ''), [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [created, setCreated] = useState(false);
  const credentials = useRef<{ username: string; password: string } | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (signup) {
        const result = await accountRequest<{ username: string; codes: string[]; message?: string }>('register', { method: 'POST',
          body: JSON.stringify({ name, username: username.trim(), password, dateOfBirth }) });
        credentials.current = { username: result.username, password };
        setUsername(result.username); setCodes(result.codes); setCreated(true);
        setDateOfBirth(''); setPassword(''); setMessage(result.message || '');
      } else {
        setSignInDestination(safeReturn(returnTo));
        const result = await authClient.signIn.username({ username: username.trim(), password });
        if (result.error) throw new Error(t('signInFailed'));
        setPassword('');
      }
    } catch (problem) { setSignInDestination(undefined); setError(problem instanceof Error ? problem.message : t('unableToConnect')); }
    finally { setBusy(false); }
  };
  const finishSignup = async () => {
    if (busy || !credentials.current) return;
    setBusy(true); setError('');
    try {
      setSignInDestination(codes.length ? safeReturn(returnTo) : '/recovery-codes');
      const result = await authClient.signIn.username(credentials.current);
      if (result.error) throw new Error(t('signInUnfinished'));
      credentials.current = null;
    } catch (problem) { setSignInDestination(undefined); setError(problem instanceof Error ? problem.message : t('finishSignInFailed')); }
    finally { setBusy(false); }
  };
  if (user) return <Redirect href={user.adultConfirmed ? (getSignInDestination() || safeReturn(returnTo)) : { pathname: '/account-eligibility', params: { returnTo } }} />;
  if (created) return <Screen title={t('accountCreated')} back={false}>
    {codes.length ? <RecoveryCodes username={username} codes={codes} busy={busy} onDone={() => void finishSignup()} /> : <>
      <T>{t('accountReady')}</T>
      <Button label={tc('continue')} loading={busy} onPress={() => void finishSignup()} />
    </>}
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </Screen>;
  return <Screen title={signup ? t('createAccount') : tc('signIn')}>
    {!(signup && passwordVisible) && <GoogleSignIn disabled={busy} returnTo={returnTo} onBusy={setGoogleBusy} />}
    {!googleBusy && <>
    <Button label={passwordVisible ? (signup ? t('otherSignUp') : t('hidePasswordSignIn')) : (signup ? t('createWithUsername') : t('useUsernamePassword'))}
      variant="link" disabled={busy} onPress={() => { setPasswordVisible(value => !value); setDateOfBirth(''); setPassword(''); setError(''); }} />
    {passwordVisible && <>
    {signup && <><Field label={t('displayName')} value={name} onChangeText={setName} maxLength={50} />
      <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} disabled={busy} />
      <T variant="small" muted>{t('ageRule')}</T></>}
    <Field label={t('username')} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={30} />
    {signup && <T variant="small" muted>{t('usernameRule')}</T>}
    <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={signup ? 'new-password' : 'current-password'} maxLength={128} placeholder={signup ? t('atLeast15') : t('yourPassword')} />
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {!!message && <Card><T accessibilityLiveRegion="polite">{message}</T></Card>}
    <Button label={signup ? t('createAccount') : tc('signIn')} loading={busy} disabled={!username.trim() || !password || (signup && (!name.trim() || !dateOfBirth))} onPress={() => void submit()} />
    {!signup && <Button label={t('forgotPassword')} variant="link" disabled={busy} onPress={() => router.push({ pathname: '/reset-password', params: { username } })} />}
    </>}
    <Button label={signup ? t('haveAccount') : t('createAnAccount')} variant="link" disabled={busy}
      onPress={() => router.replace({ pathname: signup ? '/login' : '/create-account', params: { returnTo } })} />
    <Button label={t('continueAsGuest')} variant="secondary" disabled={busy} onPress={() => router.dismissTo(safeReturn(returnTo))} />
    </>}
  </Screen>;
}
