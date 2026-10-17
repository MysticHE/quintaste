import { ActivityIndicator, Image, Linking, View } from 'react-native';
import { router } from 'expo-router';
import { Button, T, common } from '../ui';
import { AvatarConsent } from './AvatarConsent';
import { usePreferences } from '../../state/Preferences';
import type { useAvatarPhoto } from '../../hooks/useAvatarPhoto';
import type { useAvatarGeneration } from '../../hooks/useAvatarGeneration';

export function AvatarCreate({ photo, generation, agreed, onAgree, disabled, onGenerate, hasPending }: {
  photo: ReturnType<typeof useAvatarPhoto>; generation: ReturnType<typeof useAvatarGeneration>;
  agreed: boolean; onAgree: (value: boolean) => void; disabled: boolean; onGenerate: () => void; hasPending: boolean;
}) {
  const { theme } = usePreferences();
  const choose = (camera: boolean) => { onAgree(false); void photo.choose(camera); };
  if (generation.busy) return <View style={{ gap: 16, alignItems: 'center', paddingVertical: 40 }}>
    <ActivityIndicator color={theme.accent} size="large" />
    <T accessibilityLiveRegion="polite">Creating your avatar · {Math.min(4, (generation.job?.completed || 0) + 1)} of 4</T>
    <T variant="small" muted>This may take a few minutes.</T>
  </View>;
  if (generation.canRetry) return <View style={{ gap: 12 }}>
    <T accessibilityLiveRegion="polite">{generation.error || 'An avatar is already being created.'}</T>
    <Button label="Reconnect" onPress={() => void generation.retry()} />
  </View>;
  return <View style={{ gap: 12 }}>
    {hasPending ? <T>Your new portrait is kept on this device. Go Back to my avatars to retry saving it or discard it before creating another.</T> : <>
      <T variant="small" muted>Choose a clear, front-facing photo.</T>
      {photo.photo && <Image source={{ uri: photo.photo }} accessibilityLabel="Your selected photo, ready for review" resizeMode="contain" style={{ height: 180, width: '100%', borderRadius: 16 }} />}
      <View style={[common.row, { flexWrap: 'wrap' }]}>
        <Button label={photo.photo ? 'Change Photo' : 'Choose Photo'} variant="secondary" icon="image-outline" disabled={disabled} onPress={() => choose(false)} />
        <Button label="Take Selfie" variant="secondary" icon="camera-outline" disabled={disabled} onPress={() => choose(true)} />
      </View>
      {photo.busy && <T accessibilityLiveRegion="polite">Preparing your photo…</T>}
      {!!photo.error && <T accessibilityLiveRegion="polite" color={theme.error}>{photo.error}</T>}
      {photo.needsSettings && <Button label="Open Camera Settings" variant="secondary" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
      {photo.photo && !generation.busy && <AvatarConsent agreed={agreed} disabled={disabled} onChange={() => onAgree(!agreed)} />}
      {photo.photo && <Button label={generation.busy ? 'Creating Your Avatar…' : 'Generate Avatar'} icon="sparkles-outline" loading={generation.busy}
        disabled={disabled || !agreed || !generation.availability?.available} onPress={onGenerate} />}
      {!!generation.error && <><T color={theme.error} accessibilityLiveRegion="polite">{generation.error}</T>
        {generation.canRetry && <Button label="Check Existing Request" variant="secondary" disabled={generation.busy} onPress={() => void generation.retry()} />}</>}
      {generation.availability?.reason === 'signin' && <><T variant="small">Sign in to create a portrait and keep it in your account.</T>
        <Button label="Sign In" variant="secondary" onPress={() => router.push('/login')} /></>}
      {!generation.availability?.available && generation.availability?.reason !== 'signin' && <>
        <T variant="small" muted>{generation.checking ? 'Checking image service…' : 'Generation is temporarily unavailable. Your saved avatars are still here.'}</T>
        <Button label="Check Connection" variant="link" loading={generation.checking} onPress={() => void generation.check()} />
      </>}
    </>}
  </View>;
}
