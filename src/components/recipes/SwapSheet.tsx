import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Sheet } from "../Sheet";
import { Button, Icon, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { ingredientLine } from "../../utils/food-format";
import { useLanguage, useT, type Language } from "../../i18n";
import { swapAi } from "../../services/swaps-api";
import { ApiError } from "../../services/community-api";
import type { SwapAiStatus, SwapLine, SwapOption } from "../../types/swaps";
import { shortName } from "../../utils/swaps";

const POLL_MS = 3000, POLLS = 60;

/**
 * "Instead of {ingredient}": the line's swaps, one row each (name, amount for the chosen servings, at most one note); a tap uses
 * it. Names follow the recipe's language, like the ingredient list; notes follow the interface. More options shows the rest and,
 * for accounts with AI Recipes (`aiFor`, the recipe's id), Find More With AI: the QT bots' picks, each with a small sparkle.
 */
export function SwapSheet({ line, original, scale, language, aiFor, onChoose, onClose }: {
  line: SwapLine | null; original: string; scale: number; language: Language; aiFor: string | null; onChoose: (option: SwapOption) => void; onClose: () => void;
}) {
  const t = useT("cook"), [more, setMore] = useState(false);
  const close = () => { setMore(false); onClose(); };
  const choose = (option: SwapOption) => { setMore(false); onChoose(option); };
  return <Sheet visible={!!line} onClose={close} title={t("swapTitle", { name: shortName(original) })}>
    {line && <View style={s.rows}>
      {[...line.options, ...(more ? line.more : [])].map(option =>
        <SwapRow key={option.to ?? "leave"} option={option} scale={scale} language={language} onPress={() => choose(option)} />)}
      {more && aiFor && <AiOptions key={aiFor + ":" + line.id} recipeId={aiFor} lineId={line.id} scale={scale} language={language} onChoose={choose} />}
    </View>}
    {!!line && (line.more.length > 0 || !!aiFor) && !more && <View style={s.more}><Button label={t("moreOptions")} variant="link" onPress={() => setMore(true)} /></View>}
  </Sheet>;
}

/** Find More With AI for one line: a row that asks, then the picks (or one muted line when there are none). */
function AiOptions({ recipeId, lineId, scale, language, onChoose }: { recipeId: string; lineId: string; scale: number; language: Language; onChoose: (option: SwapOption) => void }) {
  const { theme } = usePreferences(), t = useT("cook"), [state, setState] = useState<SwapAiStatus | null>(null), [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const ask = async () => {
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    setError(""); setState({ status: "pending", options: [] });
    try {
      let next = await swapAi(recipeId, lineId, true, current.signal);
      // The bots answer within a few minutes; the sheet asks again every few seconds while it stays open.
      for (let poll = 0; next.status === "pending" && poll < POLLS && !current.signal.aborted; poll++) {
        await new Promise(resolve => setTimeout(resolve, POLL_MS));
        if (current.signal.aborted) return;
        next = await swapAi(recipeId, lineId, false, current.signal);
      }
      if (!current.signal.aborted) setState(next.status === "pending" ? { status: "failed", options: [] } : next);
    } catch (caught) {
      if (current.signal.aborted) return;
      setState(null);
      setError(caught instanceof ApiError ? caught.message : t("swapAiNone"));
    }
  };
  if (!state) return <View style={s.rows}>
    <Pressable accessibilityRole="button" accessibilityLabel={t("swapFindAi")} onPress={() => void ask()} style={({ pressed }) => [common.row, s.row, s.ask, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
      <Icon name="sparkles" size={18} color={theme.accent} /><T style={[common.flex, common.bold]} color={theme.accent}>{t("swapFindAi")}</T>
    </Pressable>
    {!!error && <T variant="small" color={theme.error}>{error}</T>}
  </View>;
  if (state.status === "pending") return <View accessibilityRole="progressbar" accessibilityLabel={t("swapAiLooking")} style={[common.row, s.row, s.ask, { borderColor: theme.border }]}>
    <ActivityIndicator color={theme.accent} /><T muted>{t("swapAiLooking")}</T>
  </View>;
  if (!state.options.length) return <T variant="small" muted style={s.none}>{t("swapAiNone")}</T>;
  return <>{state.options.map(option => <SwapRow key={"ai:" + option.to} option={option} scale={scale} language={language} onPress={() => onChoose(option)} />)}</>;
}

function SwapRow({ option, scale, language, onPress }: { option: SwapOption; scale: number; language: Language; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), t = useT("cook"), ui = useLanguage();
  const name = option.leave ? t("leaveOut") : option.name![language];
  const amount = option.leave || option.amount === null ? "" : ingredientLine({ name: "", amount: option.amount, unit: option.unit }, scale, ui).lead;
  const note = option.note?.[ui];
  return <Pressable accessibilityRole="button" accessibilityLabel={[name, amount, note, option.ai ? t("swapAiLabel") : ""].filter(Boolean).join(", ")} onPress={onPress} {...focusProps}
    style={({ pressed }) => [common.row, s.row, { backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: focused ? theme.accent : theme.border }]}>
    <View style={[common.flex, s.text]}>
      <View style={[common.row, s.name]}>
        <T style={[common.bold, s.shrink]} numberOfLines={2}>{name}</T>
        {option.ai && <Icon name="sparkles" size={14} color={theme.accent} />}
      </View>
      {note && <T variant="small" muted numberOfLines={2}>{note}</T>}
    </View>
    {!!amount && <T muted>{amount}</T>}
  </Pressable>;
}
const s = StyleSheet.create({
  rows: { gap: 8 },
  row: { gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 14 },
  ask: { minHeight: 48 },
  text: { gap: 2 },
  name: { gap: 6 },
  shrink: { flexShrink: 1 },
  none: { paddingVertical: 8 },
  more: { alignSelf: "flex-start" },
});
