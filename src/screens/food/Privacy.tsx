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
import { useT } from "../../i18n";

export function PrivacyScreen() {
  const { user } = useAuth();
  const { doc, owner, deleteCurrent, readable } = useFood();
  const { saved, save, setPreview, setNotice } = usePreferences();
  const local = useExploreLocal(), t = useT("me");
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const exportData = async () => {
    const textData = { app: "QuinTaste local preview", collection: owner, exportedAt: new Date().toISOString(),
      preferences: saved, data: { ...doc, avatar: avatarExport(doc.avatar), recipes: { ...doc.recipes, drafts: doc.recipes.drafts.map(({ photo, steps, ...draft }) => ({ ...draft, photoAttached: !!photo, steps: steps.map(({ photo, ...step }) => ({ ...step, photoAttached: !!photo })) })) }, exploreLocal: { ...doc.exploreLocal, drafts: doc.exploreLocal.drafts.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) }, market: { ...doc.market, listings: doc.market.listings.map(({ photos, ...item }) => ({ ...item, photoSlots: Object.keys(photos).filter(key => !!photos[key as keyof typeof photos]) })) }, cases: doc.cases.map(({ photoUri, ...item }) => ({ ...item, photoAttached: !!photoUri })) } };
    try { await Share.share({ message: JSON.stringify(textData, null, 2), title: t("dataExportTitle") }); }
    catch { setNotice({ text: t("exportUnavailable"), error: true }); }
  };
  const erase = async () => {
    setBusy(true);
    try {
      // Recipes shared from these drafts leave Cook first; the drafts that manage them are about to go.
      const drafts = doc.recipes.drafts.map(d => d.id);
      if (accountsEnabled && user?.adultConfirmed && drafts.length) {
        try { await withdrawRecipes(drafts); }
        catch { setNotice({ text: t("connectToRemoveRecipes"), error: true }); return; }
      }
      if (!await local.eraseServer()) { setNotice({ text: t("connectToDeleteRecords"), error: true }); return; }
      if (!await deleteCurrent()) { local.resume(); return; }
      try { await local.completeErase(); }
      catch { local.resume(); setNotice({ text: t("cleanupFailed"), error: true }); return; }
      if (owner === "profile" && !await save({ displayName: defaults.displayName, bio: "" })) {
        local.resume(); setNotice({ text: t("nameClearFailed"), error: true }); return;
      }
      local.resume(); setConfirm(false);
      if (owner === "profile" && !user) setPreview(false);
      setNotice({ text: t("phoneDataDeleted") });
      router.dismissTo("/account");
    } finally { setBusy(false); }
  };
  return <Screen title={t("privacyData")}>
    <ListGroup title={t("whereDataLives")}>
      <ListItem title={t("onThisPhone")} subtitle={t("onThisPhoneList")} wrap leading={<RowIcon name="phone-portrait-outline" />} />
      {!!user && <ListItem title={t("inYourAccount")} subtitle={t("inYourAccountList")} wrap leading={<RowIcon name="cloud-outline" />} />}
    </ListGroup>
    <Button label={t("exportMyData")} icon="share-outline" variant="secondary" onPress={() => void exportData()} disabled={!readable} />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">{t("deletePhoneData")}</T>
      <T muted>{user ? t("deletePhoneNoteAccount") : t("deletePhoneNoteGuest")}</T>
      {confirm ? <>
        <Button label={t("deleteFromPhone")} onPress={() => void erase()} loading={busy} disabled={!readable} />
        <Button label={t("keepMyData")} variant="secondary" disabled={busy} onPress={() => setConfirm(false)} />
      </> : <Button label={t("reviewDeletion")} variant="secondary" onPress={() => setConfirm(true)} />}
    </Card>
  </Screen>;
}
