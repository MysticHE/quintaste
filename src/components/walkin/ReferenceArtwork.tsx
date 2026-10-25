import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { usePreferences } from '../../state/Preferences';

const illustrations = [
  require('../../../assets/walkin/references/01-Dining-together.webp'),
  require('../../../assets/walkin/references/02-AI-recipes.webp'),
  require('../../../assets/walkin/references/03-Play-to-learn.webp'),
  require('../../../assets/walkin/references/04-Community.webp'),
] as const;
const signIn = require('../../../assets/walkin/references/05-Sign-in.webp');
const username = require('../../../assets/walkin/references/06-Username-sign-in.webp');

/** Keep the supplied artwork intact. Only its illustration is visible; all page copy and controls are native views. */
function ArtworkRegion({ source, width, from, to, sourceHeight = 1844, fade = false }: {
  source: ImageSource; width: number; from: number; to: number; sourceHeight?: number; fade?: boolean;
}) {
  const { theme } = usePreferences();
  const scale = width / 853;
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={{ width, height: (to - from) * scale, overflow: 'hidden' }}>
    <Image source={source} contentFit="fill" accessible={false} transition={0}
      style={{ position: 'absolute', left: 0, top: -from * scale, width, height: sourceHeight * scale }} />
    {fade && <LinearGradient colors={[theme.transparent, theme.welcome.background]} pointerEvents="none"
      style={[s.fade, { height: (theme.dark ? 100 : 40) * scale }]} />}
  </View>;
}

export function IntroductionArtwork({ page, width }: { page: number; width: number }) {
  // Starts below the reference's status bar and ends before its headline. The exact logo stays in the art.
  return <ArtworkRegion source={illustrations[page]} width={width} from={84} to={1340} fade />;
}

export function BrandArtwork({ width, compact }: { width: number; compact: boolean }) {
  return <View accessible accessibilityRole="image" accessibilityLabel="QuinTaste">
    <ArtworkRegion source={compact ? username : signIn} width={width} from={84} to={204} sourceHeight={compact ? 1843 : 1844} />
  </View>;
}

export function SignInArtwork({ width, compact }: { width: number; compact: boolean }) {
  // The reference's drawn Back arrow is above this region; WelcomeBack supplies the real control.
  return <ArtworkRegion source={compact ? username : signIn} width={width} from={204} to={compact ? 741 : 933}
    sourceHeight={compact ? 1843 : 1844} fade />;
}

const s = StyleSheet.create({ fade: { position: 'absolute', bottom: 0, left: 0, right: 0 } });
