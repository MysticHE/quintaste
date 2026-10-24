import type { PropsWithChildren } from "react";
import { View } from "react-native";

export function SuggestionList({ id, label, children }: PropsWithChildren<{ id: string; label: string }>) {
  return <View nativeID={id} role="list" accessibilityLabel={label}>{children}</View>;
}
