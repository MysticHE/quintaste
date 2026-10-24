import { ActivityIndicator, Image, Linking, View } from 'react-native';
import { router } from 'expo-router';
import { Button, T, common } from '../ui';
import { AvatarConsent } from './AvatarConsent';
import { usePreferences } from '../../state/Preferences';
import type { useAvatarPhoto } from '../../hooks/useAvatarPhoto';
import type { useAvatarGeneration } from '../../hooks/useAvatarGeneration';
import { useT } from '../../i18n';

export function AvatarCreate({ photo, generation, agreed, onAgree, disabled, onGenerate, hasPending }: {
  photo: ReturnType<typeof useAvatarPhoto>; generation: ReturnType<typeof useAvatarGeneration>;
  agreed: boolean; onAgree: (value: boolean) => void; disabled: boolean; onGenerate: () => void; hasPending: boolean;
}) {
  const { theme } = usePreferences(), t = useT('me'), tc = useT('common');
  const choose = (camera: boolean) => { onAgree(false); void photo.choose(camera); };
  if (generation.busy) return <View style={{ gap: 16, alignItems: 'center', paddingVertical: 40 }}>
    <ActivityIndicator color={theme.accent} size="large" />
    <T accessibilityLiveRegion="polite">{t('creatingAvatar', { n: Math.min(4, (generation.job?.completed || 0) + 1) })}</T>
    <T variant="small" muted>{t('mayTakeMinutes')}</T>
  </View>;
  if (generation.canRetry) return <View style={{ gap: 12 }}>
    <T accessibilityLiveRegion="polite">{generation.error || t('avatarInProgress')}</T>
    <Button label={t('reconnect')} onPress={() => void generation.retry()} />
  </View>;
  return <View style={{ gap: 12 }}>
    {hasPending ? <T>{t('pendingPortraitNote')}</T> : <>
      <T variant="small" muted>{t('choosePhotoHint')}</T>
      {photo.photo && <Image source={{ uri: photo.photo }} accessibilityLabel={t('selectedPhotoLabel')} resizeMode="contain" style={{ height: 180, width: '100%', borderRadius: 16 }} />}
      <View style={[common.row, { flexWrap: 'wrap' }]}>
        <Button label={photo.photo ? t('changePhoto') : t('choosePhoto')} variant="secondary" icon="image-outline" disabled={disabled} onPress={() => choose(false)} />
        <Button label={t('takeSelfie')} variant="secondary" icon="camera-outline" disabled={disabled} onPress={() => choose(true)} />
      </View>
      {photo.busy && <T accessibilityLiveRegion="polite">{t('preparingPhoto')}</T>}
      {!!photo.error && <T accessibilityLiveRegion="polite" color={theme.error}>{photo.error}</T>}
      {photo.needsSettings && <Button label={t('openCameraSettings')} variant="secondary" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
      {photo.photo && !generation.busy && <AvatarConsent agreed={agreed} disabled={disabled} onChange={() => onAgree(!agreed)} />}
      {photo.photo && <Button label={generation.busy ? t('creatingAvatarButton') : t('generateAvatar')} icon="sparkles-outline" loading={generation.busy}
        disabled={disabled || !agreed || !generation.availability?.available} onPress={onGenerate} />}
      {!!generation.error && <><T color={theme.error} accessibilityLiveRegion="polite">{generation.error}</T>
        {generation.canRetry && <Button label={t('checkExistingRequest')} variant="secondary" disabled={generation.busy} onPress={() => void generation.retry()} />}</>}
      {generation.availability?.reason === 'signin' && <><T variant="small">{t('signInForPortrait')}</T>
        <Button label={tc('signIn')} variant="secondary" onPress={() => router.push('/login')} /></>}
      {!generation.availability?.available && generation.availability?.reason !== 'signin' && <>
        <T variant="small" muted>{generation.checking ? t('checkingService') : t('generationUnavailable')}</T>
        <Button label={t('checkConnection')} variant="link" loading={generation.checking} onPress={() => void generation.check()} />
      </>}
    </>}
  </View>;
}
