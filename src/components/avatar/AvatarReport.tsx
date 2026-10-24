import { useState } from 'react';
import { Button, Card, Field, T, common } from '../ui';
import { avatarRequest } from '../../utils/avatar-api';
import type { LocalOwner } from '../../types/explore-local';
import { useT } from '../../i18n';

export function AvatarReport({ avatarId, owner }: { avatarId: string; owner: LocalOwner }) {
  const [open,setOpen]=useState(false), [description,setDescription]=useState('');
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [reference,setReference]=useState(''), t=useT('me');
  async function send() {
    if (busy) return; setBusy(true); setError('');
    try {
      const result=await avatarRequest<{reference:string}>(owner,'reports',{
        method:'POST',body:JSON.stringify({avatarId,description:description.trim()}),
      });
      setReference(result.reference); setDescription('');
    } catch(error) { setError(error instanceof Error ? error.message : t('avatarReportFailed')); }
    finally { setBusy(false); }
  }
  if (!open) return <Button label={t('reportAvatar')} variant="link" onPress={() => setOpen(true)} />;
  return <Card style={common.stack}>
    <T variant="subtitle" accessibilityRole="header">{t('reportAvatar')}</T>
    {reference ? <><T accessibilityLiveRegion="polite">{t('avatarReportSent')}</T><T selectable>{t('referenceLine', { reference })}</T></>
      : <><T variant="small">{t('avatarReportNote')}</T>
        <Field label={t('whatWentWrong')} value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} />
        <Button label={t('sendAvatarReport')} loading={busy} disabled={busy || description.trim().length<10} onPress={() => void send()} />
        {!!error && <T accessibilityLiveRegion="polite">{error}</T>}</>}
    <Button label={t('closeReport')} variant="link" disabled={busy} onPress={() => setOpen(false)} />
  </Card>;
}
