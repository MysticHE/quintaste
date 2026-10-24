import * as Linking from "expo-linking";
import { Link } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { Icon, T } from "../ui";
import { useT } from "../../i18n";

export function MenuSourceLink({ url, publisher, label }: { url: string; publisher: string; label?: string }) {
  const { setNotice } = usePreferences(), t = useT("explore"), text = label ?? t("menuSource");
  const open = async () => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: t("menuSourceFailed"), error: true }); }
  };
  return <Link href={url as `https://${string}`} target="_blank" rel="noopener noreferrer" asChild
    onPress={event => { if (Platform.OS !== "web") { event.preventDefault(); void open(); } }}>
    <SourceControl label={text} accessibilityLabel={t("sourceLinkA11y", { label: text, publisher })} />
  </Link>;
}

function SourceControl({ label, ...props }: ComponentProps<typeof Pressable> & { label: string }) {
  const { theme } = usePreferences(), [focused, setFocused] = useState(false);
  return <Pressable {...props} accessibilityRole="link"
    {...(Platform.OS === "web" ? { hrefAttrs: { target: "_blank", rel: "noopener noreferrer" } } : {})}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [s.source, { borderColor: focused ? theme.accent : theme.transparent, opacity: pressed ? 0.7 : 1 }]}>
    <T variant="caption" color={theme.accent} style={{ flexShrink: 1 }}>{label}</T>
    <Icon name="open-outline" size={16} color={theme.accent} />
  </Pressable>;
}
const s = StyleSheet.create({
  source: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 2, borderRadius: 10, paddingHorizontal: 4, flexShrink: 0 },
});
