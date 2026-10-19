import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useAuth } from '../state/Auth';
import { Screen } from '../components/Screen';
import { Button, T, common } from '../components/ui';
import { AvatarPortrait } from '../components/avatar/AvatarPortrait';
import { AvatarReport } from '../components/avatar/AvatarReport';
import { AvatarLibrary } from '../components/avatar/AvatarLibrary';
import { AvatarCreate } from '../components/avatar/AvatarCreate';
import { accountsEnabled } from '../services/auth-client';
import { useFood } from '../state/Food';
import { usePreferences } from '../state/Preferences';
import { useAvatarPhoto } from '../hooks/useAvatarPhoto';
import { useAvatarGeneration } from '../hooks/useAvatarGeneration';
import { useAvatarEditor } from '../hooks/useAvatarEditor';
import { AutosaveStatus } from '../components/AutosaveStatus';

export function AvatarScreen() {
  const { user } = useAuth();
  const { doc, owner, readable, saving, avatarLibrary } = useFood();
  const { theme, reducedMotion } = usePreferences();
  const editor = useAvatarEditor(), photo = useAvatarPhoto();
  const [creating, setCreating] = useState(false), [agreed, setAgreed] = useState(false);
  const [moving, setMoving] = useState(false), [speaking, setSpeaking] = useState(false), [width, setWidth] = useState(224);
  const [deleting, setDeleting] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [info, setInfo] = useState('');
  useEffect(() => { if (photo.photo || photo.error) void Promise.resolve().then(() => setCreating(true)); }, [photo.photo, photo.error]);
  const generation = useAvatarGeneration(owner, async avatar => { await editor.receive(avatar); setCreating(false); }, photo.clear, user?.id || owner);
  usePreventRemove(generation.busy, () => {});
  useEffect(() => { if (generation.canRetry) void Promise.resolve().then(() => setCreating(true)); }, [generation.canRetry]);
  const busy = saving || editor.busy || photo.busy || generation.busy || avatarLibrary.loading;
  const disabled = !readable || busy;
  const syncError = avatarLibrary.error || editor.error;
  useEffect(() => {
    if (!creating || Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) setCreating(false); return true; });
    return () => handler.remove();
  }, [creating, busy]);
  const selected = editor.preview?.id || 'default';
  const saved = avatarLibrary.items.some(item => item.id === selected);
  const apply = useRef(editor.apply);
  const released = useRef('');
  useLayoutEffect(() => { apply.current = editor.apply; }, [editor.apply]);
  const canAutosave = readable && !busy && (!avatarLibrary.connected || avatarLibrary.ready);
  useEffect(() => {
    if (editor.dirty && !editor.error && canAutosave) void apply.current();
  }, [editor.dirty, editor.error, editor.preview?.id, avatarLibrary.error, canAutosave]);
  const cancel = async () => { try { if (creating) await generation.clear(); else await generation.release(); photo.clear(); setAgreed(false); } catch { if (!creating) setInfo('The temporary preview could not be removed. It will expire automatically.'); } };
  useEffect(() => {
    if (generation.job?.status === 'complete' && generation.job.avatar?.id === doc.avatar?.id && !editor.pending && !busy && released.current !== generation.job.id) {
      released.current = generation.job.id;
      void generation.release().catch(() => setInfo('Your portrait is saved. The temporary preview will expire automatically.'));
    }
  }, [generation, editor.pending, doc.avatar?.id, busy]);
  const select = (id: string) => { setDeleting(false); setMoving(false); setSpeaking(false); void editor.open(id); };
  const items = avatarLibrary.items.length ? avatarLibrary.items : doc.avatar && !doc.avatar.sample
    ? [{ id: doc.avatar.id, createdAt: doc.avatar.createdAt, thumbnail: doc.avatar.frames.base }] : [];
  if (creating) return <Screen title="Create Avatar" back={false}>
    <Button label="Back To My Avatars" variant="link" icon="chevron-back" disabled={busy} onPress={() => setCreating(false)} />
    <AvatarCreate photo={photo} generation={generation} agreed={agreed} onAgree={setAgreed} disabled={disabled}
      hasPending={!!editor.pending} onGenerate={() => { if (photo.photo && agreed) void generation.start(photo.photo); }} />
  </Screen>;
  return <Screen title="Your Avatar" backTo="/account">
    <View style={{ gap: 10, alignItems: 'center', paddingVertical: 8, backgroundColor: theme.accentSoft, borderRadius: 20 }}
      onLayout={event => setWidth(Math.min(224, event.nativeEvent.layout.width - 24))}>
      <AvatarPortrait key={selected} avatar={editor.preview} size={width} animate={moving} speaking={speaking} label={editor.preview ? 'Selected Avatar Preview' : 'Lian, the QuinTaste Mascot'} />
      {editor.preview && <View style={[common.row, { flexWrap: 'wrap', justifyContent: 'center' }]}>
        <Button label={moving ? 'Pause' : 'Animate'} variant="link" disabled={reducedMotion} onPress={() => { setMoving(value => !value); setSpeaking(false); }} />
        <Button label={speaking ? 'Stop Talking' : 'Talking Preview'} variant="link" disabled={reducedMotion} onPress={() => { setMoving(true); setSpeaking(value => !value); }} />
      </View>}
    </View>
    <AutosaveStatus saving={editor.busy || saving || avatarLibrary.loading} local={!avatarLibrary.connected} error={syncError || undefined} />
    {!!syncError && <Button label="Retry" variant="link" disabled={disabled} onPress={() => { if (editor.error) void editor.apply(); else void avatarLibrary.refresh(); }} />}
    {!!info && <T variant="small" muted accessibilityLiveRegion="polite">{info}</T>}
    <AvatarLibrary items={items} pending={editor.pending} selected={selected} disabled={disabled} onSelect={select} />
    {editor.pending && <>{discarding ? <View style={common.stack}>
      <T>Discard the new unsaved portrait? Your saved avatars will stay in your library.</T>
      <Button label="Discard New Portrait" variant="secondary" disabled={disabled} onPress={() => { void editor.discard().then(okay => { if (okay) { setDiscarding(false); void cancel(); } }); }} />
      <Button label="Keep New Portrait" variant="link" disabled={disabled} onPress={() => setDiscarding(false)} />
    </View> : <Button label="Discard Unsaved Portrait" variant="link" disabled={disabled} onPress={() => setDiscarding(true)} />}</>}
    {!avatarLibrary.connected && <T variant="small" muted>Sign in to create your own avatar.</T>}
    {saved && <>{deleting ? <View style={common.stack}>
      <T>Delete this portrait from your account? This cannot be undone. Your other avatars will stay saved.</T>
      <Button label="Delete Portrait Permanently" variant="secondary" disabled={disabled} onPress={() => { void avatarLibrary.remove(selected).then(okay => { if (okay) { editor.setPreview(null); setDeleting(false); } }); }} />
      <Button label="Keep Portrait" variant="link" disabled={disabled} onPress={() => setDeleting(false)} />
    </View> : <Button label="Delete Selected Portrait" variant="link" disabled={disabled} onPress={() => setDeleting(true)} />}</>}
    <Button label="Create New Avatar" icon="add-outline" disabled={busy} onPress={() => { setCreating(true); setDeleting(false); }} />
    {accountsEnabled && editor.preview && !editor.preview.sample && <AvatarReport key={editor.preview.id} avatarId={editor.preview.id} owner={owner} />}
  </Screen>;
}
