import { View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { useRemote } from "../../hooks/useRemote";
import { useDebounced } from "../../hooks/useDebounced";
import { checkHandle, handleCheckKey } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** Same rule as the server (server/social/handles.mjs): 3 to 24 lowercase letters, numbers, dots or underscores, starting with a letter. */
export const handlePattern = /^[a-z][a-z0-9._]{2,23}$/;
export const cleanHandle = (value: string) => value.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9._]/g, "");
const shapeOk = (handle: string) => handlePattern.test(handle) && !handle.includes("..") && !handle.endsWith(".");
export type HandleState = "same" | "checking" | "available" | "taken" | "invalid";

/** Whether `handle` can be saved: unchanged, or checked against the server once typing settles. */
export function useHandleState(handle: string, current: string): HandleState {
  const settled = useDebounced(handle, 400), changed = handle !== current, typed = changed && shapeOk(handle);
  const check = useRemote(typed && settled === handle ? handleCheckKey(handle) : null, signal => checkHandle(handle, signal));
  if (!changed) return "same";
  if (!shapeOk(handle)) return "invalid";
  if (settled !== handle || !check.data || check.data.handle !== handle) return "checking";
  return !check.data.valid ? "invalid" : check.data.available ? "available" : "taken";
}
/** Basics: the public handle under First name, typed without @, with Available / Taken shown in the field. */
export function HandleField({ value, onChange, state }: { value: string; onChange: (next: string) => void; state: HandleState }) {
  const { theme } = usePreferences(), t = useT("social");
  const note = { same: "", checking: t("handleChecking"), available: t("handleAvailable"), taken: t("handleTaken"), invalid: t("handleInvalid") }[state];
  const color = state === "available" ? theme.success : state === "taken" || state === "invalid" ? theme.error : theme.mutedForeground;
  return <View style={{ gap: 6 }}>
    <Field label={t("handle")} value={value} onChangeText={next => onChange(cleanHandle(next))} autoCapitalize="none" autoCorrect={false} autoComplete="off"
      spellCheck={false} maxLength={24} accessibilityHint={t("handleHint")} error={state === "taken" || state === "invalid" ? note : undefined}
      trailing={state === "available" ? <View style={[common.row, { gap: 4 }]} accessibilityLiveRegion="polite">
        <Icon name="checkmark-circle" size={18} color={color} /><T variant="small" color={color} style={common.bold}>{note}</T></View>
        : state === "checking" ? <T variant="small" muted>{note}</T> : undefined} />
    <T variant="small" muted>{t("handleHint")}</T>
  </View>;
}
