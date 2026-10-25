import { useCallback, useState } from 'react';
import { BackHandler, Pressable } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Field, Icon, T } from '../components/ui';
import { useAuth } from '../state/Auth';
import { GoogleSignIn } from '../components/account/GoogleSignIn';
import { authClient } from '../services/auth-client';
import { usePreferences } from '../state/Preferences';
import { safeReturn } from '../utils/navigation';
import { getSignInDestination, setSignInDestination } from '../services/sign-in-destination';
import { useT } from '../i18n';
import { SignInScene } from '../components/walkin/SignInScene';
import { WelcomeButton, WelcomeDivider } from '../components/walkin/WelcomeUI';
import { fontNames } from '../theme/tokens';

/** The welcome sign-in page: Google, or a username and password form, after the walk-in introductions. */
export function ConnectedSignInScreen({ onGalleryBack }: { onGalleryBack?: () => void }) {
  const { returnTo, username: initialUsername } = useLocalSearchParams<{ returnTo?: string; username?: string }>();
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common');
  const { user } = useAuth();
  // Without a page to return to, both ways of signing in open the app's home.
  const destination = safeReturn(returnTo || '/');
  const [formOpen, setFormOpen] = useState(!!initialUsername), [revealed, setRevealed] = useState(false);
  const [username, setUsername] = useState(initialUsername || ''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [googleBusy, setGoogleBusy] = useState(false), [error, setError] = useState('');
  const locked = busy || googleBusy;
  const closeForm = useCallback(() => { setFormOpen(false); setPassword(''); setRevealed(false); setError(''); }, []);
  // Android Back closes the form, then returns to the introductions. Only while this page is on screen, so a page opened
  // on top of it (Forgot password) keeps its own Back.
  useFocusEffect(useCallback(() => {
    if (user) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locked) return true;
      if (formOpen) { closeForm(); return true; }
      if (onGalleryBack) { onGalleryBack(); return true; }
      return false;
    });
    return () => listener.remove();
  }, [user, locked, formOpen, closeForm, onGalleryBack]));
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      setSignInDestination(destination);
      const result = await authClient.signIn.username({ username: username.trim(), password });
      if (result.error) throw new Error(t('signInFailed'));
      setPassword('');
    } catch (problem) { setSignInDestination(undefined); setError(problem instanceof Error ? problem.message : t('unableToConnect')); }
    finally { setBusy(false); }
  };
  if (user) return <Redirect href={user.adultConfirmed ? (getSignInDestination() || destination) : { pathname: '/account-eligibility', params: { returnTo } }} />;
  const google = <GoogleSignIn welcome disabled={busy} returnTo={String(destination)} onBusy={setGoogleBusy} />;
  return <SignInScene title={t(formOpen ? 'welcomeBack' : 'welcomeHome')} body={t(formOpen ? 'welcomeBackBody' : 'welcomeHomeBody')}
    onBack={formOpen ? closeForm : onGalleryBack} backLabel={t(formOpen ? 'welcomeChoices' : 'walkInBack')} busy={locked}>
    {formOpen ? <>
      <Field label={t('username')} placeholder={t('welcomeUsernamePlaceholder')} value={username} onChangeText={setUsername}
        autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={30} editable={!locked} />
      <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry={!revealed} autoCapitalize="none"
        autoComplete="current-password" maxLength={128} placeholder={t('yourPassword')} editable={!locked} returnKeyType="go"
        onSubmitEditing={() => { if (!locked && username.trim() && password) void submit(); }}
        trailing={<Pressable accessibilityRole="button" accessibilityLabel={t(revealed ? 'hidePassword' : 'showPassword')}
          accessibilityState={{ disabled: locked }} disabled={locked} onPress={() => setRevealed(value => !value)}
          style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name={revealed ? 'eye-off-outline' : 'eye-outline'} />
        </Pressable>} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('forgotPassword')} disabled={locked} accessibilityState={{ disabled: locked }}
        onPress={() => router.push({ pathname: '/reset-password', params: { username } })}
        style={{ alignSelf: 'flex-end', minHeight: 48, paddingVertical: 12, justifyContent: 'center', marginTop: -8 }}>
        <T color={theme.accent} style={{ fontFamily: fontNames.semibold }}>{t('forgotPassword')}</T>
      </Pressable>
      {!!error && <T color={theme.error} accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</T>}
      <WelcomeButton label={tc('signIn')} kind="primary" busy={busy} disabled={googleBusy || !username.trim() || !password} onPress={() => void submit()} testID="welcome-sign-in" />
      <WelcomeDivider>{t('welcomeOr')}</WelcomeDivider>
      {google}
    </> : <>
      {google}
      <WelcomeDivider>{t('welcomeOr')}</WelcomeDivider>
      <WelcomeButton label={t('welcomeUsername')} icon="person-outline" disabled={locked} onPress={() => setFormOpen(true)} />
    </>}
    {/* Replaces this page, so signing up never leaves a stale sign-in page underneath. */}
    <Pressable accessibilityRole="button" accessibilityLabel={t('welcomeCreate')} disabled={locked} accessibilityState={{ disabled: locked }}
      onPress={() => router.replace({ pathname: '/create-account', params: { returnTo: returnTo || '/' } })}
      style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <T style={{ textAlign: 'center' }}>{t('welcomeNewHere')} <T color={theme.accent} style={{ fontFamily: fontNames.bold }}>{t('welcomeCreate')}</T></T>
    </Pressable>
  </SignInScene>;
}
