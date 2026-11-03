import { useEffect, useState } from "react";
import { useAskForAlerts } from "../../hooks/useAskForAlerts";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Field, Icon, T, common, type IconName } from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { useRemote, invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { ApiError } from "../../services/community-api";
import { aiRecipesStatus, clearAiJobs, myAiJobs, startAiJob, uploadAiVideo } from "../../services/ai-recipes";
import { AiRequests } from "../../components/recipes/AiRequests";
import { useDietText } from "../../components/food/DietLabels";
import { useT } from "../../i18n";

/**
 * AI Recipes (docs/AI_FOOD_LIBRARY_PLAN.md §6, screen 1): the recipes left in the title row; Snap a dish and My ingredients as tiles; "Or type a
 * dish" with a small arrow; From a video as one row (its link and upload in a sheet); then the member's recipes. No cards, tips
 * or limits text on the page.
 */
export function AiRecipesScreen() {
  const member = useMember(), { theme, setNotice } = usePreferences(), t = useT("cook"), dietText = useDietText(), askForAlerts = useAskForAlerts();
  const status = useRemote("ai-recipes:status", aiRecipesStatus);
  const jobs = useRemote(member.member ? "ai-recipes:mine" : null, signal => myAiJobs(signal).then(r => r.items), 6000);
  // Cook's "Get An AI Recipe" opens this screen with the search filled in.
  const { dish: asked } = useLocalSearchParams<{ dish?: string }>();
  const [dish, setDish] = useState(() => typeof asked === "string" ? asked.slice(0, 300) : ""), [link, setLink] = useState("");
  const [busy, setBusy] = useState<"video" | "request" | "upload" | null>(null), [videoOpen, setVideoOpen] = useState(false);
  // The usage count changes when a job starts or fails, so follow the job list.
  const jobsKey = jobs.data?.map(job => job.id + job.status).join() ?? "";
  const refreshStatus = status.refresh;
  useEffect(() => { if (jobsKey) refreshStatus(); }, [jobsKey, refreshStatus]);
  const data = status.data, limits = data?.limits, full = !!data?.fullToday;
  // AI recipes are paid only (owner, 21 Oct): without a plan, the buttons open the plans instead of starting a job.
  const needsPlan = data?.needsPlan ?? false, enabled = (data?.enabled ?? false) && !full;
  const left = data && !data.unlimited && !needsPlan ? Math.max(0, data.dailyPerMember - (data.usedToday ?? 0)) : null;
  const toPlans = () => router.push("/cook/ai-plans" as never);
  const failed = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.code === "PLAN_REQUIRED") { toPlans(); return; }
    setNotice({ text: error instanceof ApiError ? error.message : fallback, error: true });
  };
  const started = (text: string) => { invalidate("ai-recipes:mine"); jobs.refresh(); invalidate("ai-recipes:status"); setNotice({ text }); askForAlerts("recipe"); };
  const start = async (kind: "video" | "request", input: string) => {
    if (needsPlan) { toPlans(); return; }
    if (!ensureMember(member, "/cook/ai")) return;
    setBusy(kind);
    try {
      await startAiJob(kind, input.trim());
      if (kind === "video") { setLink(""); setVideoOpen(false); } else setDish("");
      started(t("aiAdded"));
    } catch (error) {
      failed(error, t("aiStartFailed"));
    } finally { setBusy(null); }
  };
  const [clearing, setClearing] = useState(false);
  const clear = async () => {
    setClearing(true);
    try { await clearAiJobs(); invalidate("ai-recipes:mine"); jobs.refresh(); }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : t("aiClearFailed"), error: true }); }
    finally { setClearing(false); }
  };
  const upload = async () => {
    if (needsPlan) { toPlans(); return; }
    if (!ensureMember(member, "/cook/ai")) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsMultipleSelection: false,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
    const video = picked.canceled ? undefined : picked.assets[0];
    if (!video) return;
    setBusy("upload");
    try {
      await uploadAiVideo(video, link);
      setLink(""); setVideoOpen(false);
      started(t("aiUploaded"));
    } catch (error) {
      failed(error, t("aiUploadFailed"));
    } finally { setBusy(null); }
  };
  const canAsk = enabled && busy === null && dish.trim().length >= 3;
  // The recipes left today, or the way to a plan; tapping either opens the plans.
  const credits = data && (needsPlan || left !== null) ? <Pressable accessibilityRole="link" onPress={toPlans} hitSlop={12}
    accessibilityLabel={needsPlan ? t("choosePlanLower") : t("aiLeft", { n: left ?? 0 })}>
    <T variant="small" color={needsPlan ? theme.accent : theme.mutedForeground} style={common.bold}>{needsPlan ? t("choosePlanLower") : t("aiLeft", { n: left ?? 0 })}</T>
  </Pressable> : undefined;
  return <CookLayout title={t("aiTitle")} backTo="/cook" headerAction={credits}>
    {data && !data.enabled && <Notice icon="pause-circle-outline" text={t("aiOff")} />}
    {data?.enabled && full && <Notice icon="hourglass-outline" text={t("aiFull")} />}
    {data?.snap && <View style={s.tiles}>
      <Tile icon="camera-outline" label={t("snapTitle")} disabled={!enabled} onPress={() => { if (ensureMember(member, "/cook/snap")) router.push("/cook/snap" as never); }} />
      <Tile icon="basket-outline" label={t("itemsTitle")} disabled={!enabled} onPress={() => { if (ensureMember(member, "/cook/ingredients")) router.push("/cook/ingredients" as never); }} />
    </View>}
    <Field label={t("typeDish")} showLabel={false} value={dish} onChangeText={setDish} maxLength={300} returnKeyType="send"
      placeholder={t("typeDishPlaceholder", { vegan: dietText.name("Vegan") })} onSubmitEditing={() => { if (canAsk) void start("request", dish); }}
      trailing={<Pressable accessibilityRole="button" accessibilityLabel={t("findRecipe")} accessibilityState={{ disabled: !canAsk, busy: busy === "request" }}
        disabled={!canAsk} hitSlop={12} onPress={() => void start("request", dish)} style={[s.send, { backgroundColor: canAsk ? theme.accent : theme.muted }]}>
        <Icon name="arrow-forward" size={18} color={canAsk ? theme.actionForeground : theme.mutedForeground} /></Pressable>} />
    <Pressable accessibilityRole="button" accessibilityLabel={t("fromVideo")} onPress={() => setVideoOpen(true)}
      style={({ pressed }) => [common.row, s.row, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
      <Icon name="videocam-outline" size={20} color={theme.accent} /><T style={[common.flex, common.bold]}>{t("fromVideo")}</T>
      <Icon name="chevron-forward" size={18} color={theme.mutedForeground} />
    </Pressable>
    {!!jobs.data?.length && <AiRequests jobs={jobs.data} retryDisabled={!enabled || busy !== null}
      onRetry={job => { if (job.kind === "video" || job.kind === "request") void start(job.kind, job.input); }} clearing={clearing} onClear={() => void clear()} />}
    <Sheet visible={videoOpen} onClose={() => setVideoOpen(false)} title={t("fromVideo")}>
      <Field label={t("videoLink")} showLabel={false} value={link} onChangeText={setLink} maxLength={500} placeholder={t("pasteVideoLink")} autoCapitalize="none" keyboardType="url" />
      <Button label={t("importVideo")} icon="link-outline" loading={busy === "video"} disabled={!enabled || busy !== null || !/^https:\/\//.test(link.trim())} onPress={() => void start("video", link)} />
      <Button label={t("uploadVideo")} icon="cloud-upload-outline" variant="secondary" loading={busy === "upload"} disabled={!enabled || busy !== null} onPress={() => void upload()} />
      {limits && <T variant="caption" muted style={s.center}>{t("videoLimits", { minutes: limits.videoMinutes, mb: limits.videoMb })}</T>}
    </Sheet>
  </CookLayout>;
}
/** Snap a dish or My ingredients: a tile with its icon, half the row each. */
function Tile({ icon, label, disabled, onPress }: { icon: IconName; label: string; disabled: boolean; onPress: () => void }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.tile, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card, opacity: disabled ? 0.5 : 1 }]}>
    <View style={[s.tileIcon, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={26} color={theme.accent} /></View>
    <T style={common.bold}>{label}</T>
  </Pressable>;
}
/** Why the buttons are off right now. */
function Notice({ icon, text }: { icon: IconName; text: string }) {
  const { theme } = usePreferences();
  return <View accessibilityRole="alert" style={[common.row, s.notice, { borderColor: theme.border, backgroundColor: theme.accentSoft }]}>
    <Icon name={icon} size={18} color={theme.accent} /><T variant="small" style={common.flex}>{text}</T></View>;
}
const s = StyleSheet.create({
  tiles: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, minHeight: 112, gap: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 20, padding: 16 },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  row: { gap: 12, minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderRadius: 16 },
  center: { textAlign: "center" },
  notice: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
});
