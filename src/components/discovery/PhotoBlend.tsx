import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { usePreferences } from "../../state/Preferences";

export function PhotoBlend({ children, fadeAt }: PropsWithChildren<{ fadeAt: number }>) {
  const { theme } = usePreferences();
  const mask = `linear-gradient(to bottom, ${theme.transparent}, ${theme.mediaForeground} ${fadeAt * 100}%, ${theme.mediaForeground})`;
  const feather: ViewStyle & { maskImage: string; WebkitMaskImage: string } = { maskImage: mask, WebkitMaskImage: mask };
  return <View testID="photo-feather-mask" style={[StyleSheet.absoluteFill, feather]}>{children}</View>;
}
