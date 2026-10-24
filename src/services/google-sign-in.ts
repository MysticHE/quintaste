import * as SecureStore from 'expo-secure-store';
import { accountRequest, authClient, refreshAccountSession } from './auth-client';
import { savedText } from './saved-language';

const key = 'quintaste_google_pending';
type Pending = { id: string; proof: string; expiresAt: number; token?: string; returnTo?: string };
export async function rememberGoogleSignIn(flow: { id: string; proof: string }) {
  await SecureStore.setItemAsync(key, JSON.stringify({ ...flow, expiresAt: Date.now() + 10 * 60 * 1000 }));
}
export const forgetGoogleSignIn = () => SecureStore.deleteItemAsync(key);

// Account-tree remounts and the browser callback share one single-use exchange.
let exchange: { id: string; code: string; promise: Promise<{ adult: boolean; returnTo?: string }> } | undefined;
export function finishGoogleSignIn(id: string, code: string) {
  if (exchange?.id === id && exchange.code === code) return exchange.promise;
  const promise = (async () => {
    const raw = await SecureStore.getItemAsync(key);
    const pending: Pending | null = raw ? JSON.parse(raw) : null;
    if (!pending || pending.id !== id || pending.expiresAt <= Date.now() || !/^[A-Za-z0-9_-]{43}$/.test(code)) {
      throw new Error(await savedText('me', 'signInExpired'));
    }
    if (!pending.token) {
      const result = await accountRequest<{ token?: string; returnTo?: string }>('google/finish', {
        method: 'POST', body: JSON.stringify({ id, proof: pending.proof, callback: code }),
      });
      if (!result.token) throw new Error(await savedText('me', 'signInUnverified'));
      pending.token = result.token; pending.returnTo = result.returnTo;
      pending.expiresAt = Date.now() + 60_000;
      await SecureStore.setItemAsync(key, JSON.stringify(pending));
    }
    const verified = await authClient.oneTimeToken.verify({ token: pending.token });
    if (verified.error || !verified.data?.user) throw new Error(await savedText('me', 'signInExpired'));
    await forgetGoogleSignIn();
    await refreshAccountSession(verified.data.user.id);
    return { adult: !!verified.data.user.adultConfirmed, returnTo: pending.returnTo };
  })();
  exchange = { id, code, promise };
  void promise.catch(() => { if (exchange?.promise === promise) exchange = undefined; });
  return promise;
}
