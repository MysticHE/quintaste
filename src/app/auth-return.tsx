import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, T } from '../components/ui';
import { finishGoogleSignIn } from '../services/google-sign-in';
import { safeReturn } from '../utils/navigation';
import { useT } from '../i18n';

export default function AuthReturn() {
  const { flow, code } = useLocalSearchParams<{ flow?: string; code?: string }>();
  // true: sign-in failed without a message of its own.
  const [error, setError] = useState<string | true>(''), t = useT('me'), tc = useT('common');
  useEffect(() => {
    let active = true;
    if (Platform.OS === 'web' || !flow || !code) { router.replace('/login'); return; }
    void finishGoogleSignIn(flow, code).then(result => {
      if (active) router.dismissTo(result.adult ? safeReturn(result.returnTo) : { pathname: '/account-eligibility', params: { returnTo: result.returnTo } });
    }).catch(problem => { if (active) setError(problem instanceof Error ? problem.message : true); });
    return () => { active = false; };
  }, [flow, code]);
  return <Screen title={t('signingInTitle')} back={false}>
    {error ? <><T accessibilityLiveRegion="polite">{error === true ? t('signInAgain') : error}</T><Button label={tc('tryAgain')} onPress={() => router.replace('/login')} /></> : <ActivityIndicator accessibilityLabel={t('signingInLabel')} />}
  </Screen>;
}
