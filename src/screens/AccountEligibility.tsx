import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, T } from '../components/ui';
import { DateOfBirthField } from '../components/account/DateOfBirthField';
import { accountRequest, authClient, refreshAccountSession } from '../services/auth-client';
import { useAuth } from '../state/Auth';
import { usePreferences } from '../state/Preferences';
import { safeReturn } from '../utils/navigation';

export function AccountEligibilityScreen() {
  const {user,pending}=useAuth(),{theme}=usePreferences();
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
      if (!session?.user.adultConfirmed) throw new Error('Could not refresh your account. Please retry.');
      router.dismissTo(safeReturn(returnTo));
    } catch(problem) {setError(problem instanceof Error?problem.message:'Eligibility could not be checked.');}
    finally {setBusy(false);}
  };
  if (user?.adultConfirmed) return <Redirect href={safeReturn(returnTo)} />;
  return <Screen title="Confirm Your Age">
    {!user?<><T>{pending?'Checking sign-in…':'Sign in to complete your account.'}</T><Button label="Sign In" onPress={()=>router.replace('/login')} /></>:<>
      {confirmed ? <T>Age confirmed. Finishing your account setup.</T> : <>
        <DateOfBirthField value={dateOfBirth} onChange={setDate} disabled={busy} />
        <T variant="small" muted>You must be 18 or older. Your birth date is not stored.</T>
      </>}
      {!!error&&<T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
      <Button label={confirmed ? 'Retry' : 'Continue'} disabled={!confirmed && !dateOfBirth} loading={busy} onPress={()=>void confirm()} />
      <Button label="Sign Out And Continue As Guest" variant="link" disabled={busy} onPress={()=>void authClient.signOut().then(()=>router.dismissTo('/'))} />
    </>}
  </Screen>;
}
