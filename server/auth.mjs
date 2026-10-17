import { AsyncLocalStorage } from 'node:async_hooks';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { expo } from '@better-auth/expo';
import { username, oneTimeToken } from 'better-auth/plugins';
import { googleOptions, googleNonceBinding } from './google/config.mjs';
import { logger, origin, pool, authOrigins } from './config.mjs';
import { normalizeUsername, validUsername, passwordMinimum, passwordMaximum } from './account-policy.mjs';
import { allowed, restricted } from './operations.mjs';

export const eligibility = new AsyncLocalStorage();
const google = googleOptions();
export const auth = betterAuth({
  appName: 'QuinTaste', baseURL: origin, secret: process.env.BETTER_AUTH_SECRET,
  database: pool, trustedOrigins: authOrigins,
  socialProviders: google ? { google } : {},
  account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
  plugins: [googleNonceBinding, expo(), oneTimeToken({ expiresIn: 1, storeToken: 'hashed', disableClientRequest: true }), username({
    displayUsername: false, immutableUsername: true,
    minUsernameLength: 3, maxUsernameLength: 30,
    usernameNormalization: normalizeUsername, usernameValidator: validUsername,
  })],
  emailAndPassword: {
    enabled: true, minPasswordLength: passwordMinimum, maxPasswordLength: passwordMaximum,
    requireEmailVerification: false, autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    additionalFields: {
      adultConfirmed: { type: 'boolean', defaultValue: false, input: false },
      bio: { type: 'string', defaultValue: '', input: false },
    },
    deleteUser: { enabled: true },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 12, freshAge: 60 * 10 },
  rateLimit: { enabled: true, storage: 'database', window: 60, max: 30,
    // These session actions are covered by the verified-account API limiter. A shared-IP
    // authentication bucket must not block unrelated signed-in users on the same network.
    // Credential, registration, recovery and OAuth protections remain enabled.
    customRules: Object.fromEntries(['/get-session', '/sign-out', '/list-sessions', '/revoke-session',
      '/revoke-sessions', '/revoke-other-sessions', '/delete-user'].map(path => [path, false])),
  },
  advanced: { useSecureCookies: origin.startsWith('https://'), cookiePrefix: 'quintaste',
    ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
  databaseHooks: { user: { create: { before: async (user) => {
    if (!await allowed('registration')) throw new APIError('FORBIDDEN', { message: 'Registration is temporarily unavailable.' });
    const adult = eligibility.getStore()?.adult === true;
    if (!adult && !(user.emailVerified === true && typeof user.username === 'string' && user.username.startsWith('google_'))) {
      throw new APIError('FORBIDDEN', { message: 'Complete the date-of-birth check first.' });
    }
    if (!validUsername(user.username)) throw new APIError('BAD_REQUEST', { message: 'Choose a valid username.' });
    return { data: { ...user, name: user.name.trim().slice(0, 50), adultConfirmed: adult } };
  } } }, session: { create: { before: async (session) => {
    if (await restricted(session.userId)) throw new APIError('FORBIDDEN', { message: 'Account access is restricted.' });
    return { data: session };
  } } } },
  logger: { level: 'error', log: (level) => logger.error({ event: 'authentication_error', level }) },
});
