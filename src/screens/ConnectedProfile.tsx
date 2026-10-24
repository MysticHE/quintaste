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
import { useT } from '../i18n';

export function ConnectedProfileScreen() {
  const { user, pending } = useAuth();
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common');
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
    }).catch(() => { if (active) setError(t('profileLoadFailed')); });
    return () => { active = false; };
  }, [userId, retry, t]);
  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await operation(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : t('unableToConnect')); }
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
    } else await Share.share({ title: t('accountExportTitle'), message: content });
  });
  const erase = () => run(async () => {
    if (!user || !access) throw new Error(t('loadBeforeDelete'));
    if (access.passwordLogin && !password) throw new Error(t('enterPasswordToDelete'));
    const id = user.id;
    const result = await authClient.deleteUser(access.passwordLogin?{password}:{});
    if (result.error) throw new Error(result.error.message || t('deletionFailed'));
    await AsyncStorage.multiRemove([foodKey('profile', id), '@quintaste/preview-preferences-v1/' + id, '@quintaste/avatar-preview/' + id, lotusTierKey(id)]);
    setPassword(''); router.dismissTo('/account');
  });
  if (!user) return <Screen title={t('account')}><T>{pending ? t('checkingSession') : t('signInToManage')}</T>
    <Button label={tc('signIn')} onPress={() => router.push({ pathname: '/login', params: { returnTo: '/profile' } })} /></Screen>;
  return <Screen title={t('editProfile')}>
    {access?.unlimitedUsage&&<T>{t('masterAccount')}</T>}
    <AutosaveStatus saving={autosave.saving} local={false} error={autosave.failed ? t('profileSaveFailed') : undefined} />
    <Field label={t('displayName')} value={name} onChangeText={value => change(value, bio)} maxLength={50} editable={ready && !busy} error={!name.trim() ? t('enterDisplayName') : undefined} onBlur={() => void autosave.flush()} />
    <Field label={t('aboutYouOptional')} value={bio} onChangeText={value => change(name, value)} multiline maxLength={160} editable={ready && !busy} onBlur={() => void autosave.flush()} />
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {!!message && <T accessibilityLiveRegion="polite">{message}</T>}
    {!ready && <Button label={t('retryLoadingProfile')} variant="secondary" onPress={() => setRetry(value => value + 1)} />}
    {autosave.failed && <Button label={tc('retry')} variant="link" onPress={() => void autosave.flush()} />}
    <Card style={common.stack}><T variant="subtitle">{t('accountData')}</T>
      <T muted>{t('accountDataNote')}</T>
      {access?.passwordLogin?<Button label={t('recoveryCodes')} variant="secondary" disabled={busy} onPress={() => router.push('/recovery-codes')} />
        :<T muted>{t('googleRecovery')}</T>}
      <Button label={t('exportAccountData')} variant="secondary" disabled={busy} onPress={() => void exportAccount()} />
      <Button label={t('localFoodData')} variant="link" onPress={() => router.push('/privacy')} />
    </Card>
    <Card style={common.stack}><T variant="subtitle">{t('deleteAccount')}</T>
      <T muted>{t('deleteAccountNote')}</T>
      {confirm ? <>{access?.passwordLogin?<Field label={t('confirmPassword')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" maxLength={128} />
        :<T>{t('googleDeleteNote')}</T>}
        <Button label={t('permanentlyDelete')} variant="secondary" loading={busy} onPress={() => void erase()} />
        <Button label={t('cancelDeletion')} variant="link" disabled={busy} onPress={() => { setConfirm(false); setPassword(''); }} /></>
        : <Button label={t('reviewAccountDeletion')} variant="secondary" onPress={() => setConfirm(true)} />}
    </Card>
  </Screen>;
}
