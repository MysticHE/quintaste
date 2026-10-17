import { useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Chip, HorizontalChips, IconButton } from "./food/Controls";
import { Icon, T, common } from "./ui";
import { usePreferences } from "../state/Preferences";
import { fontNames } from "../theme/tokens";

/** A message bubble: yours on the right in the accent tint, the other side on the left on the card surface. */
export function ChatBubble({ text, mine, label }: { text: string; mine: boolean; label: string }) {
  const { theme } = usePreferences();
  return <View accessible accessibilityLabel={label} style={[s.bubble, mine ? [s.mine, { backgroundColor: theme.accentSoft }] : [s.theirs, { backgroundColor: theme.card, borderColor: theme.border }]]}>
    <T>{text}</T>
  </View>;
}
/** One-line composer: optional starter suggestions, the message field and a send arrow. Returns true from onSend to clear the field. */
export function ChatComposer({ onSend, starters = [], sendLabel = "Send message", disabled = false }: {
  onSend: (text: string) => Promise<boolean>; starters?: readonly string[]; sendLabel?: string; disabled?: boolean;
}) {
  const { theme, textMultiplier } = usePreferences();
  const [text, setText] = useState(""), [open, setOpen] = useState(false), [focused, setFocused] = useState(false), [busy, setBusy] = useState(false);
  const ready = !!text.trim() && !busy && !disabled;
  const send = async () => {
    if (!ready) return;
    setBusy(true);
    try { if (await onSend(text)) setText(""); } finally { setBusy(false); }
  };
  return <View style={{ gap: 8 }}>
    {open && <HorizontalChips>{starters.map(line => <Chip key={line} label={line} compact onPress={() => { setText(line); setOpen(false); }} />)}</HorizontalChips>}
    <View style={[common.row, { gap: 8, alignItems: "flex-end" }]}>
      {!!starters.length && <IconButton label="Suggested messages" icon="sparkles-outline" selected={open} onPress={() => setOpen(!open)} />}
      <TextInput value={text} onChangeText={setText} maxLength={1000} multiline numberOfLines={1} placeholder="Message" accessibilityLabel="Message"
        editable={!disabled} placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={[s.input, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border, color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier },
          Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={sendLabel} accessibilityState={{ disabled: !ready, busy }} disabled={!ready} onPress={() => void send()}
        style={({ pressed }) => [s.send, { backgroundColor: ready ? theme.action[0] : theme.muted, opacity: pressed ? .8 : 1 }]}>
        <Icon name="arrow-up" size={22} color={ready ? theme.actionForeground : theme.mutedForeground} />
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  bubble: { maxWidth: "85%", paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 6, borderWidth: 1 },
  input: { flex: 1, minWidth: 0, minHeight: 48, maxHeight: 120, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
