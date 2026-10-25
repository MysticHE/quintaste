import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputInstance } from "react-native";
import { Chip, HorizontalChips, IconButton } from "./food/Controls";
import { Icon, T, common } from "./ui";
import { usePreferences } from "../state/Preferences";
import { fontNames } from "../theme/tokens";
import { useT } from "../i18n";

/** A message bubble: yours on the right in the accent tint, the other side on the left on the card surface. */
export function ChatBubble({ text, mine, label, time }: { text: string; mine: boolean; label: string; time?: string }) {
  const { theme } = usePreferences();
  return <View accessible accessibilityLabel={label} style={[s.bubble, mine ? [s.mine, { backgroundColor: theme.accentSoft }] : [s.theirs, { backgroundColor: theme.card, borderColor: theme.border }]]}>
    <T>{text}</T>
    {!!time && <T variant="caption" muted style={{ textAlign: mine ? "right" : "left", marginTop: 4 }}>{time}</T>}
  </View>;
}
/**
 * One-line composer: optional starter suggestions, the message field and a send arrow. Returns true from onSend to clear the field.
 * `seed` places text in the field (for example a table-talk question) without sending it.
 */
export function ChatComposer({ onSend, starters = [], sendLabel, disabled = false, seed, placeholder }: {
  onSend: (text: string) => Promise<boolean>; starters?: readonly string[]; sendLabel?: string; disabled?: boolean; seed?: { text: string; at: number }; placeholder?: string;
}) {
  const { theme, textMultiplier } = usePreferences(), t = useT("common");
  const [text, setText] = useState(""), [open, setOpen] = useState(false), [focused, setFocused] = useState(false), [busy, setBusy] = useState(false);
  const input = useRef<TextInputInstance>(null), [inputHeight, setInputHeight] = useState(48);
  const measureWeb = useCallback(() => {
    if (Platform.OS !== "web") return;
    const node = input.current as unknown as HTMLTextAreaElement | null;
    if (!node?.style) return;
    node.style.height = "0px";
    const height = Math.max(48, Math.min(120, node.scrollHeight + 2));
    node.style.height = height + "px";
    setInputHeight(current => current === height ? current : height);
  }, []);
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    measureWeb();
    let active = true;
    void document.fonts.ready.then(() => { if (active) measureWeb(); });
    window.addEventListener("resize", measureWeb);
    return () => { active = false; window.removeEventListener("resize", measureWeb); };
  }, [text, placeholder, textMultiplier, measureWeb]);
  // A new seed replaces the draft once (state adjusted during render rather than in an effect).
  const [placed, setPlaced] = useState(seed);
  if (seed !== placed) { setPlaced(seed); if (seed) setText(seed.text); }
  const ready = !!text.trim() && !busy && !disabled;
  const sending = useRef(false);
  const send = async () => {
    if (!ready || sending.current) return;
    sending.current = true;
    setBusy(true);
    try { if (await onSend(text)) setText(""); } finally { sending.current = false; setBusy(false); }
  };
  return <View style={{ gap: 8 }}>
    {open && <HorizontalChips>{starters.map(line => <Chip key={line} label={line} compact onPress={() => { setText(line); setOpen(false); }} />)}</HorizontalChips>}
    <View style={[common.row, { gap: 8, alignItems: "flex-end" }]}>
      {!!starters.length && <IconButton label={t("suggestedMessages")} icon="sparkles-outline" selected={open} onPress={() => setOpen(!open)} />}
      <TextInput ref={input} value={text} onChangeText={setText} maxLength={1000} multiline numberOfLines={1} placeholder={placeholder ?? t("message")} accessibilityLabel={placeholder ?? t("message")}
        onLayout={measureWeb} onContentSizeChange={event => { if (Platform.OS !== "web") setInputHeight(Math.max(48, Math.min(120, event.nativeEvent.contentSize.height + 2))); }}
        editable={!disabled && !busy} placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={[s.input, { height: inputHeight, backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border, color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier },
          Platform.OS === "web" && { outlineStyle: "solid", outlineWidth: 0 }]} />
      <Pressable accessibilityRole="button" accessibilityLabel={sendLabel ?? t("sendMessage")} accessibilityState={{ disabled: !ready, busy }} disabled={!ready} onPress={() => void send()}
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
