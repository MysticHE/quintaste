import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, T } from '../components/ui';
import { finishGoogleSignIn } from '../services/google-sign-in';
import { safeReturn } from '../utils/navigation';

export default function AuthReturn() {
  const { flow, code } = useLocalSearchParams<{ flow?: string; code?: string }>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'web' || !flow || !code) { router.replace('/login'); return; }
    void finishGoogleSignIn(flow, code).then(result => {
      if (active) router.dismissTo(result.adult ? safeReturn(result.returnTo) : { pathname: '/account-eligibility', params: { returnTo: result.returnTo } });
    }).catch(problem => { if (active) setError(problem instanceof Error ? problem.message : 'Please sign in again.'); });
    return () => { active = false; };
  }, [flow, code]);
  return <Screen title="Signing In" back={false}>
    {error ? <><T accessibilityLiveRegion="polite">{error}</T><Button label="Try Again" onPress={() => router.replace('/login')} /></> : <ActivityIndicator accessibilityLabel="Signing in" />}
  </Screen>;
}
