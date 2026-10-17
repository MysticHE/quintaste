import { avatarExport } from "../../utils/avatar-schema";
import { useState } from "react";
import { Share } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { InfoBox } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useExploreLocal } from "../../state/ExploreLocal";
import { defaults } from "../../config/preferences";
import { useAuth } from "../../state/Auth";

export function PrivacyScreen() {
  const { user } = useAuth();
  const { doc, owner, deleteCurrent, readable } = useFood();
  const { saved, save, setPreview, setNotice } = usePreferences();
  const local = useExploreLocal();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const exportData = async () => {
    const textData = { app: "QuinTaste local preview", collection: owner, exportedAt: new Date().toISOString(),
      preferences: saved, data: { ...doc, avatar: avatarExport(doc.avatar), recipes: { ...doc.recipes, drafts: doc.recipes.drafts.map(({ photo, steps, ...draft }) => ({ ...draft, photoAttached: !!photo, steps: steps.map(({ photo, ...step }) => ({ ...step, photoAttached: !!photo })) })) }, exploreLocal: { ...doc.exploreLocal, drafts: doc.exploreLocal.drafts.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) }, market: { ...doc.market, listings: doc.market.listings.map(({ photos, ...item }) => ({ ...item, photoSlots: Object.keys(photos).filter(key => !!photos[key as keyof typeof photos]) })) }, cases: doc.cases.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) } };
    try { await Share.share({ message: JSON.stringify(textData, null, 2), title: "QuinTaste local data export" }); }
    catch { setNotice({ text: "System export sharing is unavailable here. Your local data was not changed.", error: true }); }
  };
  const erase = async () => {
    setBusy(true);
    try {
      if (!await local.eraseServer()) { setNotice({ text: "Connect to delete local review records. Your device collection has not been cleared.", error: true }); return; }
      if (!await deleteCurrent()) { local.resume(); return; }
      try { await local.completeErase(); }
      catch { local.resume(); setNotice({ text: "Collection cleared. Local session cleanup failed; retry deletion to finish.", error: true }); return; }
      if (owner === "profile" && !await save({ displayName: defaults.displayName, bio: "" })) {
        local.resume(); setNotice({ text: "Food data was cleared, but the profile name could not be cleared. Retry deletion to finish.", error: true }); return;
      }
      local.resume(); setConfirm(false);
      if (owner === "profile" && !user) setPreview(false);
      setNotice({ text: "This local collection was cleared. Other local collections and your theme remain." });
      router.dismissTo("/account");
    } finally { setBusy(false); }
  };
  return <Screen title="Privacy & Local Data" subtitle="You decide what stays on this device.">
    <InfoBox title={owner === "guest" ? "Guest Collection" : "Local Profile Collection"} icon="shield-checkmark-outline" text="Your collection stays on this device. Submitted place cases and opted-in coarse areas also use the local development server. Guest and profile collections stay separate." />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Export Text Data</T>
      <T muted>This personal export includes your private notes, places and preferences. Photo bytes are excluded. Share it only to a destination you trust.</T>
      <Button label="Open Personal Export Share" variant="secondary" onPress={() => void exportData()} disabled={!readable} /></Card>
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Delete This Collection</T>
      <T muted>Clears your saved avatar, saves, notes, private places, case drafts and local review records, participation, marketplace listings, conversations and favourites, social profiles, groups, messages, gatherings, host applications, reports and earlier sample records, private recipe drafts, shopping notes, cooking progress and timers in the current collection. A copied guest collection remains separate.</T>
      {confirm ? <>
        <T style={common.bold}>Delete this {owner} collection from this device?</T>
        <Button label="Delete Local Collection" onPress={() => void erase()} loading={busy} disabled={!readable} />
        <Button label="Cancel Deletion" variant="secondary" disabled={busy} onPress={() => setConfirm(false)} />
      </> : <Button label="Review Deletion" variant="secondary" onPress={() => setConfirm(true)} />}
    </Card>
    <T variant="small" muted>Public item shares contain the item only. Precise locations and private notes are excluded. Location and photo access are requested only when you choose those actions.</T>
  </Screen>;
}
