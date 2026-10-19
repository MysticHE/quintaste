import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Card, Field, T, common } from "../../components/ui";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { useRemote, invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { ApiError } from "../../services/community-api";
import { aiJobActive, aiRecipesStatus, myAiJobs, startAiJob, uploadAiVideo, type AiJob } from "../../services/ai-recipes";

const statusLabel: Record<AiJob["status"], string> = { queued: "Queued", working: "Reading", published: "Ready", review: "With staff", failed: "Not possible" };

/** Ask for a dish or paste a video link; the server writes the recipe and it appears in the shared Cook feed. */
export function AiRecipesScreen() {
  const member = useMember(), { theme, setNotice } = usePreferences();
  const status = useRemote("ai-recipes:status", aiRecipesStatus);
  const jobs = useRemote(member.member ? "ai-recipes:mine" : null, signal => myAiJobs(signal).then(r => r.items), 6000);
  const [dish, setDish] = useState(""), [link, setLink] = useState(""), [busy, setBusy] = useState<"video" | "request" | "upload" | null>(null);
  const enabled = status.data?.enabled ?? false;
  const start = async (kind: "video" | "request", input: string) => {
    if (!ensureMember(member, "/cook/ai")) return;
    setBusy(kind);
    try {
      await startAiJob(kind, input.trim());
      if (kind === "video") setLink(""); else setDish("");
      invalidate("ai-recipes:mine"); jobs.refresh();
      setNotice({ text: "Added. We will show it here when it is ready." });
    } catch (error) {
      setNotice({ text: error instanceof ApiError ? error.message : "Could not start that. Try again.", error: true });
    } finally { setBusy(null); }
  };
  const upload = async () => {
    if (!ensureMember(member, "/cook/ai")) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsMultipleSelection: false,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium });
    const video = picked.canceled ? undefined : picked.assets[0];
    if (!video) return;
    setBusy("upload");
    try {
      await uploadAiVideo(video, link);
      setLink("");
      invalidate("ai-recipes:mine"); jobs.refresh();
      setNotice({ text: "Uploaded. We will show the recipe here when it is ready." });
    } catch (error) {
      setNotice({ text: error instanceof ApiError ? error.message : "The upload did not work. Try again.", error: true });
    } finally { setBusy(null); }
  };
  return <CookLayout title="AI Recipes" backTo="/cook">
    {status.data && !enabled && <T variant="small" muted>AI recipes are off right now.</T>}
    <Card style={common.stack}>
      <T style={common.bold}>Get A Recipe</T>
      <Field label="Describe The Dish" value={dish} onChangeText={setDish} maxLength={300} placeholder="Vegan laksa for 2, no garlic" />
      <Button label="Find Recipe" icon="search-outline" loading={busy === "request"} disabled={!enabled || busy !== null || dish.trim().length < 3} onPress={() => void start("request", dish)} />
    </Card>
    <Card style={common.stack}>
      <T style={common.bold}>Import A Video</T>
      <Field label="Video Link" value={link} onChangeText={setLink} maxLength={500} placeholder="https://www.youtube.com/watch?v=…" autoCapitalize="none" keyboardType="url" />
      <Button label="Import Video" icon="videocam-outline" loading={busy === "video"} disabled={!enabled || busy !== null || !/^https:\/\//.test(link.trim())} onPress={() => void start("video", link)} />
      <Button label="Upload Video" icon="cloud-upload-outline" variant="secondary" loading={busy === "upload"} disabled={!enabled || busy !== null} onPress={() => void upload()} />
      <T variant="caption" muted>TikTok and Instagram block our server. Save the video on your phone and upload it; keep its link above for credit.</T>
    </Card>
    <T variant="caption" muted>Written from the video or from rated recipe pages, credited to the creator, not kitchen-tested. {status.data ? status.data.dailyPerMember + " a day." : ""}</T>
    {!!jobs.data?.length && <View style={{ gap: 8 }}>
      <T variant="subtitle" accessibilityRole="header">Your Requests</T>
      {jobs.data.map(job => <Card key={job.id} style={{ gap: 4 }}>
        <View style={[common.row, { gap: 8 }]}>
          <T style={[common.flex, common.bold]} numberOfLines={2}>{job.input}</T>
          <T variant="small" color={job.status === "failed" ? theme.warning : job.status === "published" ? theme.success : theme.mutedForeground}>{statusLabel[job.status]}{aiJobActive(job) ? "…" : ""}</T>
        </View>
        {!!job.message && <T variant="small" muted>{job.message}</T>}
        {job.recipeId && job.status === "published" && <Button label="Open Recipe" variant="link" onPress={() => router.push(("/cook/recipe/" + job.recipeId) as never)} />}
        {job.retryable && <Button label="Try Again" variant="link" disabled={!enabled || busy !== null} onPress={() => void start(job.kind, job.input)} />}
      </Card>)}
    </View>}
  </CookLayout>;
}
