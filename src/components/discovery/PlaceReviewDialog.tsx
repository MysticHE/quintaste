import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { MarketModal } from "../market/MarketChrome";
import { Button, Field, T } from "../ui";
import { Chip } from "../food/Controls";
import { usePreferences } from "../../state/Preferences";
import { useAuth } from "../../state/Auth";
import { ApiError } from "../../services/community-api";
import { deletePlaceReview, reportPlaceReview, savePlaceReview } from "../../services/place-reviews-api";
import type { PlaceReview } from "../../types/place-reviews";
import { ReviewStars } from "./ReviewStars";
import { ListingPhotos, photoBudgets } from "../market/ListingPhotos";
import type { MarketPhotos } from "../../types/market";
import { useT } from "../../i18n";

const reasons = ["Spam", "Not about this place", "Offensive content", "Conflict of interest", "Other"];

export function PlaceReviewDialog({ placeId, review, action, onClose, onSaved }: {
  placeId: string; review?: PlaceReview; action: "write" | "delete" | "report"; onClose: () => void; onSaved: () => void;
}) {
  const { theme, setNotice } = usePreferences(), { user } = useAuth(), t = useT("explore"), tc = useT("common");
  const [rating, setRating] = useState(review?.rating ?? 0), [body, setBody] = useState(action === "write" ? review?.body ?? "" : "");
  const [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [photos, setPhotos] = useState<MarketPhotos>(() => ({ item: review?.photos?.[0], detail: review?.photos?.[1], label: review?.photos?.[2] }));
  const [photoBusy, setPhotoBusy] = useState(false);
  const send = async () => {
    setBusy(true); setError("");
    try {
      if (action === "write") await savePlaceReview(placeId, rating, body, [photos.item, photos.detail, photos.label].filter((uri): uri is string => !!uri));
      else if (action === "delete") await deletePlaceReview(placeId);
      else if (review) await reportPlaceReview(placeId, review.id, reason, body);
      onSaved(); onClose(); setNotice({ text: t(action === "report" ? "reportSent" : action === "delete" ? "reviewDeleted" : "reviewPublished") });
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : t("didNotSave")); }
    finally { setBusy(false); }
  };
  const title = t(action === "write" ? review ? "editYourReview" : "writeAReview" : action === "delete" ? "deleteYourReview" : "reportReview");
  return <MarketModal visible onClose={() => { if (!busy && !photoBusy) onClose(); }} label={title}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }} style={{ maxHeight: 480 }}>
        {action === "write" && <>
          <View style={{ gap: 4 }}><T variant="small">{t("yourRating")}</T><ReviewStars value={rating} onChange={setRating} disabled={busy} /></View>
          <Field label={t("reviewOptional")} placeholder={t("reviewPlaceholder")} value={body} onChangeText={setBody} multiline maxLength={2000} editable={!busy} />
          <View style={{ gap: 6 }}><T variant="small">{t("photosOptional")}</T>
            <ListingPhotos value={photos} onChange={setPhotos} slots={["item", "detail", "label"]} labels={{ item: t("photoN", { n: 1 }), detail: t("photoN", { n: 2 }), label: t("photoN", { n: 3 }) }}
              disabled={busy || photoBusy} onBusy={setPhotoBusy} budget={photoBudgets.upload} />
            <T variant="caption" muted>{t("ownPhotosHint")}</T>
          </View>
          <T variant="caption" muted>{t("publicAs", { name: user?.name || t("yourAccountName") })}</T>
        </>}
        {action === "report" && <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{reasons.map(value =>
            <Chip key={value} label={t("reviewReason", { name: value })} role="radio" compact selected={reason === value} disabled={busy} onPress={() => setReason(value)} />)}</View>
          <Field label={t("detailsOptional")} value={body} onChangeText={setBody} multiline maxLength={1000} editable={!busy} />
        </>}
        {action === "delete" && <T variant="small">{t("deleteWarning")}</T>}
        {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
        <Button label={t(action === "write" ? "publishReview" : action === "delete" ? "deleteReview" : "sendReport")}
          loading={busy} disabled={photoBusy || (action === "write" ? !rating : action === "report" ? !reason : false)} onPress={() => void send()} />
        <Button label={tc("cancel")} variant="link" disabled={busy || photoBusy} onPress={onClose} />
      </ScrollView>
    </KeyboardAvoidingView>
  </MarketModal>;
}
