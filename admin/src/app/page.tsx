import { googleConfigured } from '../lib/config';
import Link from 'next/link';
export default function Home() {
  const configured = googleConfigured();
  return <main id="main" className="login"><div className="login-card">
    <Link className="brand" href="/">Quin<span>Taste</span></Link><div className="eyebrow">Staff workspace</div>
    <h1>Care for the community.</h1><p className="muted">Manage accounts, review cases and keep QuinTaste running safely.</p>
    {configured ? <a className="button primary" href="/auth/login">Continue with Google</a> : <div className="notice">Staff sign-in is awaiting configuration. Access remains locked.</div>}
    <p className="muted">For invited staff only. Google sign-in is followed by security-key or passkey verification.</p>
    <div className="divider"/><small>Customer accounts use the QuinTaste app. This workspace never displays customer passwords or OpenAI keys.</small>
  </div></main>;
}
