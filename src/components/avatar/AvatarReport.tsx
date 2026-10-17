import { useState } from 'react';
import { Button, Card, Field, T, common } from '../ui';
import { avatarRequest } from '../../utils/avatar-api';
import type { LocalOwner } from '../../types/explore-local';

export function AvatarReport({ avatarId, owner }: { avatarId: string; owner: LocalOwner }) {
  const [open,setOpen]=useState(false), [description,setDescription]=useState('');
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [reference,setReference]=useState('');
  async function send() {
    if (busy) return; setBusy(true); setError('');
    try {
      const result=await avatarRequest<{reference:string}>(owner,'reports',{
        method:'POST',body:JSON.stringify({avatarId,description:description.trim()}),
      });
      setReference(result.reference); setDescription('');
    } catch(error) { setError(error instanceof Error ? error.message : 'Your report could not be sent. Please try again.'); }
    finally { setBusy(false); }
  }
  if (!open) return <Button label="Report Avatar" variant="link" onPress={() => setOpen(true)} />;
  return <Card style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">Report Avatar</T>
    {reference ? <><T accessibilityLiveRegion="polite">Report sent to the QuinTaste team.</T><T selectable>Reference: {reference}</T></>
      : <><T variant="small">We will send your description, your account reference and this avatar’s reference. Your selfie and avatar image are not attached.</T>
        <Field label="What Went Wrong?" value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} />
        <Button label="Send Avatar Report" loading={busy} disabled={busy || description.trim().length<10} onPress={() => void send()} />
        {!!error && <T accessibilityLiveRegion="polite">{error}</T>}</>}
    <Button label="Close Report" variant="link" disabled={busy} onPress={() => setOpen(false)} />
  </Card>;
}
