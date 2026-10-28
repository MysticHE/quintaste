import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { MarketModal } from "../market/MarketChrome";
import { ListingPhotos, photoBudgets } from "../market/ListingPhotos";
import { Chip } from "../food/Controls";
import { Button, Field, T } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useAuth } from "../../state/Auth";
import { ApiError } from "../../services/community-api";
import { cookedReasons, deleteCookedPhoto, reportCookedPhoto, saveCookedPhoto, type CookedPhoto } from "../../services/cooked-photos-api";
import type { MarketPhotos } from "../../types/market";
import { useT } from "../../i18n";

export type CookedAction = "post" | "delete" | "report";
/** Posting or changing your cooked photo (one photo, an optional note), deleting it, or reporting someone else's. */
export function CookedPhotoDialog({ recipeId, action, photo, onClose, onSaved }: {
  recipeId: string; action: CookedAction; photo?: CookedPhoto; onClose: () => void; onSaved: () => void;
}) {
  const { theme, setNotice } = usePreferences(), { user } = useAuth(), t = useT("cook"), tc = useT("common");
  const [photos, setPhotos] = useState<MarketPhotos>({ item: action === "post" ? photo?.photo : undefined });
  const [note, setNote] = useState(action === "post" ? photo?.note ?? "" : ""), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    setBusy(true); setError("");
    try {
      // The stored photo comes back as its server path: unchanged, only the note is sent.
      if (action === "post") await saveCookedPhoto(recipeId, photos.item === photo?.photo ? "keep" : photos.item!, note);
      else if (action === "delete") await deleteCookedPhoto(recipeId);
      else await reportCookedPhoto(recipeId, photo!.id, reason, note);
      onSaved(); onClose(); setNotice({ text: t(action === "post" ? "cookedPosted" : action === "delete" ? "cookedDeleted" : "cookedReported") });
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("cookedFailed")); }
    finally { setBusy(false); }
  };
  const title = t(action === "post" ? photo ? "changeCookedPhoto" : "addCookedPhoto" : action === "delete" ? "deleteCookedPhoto" : "reportCookedPhoto");
  return <MarketModal visible onClose={() => { if (!busy && !photoBusy) onClose(); }} label={title}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body} style={s.scroll}>
        {action === "post" && <>
          <ListingPhotos value={photos} onChange={setPhotos} slots={["item"]} labels={{ item: t("cookedPhotoLabel") }}
            disabled={busy || photoBusy} onBusy={setPhotoBusy} budget={photoBudgets.upload} />
          <Field label={t("cookedNoteOptional")} placeholder={t("cookedNotePlaceholder")} value={note} onChangeText={setNote} multiline maxLength={280} editable={!busy} />
          <T variant="caption" muted>{t("cookedPublicAs", { name: user?.name || t("cookedYourName") })}</T>
        </>}
        {action === "report" && <>
          <View style={s.reasons}>{cookedReasons.map(value => <Chip key={value} compact role="radio" label={t("cookedReason", { name: value })}
            selected={reason === value} disabled={busy} onPress={() => setReason(value)} />)}</View>
          <Field label={t("cookedDetailsOptional")} value={note} onChangeText={setNote} multiline maxLength={1000} editable={!busy} />
        </>}
        {action === "delete" && <T variant="small">{t("deleteCookedWarning")}</T>}
        {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
        <Button label={t(action === "post" ? "postCookedPhoto" : action === "delete" ? "deleteCookedPhoto" : "sendCookedReport")} loading={busy}
          disabled={photoBusy || (action === "post" ? !photos.item : action === "report" ? !reason : false)} onPress={() => void send()} />
        <Button label={tc("cancel")} variant="link" disabled={busy || photoBusy} onPress={onClose} />
      </ScrollView>
    </KeyboardAvoidingView>
  </MarketModal>;
}
const s = StyleSheet.create({
  scroll: { maxHeight: 520 },
  body: { gap: 14 },
  reasons: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
