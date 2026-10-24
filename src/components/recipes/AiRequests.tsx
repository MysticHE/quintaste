import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { usePreferences } from "../../state/Preferences";
import { aiJobActive, type AiJob } from "../../services/ai-recipes";
import { Divider, Icon, T, common, type IconName } from "../ui";
import { useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";

/**
 * The member's AI recipe requests as one compact list: the recipe's own title (never a pasted link), a status pill, and one
 * action per row (open the recipe, or try again as its own control). Three show at first; Clear hides finished requests on
 * every device (the server keeps the rows, so plan usage is unchanged) while ones still in progress stay.
 */
const SHOWN = 3;
type Tone = "good" | "warn" | "busy";
const statusOf: Record<AiJob["status"], { label: CookKey; tone: Tone }> = {
  queued: { label: "statusQueued", tone: "busy" }, working: { label: "statusWorking", tone: "busy" },
  published: { label: "statusReady", tone: "good" }, review: { label: "statusChecking", tone: "busy" }, failed: { label: "statusFailed", tone: "warn" },
};
const removed = { label: "statusRemoved" as CookKey, tone: "warn" as Tone };
/** The recipe's own title; a request without one shows what was asked, a video a plain name ("Uploaded video" is what the server stores for uploads). */
const titleOf = (job: AiJob, t: (key: CookKey) => string) => job.title || (job.kind === "request" ? job.input : t(job.input === "Uploaded video" ? "uploadedVideo" : "videoRecipe"));

export function AiRequests({ jobs, onRetry, retryDisabled, onClear, clearing }: {
  jobs: AiJob[]; onRetry: (job: AiJob) => void; retryDisabled: boolean; onClear: () => void; clearing: boolean;
}) {
  const { theme } = usePreferences(), [all, setAll] = useState(false), t = useT("cook"), tc = useT("common");
  if (!jobs.length) return null;
  const finished = jobs.some(job => !aiJobActive(job)), rows = all ? jobs : jobs.slice(0, SHOWN);
  return <View style={s.section}>
    <View style={common.spread}>
      <T variant="subtitle" accessibilityRole="header">{t("yourRequests")}</T>
      {finished && <Pressable accessibilityRole="button" accessibilityLabel={t("clearFinished")} disabled={clearing}
        onPress={() => { setAll(false); onClear(); }} hitSlop={8} style={[s.clear, { opacity: clearing ? 0.5 : 1 }]}>
        <T variant="small" color={theme.accent} style={common.bold}>{tc("clear")}</T></Pressable>}
    </View>
    <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {rows.map((job, index) => <View key={job.id}>
        {index > 0 && <Divider />}
        <Row job={job} onRetry={onRetry} retryDisabled={retryDisabled} />
      </View>)}
    </View>
    {jobs.length > SHOWN && <Pressable accessibilityRole="button" onPress={() => setAll(!all)} style={s.more}>
      <T variant="small" color={theme.accent} style={common.bold}>{all ? t("showLess") : t("showAll", { n: jobs.length })}</T>
    </Pressable>}
  </View>;
}

/** One request. The summary and the retry button are siblings, so screen readers reach each on its own. */
function Row({ job, onRetry, retryDisabled }: { job: AiJob; onRetry: (job: AiJob) => void; retryDisabled: boolean }) {
  const { theme } = usePreferences(), active = aiJobActive(job), t = useT("cook"), title = titleOf(job, t);
  // A recipe staff hid after it was written stays in the list as Removed and no longer opens.
  const gone = job.status === "published" && job.openable === false, status = gone ? removed : statusOf[job.status];
  const open = job.status === "published" && job.recipeId && !gone ? () => router.push(("/cook/recipe/" + job.recipeId) as never) : undefined;
  const pill = { good: [theme.successSoft, theme.success], warn: [theme.warningSoft, theme.warning], busy: [theme.accentSoft, theme.accent] }[status.tone];
  const icon: IconName = job.kind === "video" ? "videocam-outline" : "restaurant-outline";
  // Only a failure says why; other states speak through the pill.
  const note = job.status === "failed" ? job.message : "";
  const summary = <>
    <View style={[s.icon, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={18} color={theme.accent} /></View>
    <View style={[common.flex, s.text]}>
      <T style={common.bold} numberOfLines={1}>{title}</T>
      {!!note && <T variant="caption" muted numberOfLines={1}>{note}</T>}
    </View>
    <View style={[s.pill, { backgroundColor: pill[0] }]}>
      {active && <ActivityIndicator size="small" color={pill[1]} style={s.spinner} />}
      <T variant="caption" color={pill[1]} style={common.bold}>{t(status.label)}</T>
    </View>
    {open && <Icon name="chevron-forward" size={18} color={theme.mutedForeground} />}
  </>;
  const label = t("requestLabel", { title, status: t(status.label), note });
  return <View style={s.row}>
    {open
      ? <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={t("opensRecipe")} onPress={open}
          style={({ pressed }) => [s.summary, { backgroundColor: pressed ? theme.muted : theme.transparent }]}>{summary}</Pressable>
      : <View accessible accessibilityLabel={label} style={s.summary}>{summary}</View>}
    {job.retryable && <Pressable accessibilityRole="button" accessibilityLabel={t("tryAgainTitle", { title })} disabled={retryDisabled}
      onPress={() => onRetry(job)} hitSlop={6} style={[s.retry, { opacity: retryDisabled ? 0.4 : 1 }]}>
      <Icon name="refresh" size={20} color={theme.accent} /></Pressable>}
  </View>;
}

const s = StyleSheet.create({
  section: { gap: 8 },
  clear: { minHeight: 44, minWidth: 48, alignItems: "flex-end", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center" },
  summary: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 12, paddingRight: 8, minHeight: 60 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  text: { gap: 2, paddingVertical: 10, minWidth: 0 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  spinner: { transform: [{ scale: 0.6 }], width: 14, height: 14 },
  retry: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: 4 },
  more: { minHeight: 44, alignItems: "center", justifyContent: "center" },
});
