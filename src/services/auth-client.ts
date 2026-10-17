import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, usernameClient, oneTimeTokenClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiUrl } from '../utils/api-url';

export const accountsEnabled = process.env.EXPO_PUBLIC_AUTH_ENABLED === 'true';
export const authOrigin = process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && Platform.OS === 'web' ? window.location.origin : 'http://localhost:8081');
export const authClient = createAuthClient({
  baseURL: authOrigin,
  plugins: [
    usernameClient({ displayUsername: false }),
    oneTimeTokenClient(),
    expoClient({ scheme: 'quintaste', storagePrefix: 'quintaste', cookiePrefix: 'quintaste', storage: SecureStore, disableCache: true }),
    inferAdditionalFields({ user: { bio: { type: 'string' }, adultConfirmed: { type: 'boolean' } } }),
  ],
  fetchOptions: { timeout: 15000 },
});
// Imperative getSession bypasses the subscribed atom; hydrateSession only fills
// an empty atom. Refresh that subscription after custom account mutations.
let refreshQueue: Promise<unknown> = Promise.resolve();
export function refreshAccountSession(expectedUserId?: string) {
  const operation = refreshQueue.catch(() => {}).then(async () => {
    const session = authClient.$store.atoms.session;
    await session.get().refetch();
    const result = session.get();
    if (result.error || !result.data?.user || (expectedUserId && result.data.user.id !== expectedUserId)) {
      throw new Error('Could not refresh your account. Please retry.');
    }
    return result.data;
  });
  refreshQueue = operation;
  return operation;
}
export async function accountRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (Platform.OS !== 'web') {
    const cookie = await authClient.getCookie();
    if (cookie) headers.set('Cookie', cookie);
    headers.set('expo-origin', 'quintaste://');
  }
  const response = await fetch(apiUrl('/api/account/' + path), {
    ...options, headers, credentials: Platform.OS === 'web' ? 'same-origin' : 'omit',
    signal: AbortSignal.timeout(15000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || 'Your account request could not be completed.');
  return value as T;
}
