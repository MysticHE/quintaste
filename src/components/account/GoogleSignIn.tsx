import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Button, T } from '../ui';
import { accountRequest } from '../../services/auth-client';
import { rememberGoogleSignIn, forgetGoogleSignIn } from '../../services/google-sign-in';
import { usePreferences } from '../../state/Preferences';
import { safeReturn } from '../../utils/navigation';

export function GoogleSignIn({ disabled = false, returnTo, onBusy }: { disabled?: boolean; returnTo?: string; onBusy?: (busy: boolean) => void }) {
  const { theme } = usePreferences();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(true), running = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const start = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); onBusy?.(true); setError('');
    try {
      const returnURL = Platform.OS === 'web' ? undefined : Linking.createURL('auth-return');
      const flow = await accountRequest<{ id: string; proof: string; url: string }>('google/start', {
        method: 'POST', body: JSON.stringify({ platform: Platform.OS === 'web' ? 'web' : 'native', returnTo: String(safeReturn(returnTo)), returnURL }),
      });
      if (Platform.OS === 'web') { window.location.assign(flow.url); return; }
      await rememberGoogleSignIn({ id: flow.id, proof: flow.proof });
      const result = await WebBrowser.openAuthSessionAsync(flow.url, returnURL);
      if (result.type === 'success') {
        const callback = new URL(result.url);
        if (callback.searchParams.get('flow') !== flow.id || !callback.searchParams.get('code')) throw new Error('Sign-in could not be verified. Please try again.');
        router.replace({ pathname: '/auth-return', params: { flow: flow.id, code: callback.searchParams.get('code')! } });
      } else {
        await forgetGoogleSignIn();
        await accountRequest('google/cancel', { method: 'POST', body: JSON.stringify({ id: flow.id, proof: flow.proof }) }).catch(() => undefined);
      }
    } catch (problem) { if (alive.current) setError(problem instanceof Error ? problem.message : 'Google sign-in could not start.'); }
    finally { running.current = false; if (alive.current) { setBusy(false); onBusy?.(false); } }
  };
  return <>
    <Button label={busy ? 'Signing In…' : 'Continue With Google'} icon="logo-google" loading={busy} disabled={disabled || busy} onPress={() => void start()} />
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </>;
}
