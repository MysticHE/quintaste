import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, T } from '../components/ui';
import { DateOfBirthField } from '../components/account/DateOfBirthField';
import { accountRequest, authClient, refreshAccountSession } from '../services/auth-client';
import { useAuth } from '../state/Auth';
import { usePreferences } from '../state/Preferences';
import { safeReturn } from '../utils/navigation';
import { useT } from '../i18n';

export function AccountEligibilityScreen() {
  const {user,pending}=useAuth(),{theme}=usePreferences(),t=useT('me'),tc=useT('common');
  const {returnTo}=useLocalSearchParams<{returnTo?:string}>();
  const [dateOfBirth,setDate]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [confirmed, setConfirmed] = useState(false);
  const confirm=async()=>{
    if(busy)return;setBusy(true);setError('');
    try {
      if (!confirmed) {
        await accountRequest('eligibility',{method:'POST',body:JSON.stringify({dateOfBirth})});
        setConfirmed(true); setDate('');
      }
      const session = await refreshAccountSession(user?.id);
      if (!session?.user.adultConfirmed) throw new Error(t('refreshAccountFailed'));
      router.dismissTo(safeReturn(returnTo));
    } catch(problem) {setError(problem instanceof Error?problem.message:t('eligibilityFailed'));}
    finally {setBusy(false);}
  };
  if (user?.adultConfirmed) return <Redirect href={safeReturn(returnTo)} />;
  return <Screen title={tc('confirmYourAge')}>
    {!user?<><T>{pending?t('checkingSignIn'):t('signInToComplete')}</T><Button label={tc('signIn')} onPress={()=>router.replace('/login')} /></>:<>
      {confirmed ? <T>{t('ageConfirmed')}</T> : <>
        <DateOfBirthField value={dateOfBirth} onChange={setDate} disabled={busy} />
        <T variant="small" muted>{t('ageRule')}</T>
      </>}
      {!!error&&<T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={confirmed ? tc('retry') : tc('continue')} disabled={!confirmed && !dateOfBirth} loading={busy} onPress={()=>void confirm()} />
      <Button label={t('signOutAsGuest')} variant="link" disabled={busy} onPress={()=>void authClient.signOut().then(()=>router.dismissTo('/'))} />
    </>}
  </Screen>;
}
