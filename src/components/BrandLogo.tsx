import { Image } from 'expo-image';

export const QUINTASTE_LOGO = require('../../assets/brand/quintaste-logo.png');

/** Approved rounded wordmark and sprout, with its original brand colours. */
export function BrandLogo({ width = 240, decorative = false }: {
  width?: number; decorative?: boolean;
}) {
  return <Image testID="quintaste-logo" source={QUINTASTE_LOGO} contentFit="contain" transition={0}
    accessible={!decorative} accessibilityLabel={decorative ? undefined : 'QuinTaste'}
    style={{ width, height: width / 3 }} />;
}
