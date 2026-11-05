import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { useRemote } from "../../hooks/useRemote";
import { loadCreditHistory, type Collection, type CreditEntry } from "../../services/collection-api";
import { useT, useLanguage } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import type messages from "../../i18n/en/collection";

const kinds: Record<string, keyof typeof messages> = {
  task_start: "creditSetup", task_cook: "creditCook", task_review: "creditReview", task_photo: "creditPhoto", task_dinner: "creditDinner", task_milestone: "creditMilestone",
  task_undo: "creditReversal", explore_fix: "creditCorrection", explore_place: "creditSuggestion", border: "creditBorder", staff: "creditAdjustment",
  first_clear: "creditGame", mastered: "creditGame", replay: "creditGame", purchase: "creditPurchase", import: "creditImport",
};

/** Mounted only while the history sheet is open, so cursor state cannot leak across openings/accounts. */
export function CreditActivity({ data }: { data: Collection }) {
  const t = useT("collection"), language = useLanguage(), { theme } = usePreferences();
  const remote = useRemote("/api/collection/activity", signal => loadCreditHistory(null, signal));
  const [more, setMore] = useState<CreditEntry[]>([]), [next, setNext] = useState<string | null | undefined>(), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const pendingRequest = useRef(false), generation = useRef(remote.data);
  const [snapshot, setSnapshot] = useState(remote.data);
  useEffect(() => { generation.current = remote.data; }, [remote.data]);
  // A foreground refresh replaces the first page; discard pagination from the old snapshot.
  if (snapshot !== remote.data) { setSnapshot(remote.data); setMore([]); setNext(undefined); }
  const items = [...(remote.data?.items ?? []), ...more].filter((item, i, all) => all.findIndex(x => x.id === item.id) === i);
  const cursor = next === undefined ? remote.data?.next : next;
  const waiting = data.tasks.everyday.reduce((sum, item) => sum + item.waiting, 0) + (data.tasks.correction?.waiting ?? 0);
  const when = (at: string) => new Date(at).toLocaleString(language === "zh" ? "zh-SG" : "en-SG", { timeZone: "Asia/Singapore", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const loadMore = async () => {
    if (!cursor || pendingRequest.current) return;
    const snapshot = generation.current;
    pendingRequest.current = true; setBusy(true); setError(false);
    try {
      const page = await loadCreditHistory(cursor);
      if (generation.current === snapshot) { setMore(current => [...current, ...page.items]); setNext(page.next); }
    } catch { if (generation.current === snapshot) setError(true); } finally { pendingRequest.current = false; setBusy(false); }
  };
  return <View style={{ gap: 14 }}>
    <T variant="title" style={common.bold}>{t("creditsChip", { n: Math.max(0, data.credits - data.owed).toLocaleString() })}</T>
    <T variant="small" muted>{t("creditAvailable")}</T>
    {waiting > 0 && <View style={{ gap: 6 }}><StatusPill label={t("creditPending", { n: waiting })} tone="warning" /><T variant="small" muted>{t("creditPendingNote")}</T></View>}
    {(data.tasks.correction?.held ?? 0) > 0 && <T variant="small" muted>{t("creditHeld", { n: data.tasks.correction!.held })}</T>}
    {data.owed > 0 && <T variant="small" color={theme.warning}>{t("creditOwed", { n: data.owed })}</T>}
    <T style={common.bold}>{t("creditHistory")}</T>
    <T variant="caption" muted>{t("creditHistoryNote")}</T>
    {remote.loading && !remote.data && <ActivityIndicator color={theme.accent} />}
    {remote.error && <><T muted>{t("creditLoadFailed")}</T><Button variant="secondary" label={t("creditRetry")} onPress={remote.refresh} /></>}
    {!remote.loading && !remote.error && !items.length && <T muted>{t("creditEmpty")}</T>}
    {items.map(item => <View key={item.id} testID="credit-activity-row" style={{ borderBottomWidth: 1, borderBottomColor: theme.divider, paddingVertical: 10, gap: 5 }}>
      <View style={[common.row, { alignItems: "flex-start" }]}>
        <T style={[common.bold, { flex: 1 }]}>{t(kinds[item.kind] ?? (item.amount > 0 ? "creditEarned" : "creditSpent"))}</T>
        <T color={item.amount > 0 ? theme.success : theme.foreground} style={[common.bold, { fontVariant: ["tabular-nums"] }]}>{item.amount > 0 ? "+" : "−"}{Math.abs(item.amount).toLocaleString()}</T>
      </View>
      <T variant="caption" muted>{when(item.at)}</T>
      <T variant="caption" muted>{t("creditBalanceAfter", { n: item.balanceAfter.toLocaleString() })}</T>
    </View>)}
    {error && <T color={theme.error}>{t("creditLoadFailed")}</T>}
    {cursor && <Button variant="secondary" label={t(error ? "creditRetry" : "creditMore")} loading={busy} onPress={() => void loadMore()} />}
  </View>;
}
