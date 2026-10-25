import MaskedViewClass from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentType, PropsWithChildren, ReactElement } from "react";
import { StyleSheet, type ViewProps } from "react-native";
import { usePreferences } from "../../state/Preferences";

const MaskedView = MaskedViewClass as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

export function PhotoBlend({ children, fadeAt }: PropsWithChildren<{ fadeAt: number }>) {
  const { theme } = usePreferences();
  return <MaskedView testID="photo-feather-mask" style={StyleSheet.absoluteFill}
    maskElement={<LinearGradient colors={[theme.transparent, theme.mediaForeground, theme.mediaForeground]}
      locations={[0, fadeAt, 1]} style={StyleSheet.absoluteFill} />}>
    {children}
  </MaskedView>;
}
