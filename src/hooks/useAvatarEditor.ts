import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../state/Auth';
import { useFood } from '../state/Food';
import { usePreferences } from '../state/Preferences';
import { readAvatar, sampleAvatar } from '../utils/avatar-schema';
import type { Avatar } from '../types/avatar';

export function useAvatarEditor() {
  const { user } = useAuth();
  const { doc, owner, patchDocument, avatarLibrary } = useFood();
  const { setNotice } = usePreferences();
  const key = '@quintaste/avatar-preview/' + (owner === 'profile' && user ? user.id : owner);
  const [preview, setPreview] = useState<Avatar | null>(doc.avatar), [pending, setPending] = useState<Avatar | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(key), saving = useRef(false), previewRef = useRef(preview), previousSaved = useRef(doc.avatar);
  useLayoutEffect(() => { current.current = key; previewRef.current = preview; });
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key).then(raw => {
      const avatar = raw ? readAvatar(JSON.parse(raw)) : null;
      if (active && avatar) { setPending(avatar); setPreview(avatar); }
    }).catch(() => { if (active) setError('An unfinished preview could not be loaded. Your saved library is unchanged.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!pending && previewRef.current?.id === previousSaved.current?.id) setPreview(doc.avatar);
    previousSaved.current = doc.avatar;
  }, [doc.avatar, pending]);
  const receive = async (avatar: Avatar) => {
    setPending(avatar); setPreview(avatar); setError(''); setBusy(true);
    try { await AsyncStorage.setItem(key, JSON.stringify(avatar)); }
    catch { setError('Preview is ready, but device storage could not keep it. Save it to your account before leaving.'); }
    finally { if (current.current === key) setBusy(false); }
  };
  const discard = async () => {
    setBusy(true); setError('');
    try {
      await AsyncStorage.removeItem(key);
      if (current.current !== key) return false;
      setPending(null); setPreview(doc.avatar); return true;
    } catch { setError('Could not discard the device preview. Try again.'); return false; }
    finally { if (current.current === key) setBusy(false); }
  };
  const apply = async () => {
    if (saving.current) return false;
    saving.current = true; setBusy(true); setError('');
    const scope = key, avatar = preview;
    try {
      let okay: boolean;
      if (avatarLibrary.connected) {
        if (!avatarLibrary.ready) throw new Error('Reconnect your library before saving. Your preview is kept.');
        okay = avatar && !avatar.sample ? await avatarLibrary.save(avatar) : await avatarLibrary.select(avatar?.id || 'default');
      } else okay = await patchDocument({ avatar });
      if (!okay) throw new Error('Could not save this selection. Your preview is kept; reconnect and retry.');
      if (current.current !== scope) return false;
      if (pending?.id === avatar?.id) { await AsyncStorage.removeItem(key); setPending(null); }
      setNotice({ text: 'Avatar saved' });
      return true;
    } catch (failure) { if (current.current === scope) setError(failure instanceof Error ? failure.message : 'Could not save. Try again.'); return false; }
    finally { saving.current = false; if (current.current === scope) setBusy(false); }
  };
  const open = async (id: string) => {
    setError('');
    if (id === 'default') { setPreview(null); return; }
    if (id === sampleAvatar.id) { setPreview(sampleAvatar); return; }
    if (pending?.id === id) { setPreview(pending); return; }
    if (doc.avatar?.id === id) { setPreview(doc.avatar); return; }
    setBusy(true);
    try {
      const { avatarRequest } = await import('../utils/avatar-api');
      const avatar = readAvatar(await avatarRequest<Avatar>(owner, 'library/' + encodeURIComponent(id)));
      if (!avatar) throw new Error('This avatar could not be opened. Try again.');
      if (current.current === key) setPreview(avatar);
    } catch { setError('Could not open this saved avatar. Reconnect and try again.'); }
    finally { if (current.current === key) setBusy(false); }
  };
  return { preview, pending, busy: busy || !loaded, error, receive, apply, open, discard, setPreview,
    dirty: preview?.id !== doc.avatar?.id, isNew: !!preview && !preview.sample && !avatarLibrary.items.some(item => item.id === preview.id) };
}
