import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import { usePreferences } from "../../state/Preferences";

export function PhotoBlend({ children, fadeAt }: PropsWithChildren<{ fadeAt: number }>) {
  const { theme } = usePreferences();
  return <MaskedView testID="photo-feather-mask" style={StyleSheet.absoluteFill}
    maskElement={<LinearGradient colors={[theme.transparent, theme.mediaForeground, theme.mediaForeground]}
      locations={[0, fadeAt, 1]} style={StyleSheet.absoluteFill} />}>
    {children}
  </MaskedView>;
}
