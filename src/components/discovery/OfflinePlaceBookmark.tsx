import { Share } from "react-native";
import { Button, Card, T, common } from "../ui";
import { SavedPlaceLabel } from "./SavedPlaceLabel";
import { useFood } from "../../state/Food";
import { googlePlaceUrl } from "../../utils/place-directory";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { zhLocalDate } from "../../utils/food-format";

export function OfflinePlaceBookmark({ placeId }: { placeId: string }) {
  const { doc } = useFood(), { setNotice } = usePreferences(), id = "google-" + placeId, t = useT("explore"), language = useLanguage();
  const saved = doc.saves.find(item => item.kind === "place" && item.id === id);
  if (!saved) return null;
  const share = async () => {
    try { await Share.share({ message: googlePlaceUrl(placeId, "Place"), title: t("placeLink") }); }
    catch { setNotice({ text: t("shareUnavailableConnected"), error: true }); }
  };
  return <Card style={common.stack}>
    <T variant="subtitle">{doc.exploreLocal.labels[id] || t("savedPlace")}</T>
    <T variant="small" muted>{t("savedOn", { date: language === "zh" ? zhLocalDate(saved.savedAt) : new Date(saved.savedAt).toLocaleDateString("en-SG"), list: saved.list || t("noList") })}</T>
    <SavedPlaceLabel id={id} />
    <Button label={t("sharePlaceLink")} variant="secondary" icon="share-outline" onPress={() => void share()} />
  </Card>;
}
