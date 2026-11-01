import type { ComponentProps, PropsWithChildren } from "react";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "../Screen";
import { CompactUI } from "../ui-density";
import { Icon, T, common } from "../ui";
/** Feeds and recipe screens: compact type, and the cooking timer bar unless `timers={false}` (Cook mode has its own). */
export function CookLayout(props: ComponentProps<typeof Screen>) {
  return <CompactUI><Screen timers {...props} contentStyle={[{ gap: 10 }, props.contentStyle]} /></CompactUI>;
}
export function CookSection({ title, children, initiallyOpen = false }: PropsWithChildren<{ title: string; initiallyOpen?: boolean }>) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={{ gap: open ? 8 : 0 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={({ pressed }) => [common.row, { minHeight: 48, opacity: pressed ? 0.7 : 1 }]}>
      <T style={[common.flex, common.bold]}>{title}</T><Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
    </Pressable>
    <View style={{ gap: 10, display: open ? "flex" : "none" }} accessibilityElementsHidden={!open} importantForAccessibility={open ? "auto" : "no-hide-descendants"}>{children}</View>
  </View>;
}
