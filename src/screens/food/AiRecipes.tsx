import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Card, Field, Icon, T, common, type IconName } from "../../components/ui";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { useRemote, invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { ApiError } from "../../services/community-api";
import { aiRecipesStatus, clearAiJobs, myAiJobs, startAiJob, uploadAiVideo } from "../../services/ai-recipes";
import { Rise } from "../../components/recipes/AiShowcase";
import { AiRequests } from "../../components/recipes/AiRequests";
import { AiInfoTip, dishTip, videoTip, type TipPoint } from "../../components/recipes/AiInfoTip";
import { useDietText } from "../../components/food/DietLabels";
import { useT } from "../../i18n";


/** Ask for a dish or paste a video link; the server writes the recipe and it appears in the shared Cook feed. */
export function AiRecipesScreen() {
  const member = useMember(), { theme, setNotice } = usePreferences(), t = useT("cook"), dietText = useDietText();
  const status = useRemote("ai-recipes:status", aiRecipesStatus);
  const jobs = useRemote(member.member ? "ai-recipes:mine" : null, signal => myAiJobs(signal).then(r => r.items), 6000);
  // Cook's "Get An AI Recipe" opens this screen with the search filled in.
  const { dish: asked } = useLocalSearchParams<{ dish?: string }>();
  const [dish, setDish] = useState(() => typeof asked === "string" ? asked.slice(0, 300) : ""), [link, setLink] = useState(""), [busy, setBusy] = useState<"video" | "request" | "upload" | null>(null);
  // The usage count changes when a job starts or fails, so follow the job list.
  const jobsKey = jobs.data?.map(job => job.id + job.status).join() ?? "";
  const refreshStatus = status.refresh;
  useEffect(() => { if (jobsKey) refreshStatus(); }, [jobsKey, refreshStatus]);
  const data = status.data, limits = data?.limits, full = !!data?.fullToday;
  // AI recipes are paid only (owner, 21 Oct): without a plan, the buttons open the plans instead of starting a job.
  const needsPlan = data?.needsPlan ?? false, enabled = (data?.enabled ?? false) && !full;
  const toPlans = () => router.push("/cook/ai-plans" as never);
  const failed = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.code === "PLAN_REQUIRED") { toPlans(); return; }
    setNotice({ text: error instanceof ApiError ? error.message : fallback, error: true });
  };
  const start = async (kind: "video" | "request", input: string) => {
    if (needsPlan) { toPlans(); return; }
    if (!ensureMember(member, "/cook/ai")) return;
    setBusy(kind);
    try {
      await startAiJob(kind, input.trim());
      if (kind === "video") setLink(""); else setDish("");
      invalidate("ai-recipes:mine"); jobs.refresh(); invalidate("ai-recipes:status");
      setNotice({ text: t("aiAdded") });
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
      setLink("");
      invalidate("ai-recipes:mine"); jobs.refresh(); invalidate("ai-recipes:status");
      setNotice({ text: t("aiUploaded") });
    } catch (error) {
      failed(error, t("aiUploadFailed"));
    } finally { setBusy(null); }
  };
  return <CookLayout title={t("aiTitle")} backTo="/cook">
    {data && !data.enabled && <Notice icon="pause-circle-outline" text={t("aiOff")} />}
    {data?.enabled && full && <Notice icon="hourglass-outline" text={t("aiFull")} />}
    <Rise><PlanCard needsPlan={needsPlan} known={!!data} /></Rise>
    <Rise delay={80}><Card style={common.stack}>
      <Heading icon="restaurant-outline" title={t("describeDish")} tip={dishTip} />
      <Field label={t("dishField")} showLabel={false} value={dish} onChangeText={setDish} maxLength={300} placeholder={t("dishPlaceholder", { vegan: dietText.name("Vegan") })} />
      <Button label={t("findRecipe")} icon="search-outline" loading={busy === "request"} disabled={!enabled || busy !== null || dish.trim().length < 3} onPress={() => void start("request", dish)} />
    </Card></Rise>
    <Rise delay={160}><Card style={common.stack}>
      <Heading icon="videocam-outline" title={t("fromVideo")} tip={videoTip} />
      <Field label={t("videoLink")} showLabel={false} value={link} onChangeText={setLink} maxLength={500} placeholder={t("pasteVideoLink")} autoCapitalize="none" keyboardType="url" />
      <Button label={t("importVideo")} icon="link-outline" loading={busy === "video"} disabled={!enabled || busy !== null || !/^https:\/\//.test(link.trim())} onPress={() => void start("video", link)} />
      <Button label={t("uploadVideo")} icon="cloud-upload-outline" variant="secondary" loading={busy === "upload"} disabled={!enabled || busy !== null} onPress={() => void upload()} />
      {limits && <View style={[common.row, s.limits]}><Icon name="information-circle-outline" size={16} color={theme.mutedForeground} />
        <T variant="caption" muted>{t("videoLimits", { minutes: limits.videoMinutes, mb: limits.videoMb })}</T></View>}
    </Card></Rise>
    {!!jobs.data?.length && <Rise delay={220}><AiRequests jobs={jobs.data} retryDisabled={!enabled || busy !== null} onRetry={job => void start(job.kind, job.input)}
      clearing={clearing} onClear={() => void clear()} /></Rise>}
  </CookLayout>;
}
/** A card heading with its icon in a soft badge. */
function Heading({ icon, title, tip }: { icon: IconName; title: string; tip: readonly TipPoint[] }) {
  const { theme } = usePreferences();
  return <View style={[common.row, s.heading]}>
    <View style={[s.badge, { backgroundColor: theme.accentSoft }]}><Icon name={icon} size={18} color={theme.accent} /></View>
    <T style={[common.bold, common.flex]}>{title}</T>
    <AiInfoTip title={title} points={tip} />
  </View>;
}
/** The plan on a gradient card; opens the plans. Without a plan it asks the member to choose one. */
function PlanCard({ needsPlan, known }: { needsPlan: boolean; known: boolean }) {
  const { theme } = usePreferences(), t = useT("cook");
  return <Pressable accessibilityRole="button" accessibilityLabel={t(known && needsPlan ? "aiPlanChoose" : "aiPlan")}
    onPress={() => router.push("/cook/ai-plans" as never)} style={({ pressed }) => [s.usage, { borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}>
    <LinearGradient colors={[...theme.gradient] as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={[s.spark, { backgroundColor: theme.card }]}><Icon name="sparkles" size={20} color={theme.accent} /></View>
    <View style={common.flex}>
      <T style={common.bold}>{t("aiPlan")}</T>
      {known && needsPlan && <T variant="small" muted>{t("choosePlanLower")}</T>}
    </View>
    <Icon name="chevron-forward" size={18} color={theme.mutedForeground} />
  </Pressable>;
}
/** Why the buttons are off right now. */
function Notice({ icon, text }: { icon: IconName; text: string }) {
  const { theme } = usePreferences();
  return <View accessibilityRole="alert" style={[common.row, s.notice, { borderColor: theme.border, backgroundColor: theme.accentSoft }]}>
    <Icon name={icon} size={18} color={theme.accent} /><T variant="small" style={common.flex}>{text}</T></View>;
}
const s = StyleSheet.create({
  usage: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, overflow: "hidden", minHeight: 72 },
  spark: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heading: { gap: 10 },
  badge: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  limits: { gap: 6, justifyContent: "center" },
  notice: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
});
