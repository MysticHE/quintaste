import { useState } from "react";
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useRecipeReaction } from "../../hooks/useRecipeReactions";
import { recipeShareMessage } from "../../utils/recipe-share";
import { Icon, T, common, type IconName } from "../ui";

/** 1,234 → 1.2k; zero shows no number so a new recipe reads as fresh rather than ignored. */
export function compactCount(n: number) {
  if (n <= 0) return "";
  if (n < 1000) return String(n);
  return (n < 10000 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "") : String(Math.floor(n / 1000))) + "k";
}

/**
 * The post action row under a recipe photo: like and share with their counts on the left, save on the right.
 * `extra` adds a trailing control (the recipe page's info button). Sharing falls back to `onShareFailed` with the text.
 */
export function RecipeActions({ recipe, extra, onShareFailed }: { recipe: Recipe; extra?: React.ReactNode; onShareFailed?: (text: string) => void }) {
  const { isSaved, toggleSave, readable } = useFood(), { theme, setNotice } = usePreferences();
  const { reaction, enabled, toggleLike, recordShare } = useRecipeReaction(recipe.id);
  const [saving, setSaving] = useState(false), saved = isSaved("recipe", recipe.id);
  const save = async () => { if (saving || !readable) return; setSaving(true); try { await toggleSave("recipe", recipe.id); } finally { setSaving(false); } };
  const share = async () => {
    const message = recipeShareMessage(recipe);
    try {
      const result = await Share.share({ message });
      if (result.action === Share.sharedAction) void recordShare();
    } catch {
      if (onShareFailed) onShareFailed(message); else setNotice({ text: "Sharing isn't available here.", error: true });
    }
  };
  const likes = compactCount(reaction.likes), shares = compactCount(reaction.shares);
  return <View style={s.row}>
    {enabled && <Action icon={reaction.liked ? "heart" : "heart-outline"} color={reaction.liked ? theme.accent : theme.foreground} count={likes}
      label={(reaction.liked ? "Unlike " : "Like ") + recipe.name + (reaction.likes ? ", " + reaction.likes + (reaction.likes === 1 ? " like" : " likes") : "")}
      selected={reaction.liked} onPress={() => void toggleLike()} />}
    <Action icon="paper-plane-outline" color={theme.foreground} count={enabled ? shares : ""}
      label={"Share " + recipe.name + (enabled && reaction.shares ? ", shared by " + reaction.shares + (reaction.shares === 1 ? " person" : " people") : "")} onPress={() => void share()} />
    <View style={common.flex} />
    <Action icon={saved ? "bookmark" : "bookmark-outline"} color={saved ? theme.accent : theme.foreground} busy={saving} disabled={!readable}
      label={(saved ? "Remove saved " : "Save ") + recipe.name} selected={saved} onPress={() => void save()} />
    {extra}
  </View>;
}
/** A bare icon with an optional count: the post idiom, lighter than bordered buttons. */
export function Action({ icon, color, count = "", label, onPress, selected, busy = false, disabled = false }: {
  icon: IconName; color: string; count?: string; label: string; onPress: () => void; selected?: boolean; busy?: boolean; disabled?: boolean;
}) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled: disabled || busy, busy }} disabled={disabled || busy}
    onPress={onPress} hitSlop={4} {...focusProps}
    style={({ pressed }) => [common.row, s.action, { borderColor: focused ? theme.accent : theme.transparent, backgroundColor: pressed ? theme.muted : theme.transparent, opacity: disabled ? 0.5 : 1 }]}>
    {busy ? <ActivityIndicator color={theme.accent} /> : <Icon name={icon} size={25} color={color} />}
    {!!count && <T style={common.bold}>{count}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2, marginHorizontal: -8 },
  action: { gap: 6, minWidth: 48, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, borderWidth: 2, justifyContent: "center" },
});
