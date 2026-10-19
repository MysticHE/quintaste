import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen } from '../components/Screen';
import { Button, Card, Field, T, common } from '../components/ui';
import { accountRequest, authClient, refreshAccountSession } from '../services/auth-client';
import { useAuth } from '../state/Auth';
import { usePreferences } from '../state/Preferences';
import { foodKey } from '../state/useFoodStorage';
import { useAutosave } from '../hooks/useAutosave';
import { lotusTierKey } from '../hooks/useLotus';
import { AutosaveStatus } from '../components/AutosaveStatus';

export function ConnectedProfileScreen() {
  const { user, pending } = useAuth();
  const { theme } = usePreferences();
  const [name, setName] = useState(user?.name || ''), [bio, setBio] = useState(user?.bio || '');
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false), [password, setPassword] = useState('');
  const [retry, setRetry] = useState(0);
  const userId = user?.id;
  const identity = useRef(userId);
  useLayoutEffect(() => { identity.current = userId; }, [userId]);
  const edited = useRef(false);
  const autosave = useAutosave(async (profile: { name: string; bio: string; accountId: string }) => {
    if (identity.current !== profile.accountId) return false;
    const session = await authClient.getSession({ fetchOptions: { throw: true } });
    if (session?.user.id !== profile.accountId) return false;
    await accountRequest('profile', { method: 'PATCH', body: JSON.stringify({ name: profile.name, bio: profile.bio }) });
    await refreshAccountSession(profile.accountId);
    return true;
  });
  const change = (nextName: string, nextBio: string) => {
    edited.current = true; setName(nextName); setBio(nextBio);
    if (ready && user && nextName.trim()) autosave.change({ name: nextName.trim(), bio: nextBio, accountId: user.id });
  };
  const [access,setAccess]=useState<{role:string;unlimitedUsage:boolean;passwordLogin:boolean;googleLogin:boolean}>();
  useEffect(() => {
    let active = true;
    if (userId) void Promise.all([accountRequest<{ name: string; bio: string }>('profile'),
      accountRequest<NonNullable<typeof access>>('access')]).then(([profile,permissions]) => {
      if (active) setAccess(permissions);
      if (active) { if (!edited.current) { setName(profile.name); setBio(profile.bio); } setReady(true); setError(''); }
    }).catch(() => { if (active) setError('Your profile could not be loaded. Retry before editing.'); });
    return () => { active = false; };
  }, [userId, retry]);
  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await operation(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to connect. Please retry.'); }
    finally { setBusy(false); }
  };
  const exportAccount = () => run(async () => {
    const data = await accountRequest('export');
    const content = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'quintaste-account.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else await Share.share({ title: 'QuinTaste account export', message: content });
  });
  const erase = () => run(async () => {
    if (!user || !access) throw new Error('Load your account before deleting it.');
    if (access.passwordLogin && !password) throw new Error('Enter your password to confirm deletion.');
    const id = user.id;
    const result = await authClient.deleteUser(access.passwordLogin?{password}:{});
    if (result.error) throw new Error(result.error.message || 'Deletion failed. Check your password and retry.');
    await AsyncStorage.multiRemove([foodKey('profile', id), '@quintaste/preview-preferences-v1/' + id, '@quintaste/avatar-preview/' + id, lotusTierKey(id)]);
    setPassword(''); router.dismissTo('/account');
  });
  if (!user) return <Screen title="Account"><T>{pending ? 'Checking your session…' : 'Sign in to manage or delete your account.'}</T>
    <Button label="Sign In" onPress={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } })} /></Screen>;
  return <Screen title="Edit Profile">
    {access?.unlimitedUsage&&<T>Master account · Unlimited usage</T>}
    <AutosaveStatus saving={autosave.saving} local={false} error={autosave.failed ? 'Your profile could not be saved. Tap Retry.' : undefined} />
    <Field label="Display Name" value={name} onChangeText={value => change(value, bio)} maxLength={50} editable={ready && !busy} error={!name.trim() ? 'Enter a display name.' : undefined} onBlur={() => void autosave.flush()} />
    <Field label="About You (Optional)" value={bio} onChangeText={value => change(name, value)} multiline maxLength={160} editable={ready && !busy} onBlur={() => void autosave.flush()} />
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {!!message && <T accessibilityLiveRegion="polite">{message}</T>}
    {!ready && <Button label="Retry Loading Profile" variant="secondary" onPress={() => setRetry(value => value + 1)} />}
    {autosave.failed && <Button label="Retry" variant="link" onPress={() => void autosave.flush()} />}
    <Card style={common.stack}><T variant="subtitle">Account Data</T>
      <T muted>Your account details and eligibility result are stored on the server. Food collections stay on each device.</T>
      {access?.passwordLogin?<Button label="Recovery Codes" variant="secondary" disabled={busy} onPress={() => router.push('/recovery-codes')} />
        :<T muted>Sign in and recover access through your Google account.</T>}
      <Button label="Export Account Data" variant="secondary" disabled={busy} onPress={() => void exportAccount()} />
      <Button label="Local Food Data" variant="link" onPress={() => router.push('/privacy')} />
    </Card>
    <Card style={common.stack}><T variant="subtitle">Delete Account</T>
      <T muted>Deletes your server profile, credentials and sessions, and this account’s food collection on this device. Guest originals stay. Backups expire within seven days; copies on other devices need local deletion.</T>
      {confirm ? <>{access?.passwordLogin?<Field label="Confirm Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" maxLength={128} />
        :<T>Google accounts require a sign-in from the last ten minutes. If deletion expires, sign out and sign in with Google again.</T>}
        <Button label="Permanently Delete Account" variant="secondary" loading={busy} onPress={() => void erase()} />
        <Button label="Cancel Deletion" variant="link" disabled={busy} onPress={() => { setConfirm(false); setPassword(''); }} /></>
        : <Button label="Review Account Deletion" variant="secondary" onPress={() => setConfirm(true)} />}
    </Card>
  </Screen>;
}
