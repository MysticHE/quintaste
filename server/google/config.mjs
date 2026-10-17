import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { verifyGoogleIdToken } from 'better-auth/social-providers';

/** @returns {import('better-auth/social-providers').GoogleOptions | undefined} */
export function googleOptions() {
  let clientSecret = '';
  try { clientSecret = readFileSync(process.env.GOOGLE_CLIENT_SECRET_FILE || '', 'utf8').trim(); }
  catch { /* The public status exposes configuration availability only. */ }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !clientSecret) return undefined;
  // The profile mapper adds QuinTaste's own user fields, so the literal is asserted to Better Auth's option type.
  return /** @type {import('better-auth/social-providers').GoogleOptions} */ (/** @type {unknown} */ ({ clientId, clientSecret, redirectURI: process.env.GOOGLE_REDIRECT_URI,
    prompt: 'select_account', disableDefaultScope: true, scope: ['openid','email'], overrideUserInfoOnSignIn: false,
    /** @param {any} tokens OAuth tokens plus the nonce added by googleNonceBinding. */
    async getUserInfo(tokens) {
      if (!tokens.idToken || !tokens.expectedIdTokenNonce) return null;
      const profile=await verifyGoogleIdToken({token:tokens.idToken,audience:clientId,nonce:tokens.expectedIdTokenNonce});
      if (!profile || profile.email_verified !== true || typeof profile.sub !== 'string' || typeof profile.email !== 'string') return null;
      return {data:profile,user:{id:profile.sub,email:profile.email.toLowerCase(),emailVerified:true,
        name: (typeof profile.name === 'string' && profile.name ? profile.name : profile.email.split('@')[0]).slice(0,50), image: null,
        username: 'google_' + randomUUID().replaceAll('-','').slice(0,20), adultConfirmed: false }};
    },
  }));
}
export const googleNonceBinding = {
  id:'quintaste-google-nonce',
  init(context) {
    return {context:{socialProviders:context.socialProviders.map(provider=>provider.id!=='google'?provider:{
      ...provider,requiresIdTokenNonce:true,
      async createAuthorizationURL(request) {
        if (!request.idTokenNonce) throw new Error('Google nonce required');
        const url=await provider.createAuthorizationURL(request);
        url.searchParams.set('nonce',request.idTokenNonce);return url;
      },
    })}};
  },
};
