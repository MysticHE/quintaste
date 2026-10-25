import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountsEnabled, authClient } from '../services/auth-client';
import { clearRemoteCache } from '../hooks/useRemote';
import { walkIn } from '../services/walk-in';

type AccountUser = { id: string; name: string; username?: string | null; bio?: string; adultConfirmed?: boolean };
type AuthState = { enabled: boolean; user: AccountUser | null; pending: boolean; unavailable?: boolean; retry?: () => void };
const Context = createContext<AuthState>({ enabled: false, user: null, pending: false });
const presenceKey = '@quintaste/auth-presence-v1';
let presenceWrites: Promise<unknown> = Promise.resolve();
function ConnectedAuth({ children }: PropsWithChildren) {
  const { data, isPending, error, refetch } = authClient.useSession();
  const [presence, setPresence] = useState<'unknown' | 'guest' | 'account'>('unknown');
  const userId = data?.user?.id;
  // Covers restored sessions, username sign-in and Google callbacks. Sign-out never clears this device flag.
  useEffect(() => { if (userId) void walkIn.signedIn().catch(() => {}); }, [userId]);
  // Community data is cached per session; a different account must never see the previous one's.
  useEffect(() => { clearRemoteCache(); }, [userId]);
  useEffect(() => {
    let active = true;
    const read = async () => {
      if (Platform.OS !== 'web') {
        const cookie = await authClient.getCookie();
        return /(?:^|;\s*)(?:__Secure-)?quintaste\.session_token=/.test(cookie || '') ? 'account' : 'guest';
      }
      return await AsyncStorage.getItem(presenceKey) === 'guest' ? 'guest' : 'unknown';
    };
    void read().then(value => { if (active) setPresence(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (isPending || error) return;
    let active = true;
    const next = data?.user ? 'account' : 'guest';
    // This is only a routing hint, never account identity or authorization.
    presenceWrites = presenceWrites.catch(() => {}).then(async () => {
      if (active) setPresence(next);
      if (Platform.OS === 'web') await AsyncStorage.setItem(presenceKey, next);
    });
    void presenceWrites.catch(() => {});
    return () => { active = false; };
  }, [data?.user, isPending, error]);
  // A device last used signed out goes straight to sign-in instead of waiting on, or failing, the session check.
  const guestAllowed = !data?.user && presence === 'guest';
  return <Context.Provider value={{ enabled: true, user: data?.user || null, pending: isPending && !guestAllowed,
    unavailable: !!error && !guestAllowed, retry: () => void refetch() }}>{children}</Context.Provider>;
}
export function AuthProvider({ children }: PropsWithChildren) {
  return accountsEnabled ? <ConnectedAuth>{children}</ConnectedAuth> : children;
}
export const useAuth = () => useContext(Context);
