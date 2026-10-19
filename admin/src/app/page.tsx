import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { googleConfigured } from '../lib/config';
import { sessionFromToken, sessionName } from '../lib/session';
import type { SignInError } from '../lib/oauth';
import { GoogleMark, Icon } from '../components/Icon';

const errors: Record<SignInError, string> = {
  denied: 'This Google account is not invited.',
  expired: 'Sign-in expired. Try again.',
  busy: 'Too many attempts. Wait a minute.',
  stuck: 'Sign-in did not stick. Allow cookies for this site.',
  unavailable: 'Sign-in is not configured.',
  failed: 'Sign-in failed. Try again.',
};
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams, error = typeof params.error === 'string' ? errors[params.error as SignInError] ?? errors.failed : '';
  const token = (await cookies()).get(sessionName())?.value ?? '';
  if (token && await sessionFromToken(token).catch(() => null)) redirect('/console/overview');
  const configured = googleConfigured();
  // Opening the console signs in straight away; after a sign-out or a failed attempt the button waits for a click.
  if (configured && !error && !('signedout' in params)) redirect('/auth/login');
  return <main id="main" className="login"><div className="login-card">
    <span className="mark"><Icon name="leaf"/></span>
    <h1>QuinTaste Admin</h1>
    {error && <div className="notice error" role="alert"><Icon name="warning"/>{error}</div>}
    {configured ? <a className="button" href={'signedout' in params || error ? '/auth/login?choose' : '/auth/login'}><GoogleMark/>Continue with Google</a>
      : <div className="notice"><Icon name="warning"/>{errors.unavailable}</div>}
  </div></main>;
}
