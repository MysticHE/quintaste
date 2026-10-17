'use client';
import { useState } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api, useResource, navigateFresh } from './client';
import Link from 'next/link';
import { Feedback } from './Primitives';

export type StaffSession = { member: { id: string; email: string; role: string; verified: boolean }; keys: { id: string; name: string; created_at: string; last_used_at: string | null }[] };
export default function Verification() {
  const resource = useResource<StaffSession>('/api/auth/session'); const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [name,setName] = useState('My security key');
  async function verify(register: boolean) {
    setBusy(true); setError('');
    try {
      if (register) {
        const optionsJSON = await api<PublicKeyCredentialCreationOptionsJSON>('/api/auth/options',{ intent: 'register' });
        const response = await startRegistration({ optionsJSON });
        await api('/api/auth/register',{ response,name });
        resource.reload();
      } else {
        const optionsJSON = await api<PublicKeyCredentialRequestOptionsJSON>('/api/auth/options',{ intent: 'authenticate' });
        const response = await startAuthentication({ optionsJSON });
        await api('/api/auth/verify',{ response }); navigateFresh('/console/overview');
      }
    } catch(error) { setError(error instanceof Error ? error.message : 'Verification failed. Please try again.'); }
    finally { setBusy(false); }
  }
  async function removeKey(id: string, reason: string) {
    setBusy(true); setError('');
    try { await api('/api/auth/remove-key', { id,reason }); resource.reload(); }
    catch(error) { setError(error instanceof Error ? error.message : 'Could not remove key.'); }
    finally { setBusy(false); }
  }
  return <main id="main" className="login"><div className="login-card"><Link className="brand" href="/">Quin<span>Taste</span></Link>
    <div className="eyebrow">Staff verification</div><h1>Your security key.</h1>
    <Feedback {...resource} retry={resource.reload}/>
    {resource.data && <><p className="muted">{resource.data.member.email}</p>
      {!resource.data.keys.length ? <><p>Register your first security key or passkey, then verify it to enter the console.</p><label>Key name<input value={name} onChange={e => setName(e.target.value)} maxLength={80}/></label><button className="primary" disabled={busy || !name.trim()} onClick={() => verify(true)}>Register security key</button></>
      : <><p>Use a registered key and complete its PIN or biometric check.</p><button className="primary" disabled={busy} onClick={() => verify(false)}>{busy ? 'Waiting for your key…' : 'Verify security key'}</button>
        {resource.data.member.verified && <details><summary>Add a backup key</summary><div className="stack"><label>Key name<input value={name} onChange={e => setName(e.target.value)} maxLength={80}/></label><button disabled={busy || !name.trim()} onClick={() => verify(true)}>Register backup key</button></div></details>}</>}
      {resource.data.member.verified && <details><summary>Manage registered keys</summary>{resource.data.keys.map(key => <form className="panel stack" key={key.id} onSubmit={e => { e.preventDefault(); const form=new FormData(e.currentTarget); void removeKey(key.id,String(form.get('reason'))); }}><strong>{key.name}</strong><label>Removal reason<input name="reason" required minLength={10} maxLength={1000}/></label><button className="danger" disabled={busy || resource.data!.keys.length<2}>Remove key</button></form>)}<small>Keep at least one key. Removing a key signs out other staff sessions for your account.</small></details>}
    </>}{error && <p className="notice error" role="alert">{error}</p>}<div className="divider"/><Link href="/console/overview">Back to console</Link>
  </div></main>;
}
