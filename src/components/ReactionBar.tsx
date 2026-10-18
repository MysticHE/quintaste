import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from "react-native";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { useReaction, type ReactionKind } from "../hooks/useReactions";
import { Icon, T, common, type IconName } from "./ui";

/** 1,234 → 1.2k; zero shows no number so something new reads as fresh rather than ignored. */
export function compactCount(n: number) {
  if (n <= 0) return "";
  if (n < 1000) return String(n);
  return (n < 10000 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "") : String(Math.floor(n / 1000))) + "k";
}

/**
 * Like and share with their counts, the post idiom shared by Explore places and Cook recipes. `trailing` adds controls
 * on the right (a recipe page's save and info). A failed share sheet hands its text to `onShareFailed`.
 */
export function ReactionBar({ kind, id, name, shareMessage, trailing, onShareFailed }: {
  kind: ReactionKind; id: string; name: string; shareMessage: () => string; trailing?: ReactNode; onShareFailed?: (text: string) => void;
}) {
  const { theme, setNotice } = usePreferences(), { reaction, enabled, toggleLike, recordShare } = useReaction(kind, id);
  const share = async () => {
    const message = shareMessage();
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) void recordShare();
    } catch {
      if (onShareFailed) onShareFailed(message); else setNotice({ text: "Sharing isn't available here.", error: true });
    }
  };
  const people = (n: number, one: string, many: string) => n ? ", " + n + " " + (n === 1 ? one : many) : "";
  return <View style={s.row}>
    {enabled && <Action icon={reaction.liked ? "heart" : "heart-outline"} color={reaction.liked ? theme.accent : theme.foreground} count={compactCount(reaction.likes)}
      label={(reaction.liked ? "Unlike " : "Like ") + name + people(reaction.likes, "like", "likes")} selected={reaction.liked} onPress={() => void toggleLike()} />}
    <Action icon="paper-plane-outline" color={theme.foreground} count={enabled ? compactCount(reaction.shares) : ""}
      label={"Share " + name + (enabled ? people(reaction.shares, "share", "shares") : "")} onPress={() => void share()} />
    <View style={common.flex} />
    {trailing}
  </View>;
}
/** A bare icon with an optional count: lighter than bordered buttons, with a 48-point target. */
export function Action({ icon, color, count = "", label, onPress, selected, busy = false, disabled = false }: {
  icon: IconName; color: string; count?: string; label: string; onPress: () => void; selected?: boolean; busy?: boolean; disabled?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled: disabled || busy, busy }} disabled={disabled || busy}
    onPress={onPress} hitSlop={4} {...focusProps}
    style={({ pressed }) => [common.row, s.action, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.muted : theme.transparent, opacity: disabled ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color={theme.accent} /> : <Icon name={icon} size={24} color={color} />}
    {!!count && <T style={common.bold}>{count}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  action: { gap: 6, minWidth: 48, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, borderWidth: 2, justifyContent: "center" },
});
