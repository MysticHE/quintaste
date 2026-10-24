import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Platform, Pressable, Share, StyleSheet, View, type TextStyle } from "react-native";
import { usePreferences } from "../state/Preferences";
import { useKeyboardFocus } from "../hooks/useKeyboardFocus";
import { useReaction, type ReactionKind } from "../hooks/useReactions";
import { T, common, type IconName } from "./ui";
import { translate, useT, type Language } from "../i18n";

/** 1,234 → 1.2k; zero shows no number so something new reads as fresh rather than ignored. */
export function compactCount(n: number) {
  if (n <= 0) return "";
  if (n < 1000) return String(n);
  return (n < 10000 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "") : String(Math.floor(n / 1000))) + "k";
}

/** "Cooked by 1 person" / "Cooked by 1.2k people"; pass the interface language from useLanguage(). */
export const cookedBy = (n: number, language: Language = "en") => translate(language, "common", "cookedBy", { n, count: compactCount(n) || "0" });

/**
 * Like and share with their counts, the post idiom shared by Explore places and Cook recipes. `trailing` adds controls
 * on the right (a recipe page's save and info). A failed share sheet hands its text to `onShareFailed`.
 */
export function ReactionBar({ kind, id, name, shareMessage, trailing, onShareFailed }: {
  kind: ReactionKind; id: string; name: string; shareMessage: () => string; trailing?: ReactNode; onShareFailed?: (text: string) => void;
}) {
  const { theme } = usePreferences(), { reaction, enabled, toggleLike, share } = useReactionActions(kind, id, shareMessage, onShareFailed), t = useT("common");
  return <View style={s.row}>
    {enabled && <Action icon={reaction.liked ? "heart" : "heart-outline"} color={reaction.liked ? theme.accent : theme.foreground} count={compactCount(reaction.likes)}
      label={t(reaction.liked ? "unlikeName" : "likeName", { name }) + t("likesCount", { n: reaction.likes })} selected={reaction.liked} onPress={() => void toggleLike()} />}
    <Action icon="arrow-redo-outline" color={theme.foreground} count={enabled ? compactCount(reaction.shares) : ""}
      label={t("shareName", { name }) + (enabled ? t("sharesCount", { n: reaction.shares }) : "")} onPress={() => void share()} />
    <View style={common.flex} />
    {trailing}
  </View>;
}
/**
 * The photo card's version: like, save and share stacked down the right edge of the photo, each count under its icon,
 * filled white with a shadow so they read on any photo; liked or saved turns the icon the accent colour.
 */
export function ReactionColumn({ kind, id, name, shareMessage, save }: {
  kind: ReactionKind; id: string; name: string; shareMessage: () => string;
  save: { saved: boolean; busy: boolean; disabled: boolean; onPress: () => void };
}) {
  const { theme } = usePreferences(), { reaction, enabled, toggleLike, share } = useReactionActions(kind, id, shareMessage), t = useT("common");
  return <View style={s.column}>
    {enabled && <Action stacked icon="heart" color={reaction.liked ? theme.accent : theme.mediaForeground} count={compactCount(reaction.likes)}
      label={t(reaction.liked ? "unlikeName" : "likeName", { name }) + t("likesCount", { n: reaction.likes })} selected={reaction.liked} onPress={() => void toggleLike()} />}
    <Action stacked icon="bookmark" color={save.saved ? theme.accent : theme.mediaForeground} busy={save.busy} disabled={save.disabled}
      label={t(save.saved ? "removeSavedName" : "saveName", { name })} selected={save.saved} onPress={save.onPress} />
    <Action stacked icon="arrow-redo" color={theme.mediaForeground} count={enabled ? compactCount(reaction.shares) : ""}
      label={t("shareName", { name }) + (enabled ? t("sharesCount", { n: reaction.shares }) : "")} onPress={() => void share()} />
  </View>;
}
function useReactionActions(kind: ReactionKind, id: string, shareMessage: () => string, onShareFailed?: (text: string) => void) {
  const { setNotice } = usePreferences(), { reaction, enabled, toggleLike, recordShare } = useReaction(kind, id), t = useT("common");
  const share = async () => {
    const message = shareMessage();
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) void recordShare();
    } catch {
      if (onShareFailed) onShareFailed(message); else setNotice({ text: t("shareUnavailable"), error: true });
    }
  };
  return { reaction, enabled, toggleLike, share };
}
/** A dark halo under white icons and counts. React Native Web ignores the native textShadow* props, so web gets CSS. */
function halo(color: string): TextStyle {
  if (Platform.OS === "web") return { textShadow: `0 1px 6px ${color}, 0 0 2px ${color}` } as TextStyle;
  return { textShadowColor: color, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };
}
/**
 * A bare icon with an optional count and a 48-point target. `stacked` puts the count under the icon in white with a
 * halo for use on photos; otherwise the count sits beside the icon in the theme colours.
 */
export function Action({ icon, color, count = "", label, onPress, selected, busy = false, disabled = false, stacked = false }: {
  icon: IconName; color: string; count?: string; label: string; onPress: () => void; selected?: boolean; busy?: boolean; disabled?: boolean; stacked?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const shadow = stacked ? halo(theme.mediaSurface) : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled: disabled || busy, busy }} disabled={disabled || busy}
    onPress={onPress} hitSlop={stacked ? 0 : 4} {...focusProps}
    style={({ pressed }) => [stacked ? s.stacked : [common.row, s.action], {
      borderColor: focused ? (stacked ? theme.mediaForeground : theme.accent) : theme.transparent,
      backgroundColor: !stacked && pressed ? theme.muted : theme.transparent, opacity: disabled ? 0.5 : stacked && pressed ? 0.7 : 1 }]}>
    {busy ? <ActivityIndicator color={stacked ? theme.mediaForeground : theme.accent} /> : <Ionicons name={icon} size={stacked ? 28 : 24} color={color} style={shadow} />}
    {!!count && <T variant={stacked ? "small" : "body"} color={stacked ? theme.mediaForeground : undefined} style={[common.bold, shadow]}>{count}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2 },
  action: { gap: 6, minWidth: 48, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, borderWidth: 2, justifyContent: "center" },
  column: { alignItems: "center", gap: 4 },
  stacked: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, paddingVertical: 2 },
});
