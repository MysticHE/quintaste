import { avatarExport } from "../../utils/avatar-schema";
import { useState } from "react";
import { Share } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { useExploreLocal } from "../../state/ExploreLocal";
import { defaults } from "../../config/preferences";
import { useAuth } from "../../state/Auth";
import { accountsEnabled } from "../../services/auth-client";
import { withdrawRecipes } from "../../services/member-recipes";

export function PrivacyScreen() {
  const { user } = useAuth();
  const { doc, owner, deleteCurrent, readable } = useFood();
  const { saved, save, setPreview, setNotice } = usePreferences();
  const local = useExploreLocal();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const exportData = async () => {
    const textData = { app: "QuinTaste local preview", collection: owner, exportedAt: new Date().toISOString(),
      preferences: saved, data: { ...doc, avatar: avatarExport(doc.avatar), recipes: { ...doc.recipes, drafts: doc.recipes.drafts.map(({ photo, steps, ...draft }) => ({ ...draft, photoAttached: !!photo, steps: steps.map(({ photo, ...step }) => ({ ...step, photoAttached: !!photo })) })) }, exploreLocal: { ...doc.exploreLocal, drafts: doc.exploreLocal.drafts.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) }, market: { ...doc.market, listings: doc.market.listings.map(({ photos, ...item }) => ({ ...item, photoSlots: Object.keys(photos).filter(key => !!photos[key as keyof typeof photos]) })) }, cases: doc.cases.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) } };
    try { await Share.share({ message: JSON.stringify(textData, null, 2), title: "QuinTaste data export" }); }
    catch { setNotice({ text: "System export sharing is unavailable here. Your local data was not changed.", error: true }); }
  };
  const erase = async () => {
    setBusy(true);
    try {
      // Recipes shared from these drafts leave Cook first; the drafts that manage them are about to go.
      const drafts = doc.recipes.drafts.map(d => d.id);
      if (accountsEnabled && user?.adultConfirmed && drafts.length) {
        try { await withdrawRecipes(drafts); }
        catch { setNotice({ text: "Connect to remove your shared recipes. Your device collection has not been cleared.", error: true }); return; }
      }
      if (!await local.eraseServer()) { setNotice({ text: "Connect to delete local review records. Your device collection has not been cleared.", error: true }); return; }
      if (!await deleteCurrent()) { local.resume(); return; }
      try { await local.completeErase(); }
      catch { local.resume(); setNotice({ text: "Collection cleared. Local session cleanup failed; retry deletion to finish.", error: true }); return; }
      if (owner === "profile" && !await save({ displayName: defaults.displayName, bio: "" })) {
        local.resume(); setNotice({ text: "Food data was cleared, but the profile name could not be cleared. Retry deletion to finish.", error: true }); return;
      }
      local.resume(); setConfirm(false);
      if (owner === "profile" && !user) setPreview(false);
      setNotice({ text: "Data on this phone was deleted" });
      router.dismissTo("/account");
    } finally { setBusy(false); }
  };
  return <Screen title="Privacy & Data">
    <ListGroup title="Where your data lives">
      <ListItem title="On this phone" subtitle="Saves, notes, recipe drafts, shopping list, cooking timers and your Home and Work addresses" wrap leading={<RowIcon name="phone-portrait-outline" />} />
      {!!user && <ListItem title="In your QuinTaste account" subtitle="Your profile, Social plans and messages, Market shop and orders, reviews and shared recipes" wrap leading={<RowIcon name="cloud-outline" />} />}
    </ListGroup>
    <Button label="Export My Data" icon="share-outline" variant="secondary" onPress={() => void exportData()} disabled={!readable} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Delete data on this phone</T>
      <T muted>Removes everything listed under On this phone{user ? " and takes your shared recipes out of Cook. Your account stays; delete it from Edit Profile." : "."}</T>
      {confirm ? <>
        <Button label="Delete From This Phone" onPress={() => void erase()} loading={busy} disabled={!readable} />
        <Button label="Keep My Data" variant="secondary" disabled={busy} onPress={() => setConfirm(false)} />
      </> : <Button label="Review Deletion" variant="secondary" onPress={() => setConfirm(true)} />}
    </Card>
  </Screen>;
}
