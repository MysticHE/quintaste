import { ExploreContributionScreen } from "./ExploreContribution";
import { ExploreCaseList } from "../../components/discovery/ExploreCaseList";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Card, Field, T, common } from "../../components/ui";
import { InfoBox } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";

export function ContributionScreen() {
  const params = useLocalSearchParams<{ placeId?: string; target?: string; kind?: string; draftId?: string; menuId?: string; topic?: string }>(), { owner, ready } = useFood();
  if (!ready) return <Screen title="Place Submission"><T muted>Loading collection…</T></Screen>;
  if (typeof params.placeId === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(params.placeId)) return <ExploreContributionScreen key={owner + params.placeId + params.kind + params.draftId + params.menuId + params.topic}
    placeId={params.placeId} target={typeof params.target === "string" ? params.target.slice(0, 300) : "Place"}
    kind={params.kind === "report" ? "report" : "correction"} draftId={params.draftId}
    menuId={typeof params.menuId === "string" && /^[a-z0-9][a-z0-9-]{2,119}$/.test(params.menuId) ? params.menuId : undefined}
    topic={params.topic} />;
  return <LegacyContributionScreen key={owner} />;
}
function LegacyContributionScreen() {
  const { target = "QuinTaste", kind = "correction" } = useLocalSearchParams<{ target?: string; kind?: string }>();
  const { addCase, readable, doc } = useFood();
  const { theme } = usePreferences();
  const [text, setText] = useState(""), [photo, setPhoto] = useState<string>(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [photoMissing, setPhotoMissing] = useState(false);
  const pick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError("Photo access was not allowed. You can still save a text draft."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.4, base64: true, allowsMultipleSelection: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset.base64 && asset.base64.length <= 2800000) { setPhoto("data:" + (asset.mimeType ?? "image/jpeg") + ";base64," + asset.base64); setPhotoMissing(false); setError(""); }
      else setError("This photo is too large for a local draft. Choose a smaller menu or label photo, or save the text only.");
    } catch { setError("The photo picker is unavailable here. Your text draft can still be saved."); }
  };
  const save = async () => {
    if (!text.trim()) { setError("Describe what needs to be corrected or reported."); return; }
    if (doc.cases.length >= 100) { setError("You have 100 local drafts. Remove one from My cases first."); return; }
    setBusy(true); setError("");
    try {
      if (await addCase({ kind: kind === "report" ? "report" : "correction", target: target.slice(0, 120), text: text.trim(), photoUri: photo })) {
        router.replace("/cases");
      }
    } finally { setBusy(false); }
  };
  return <Screen title={kind === "report" ? "Report A Concern" : "Suggest A Correction"} subtitle={target}>
    <InfoBox title="Saved Locally · Not Sent" text="Case delivery and moderation are not connected. This creates a private draft on your device and does not update public facts." />
    <Field label="What Did You Find?" placeholder="Include the ingredient, source and when you checked." multiline maxLength={2000} value={text} onChangeText={setText} style={{ minHeight: 130, textAlignVertical: "top" }} />
    <Button label="Attach Menu Or Label Photo" icon="image-outline" variant="secondary" onPress={() => void pick()} />
    {!!photo && <Card style={common.stack}>{photoMissing ? <T muted>Attachment could not be displayed.</T> : <Image source={{ uri: photo }} style={{ width: "100%", height: 180, borderRadius: 16 }} resizeMode="contain" onError={() => setPhotoMissing(true)} />}
      <Button label="Remove Attachment" variant="link" onPress={() => { setPhoto(undefined); setPhotoMissing(false); }} /></Card>}
    <T variant="small" muted>Photograph the menu or ingredient label only. Avoid people’s faces, private contact details and unrelated personal information.</T>
    {!!error && <T color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label="Save Local Draft" loading={busy} disabled={!readable} onPress={() => void save()} />
  </Screen>;
}
export function CasesScreen() {
  const { doc, patchDocument } = useFood();
  return <Screen title="My Cases">
    <ExploreCaseList />
    {!!doc.cases.length && <InfoBox title="Other Local Drafts" text="These older drafts have not been submitted." />}
    {doc.cases.map(item => <Card key={item.id} style={common.stack}>
      <T variant="subtitle">{item.target}</T><T variant="small" muted>{item.kind === "report" ? "Report" : "Correction"} · {new Date(item.createdAt).toLocaleDateString("en-SG")}</T>
      <T style={common.bold}>Saved locally · Not sent</T><T selectable>{item.text}</T>
      {item.photoUri && <T variant="small" muted>Menu / label attachment kept with this local draft.</T>}
      <View><T variant="small" muted>Receipt: {item.id}</T></View>
      <Button label="Delete Draft" variant="link" onPress={() => void patchDocument({ cases: doc.cases.filter(draft => draft.id !== item.id) })} />
    </Card>)}
    <Button label="New Report" icon="add-outline" onPress={() => router.push({ pathname: "/contribute", params: { kind: "report", target: "QuinTaste preview" } })} />
  </Screen>;
}
