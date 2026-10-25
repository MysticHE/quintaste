import * as Linking from "expo-linking";
import { googlePlaceUrl } from "../../utils/place-directory";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { PlaceRow } from "./PlaceDetailParts";

/** External Google reviews are attributed separately from QuinTaste member ratings. */
export function GoogleReviewsLink({ id, name, address }: { id: string | null; name: string; address: string }) {
  const { setNotice } = usePreferences(), t = useT("explore");
  const open = async () => {
    const url = id ? googlePlaceUrl(id, name) : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + ", " + address);
    try { await Linking.openURL(url); } catch { setNotice({ text: t("mapsFailed"), error: true }); }
  };
  return <PlaceRow testID="google-reviews-link" icon="logo-google" text={t("googleReviewsLabel")} trailing="open-outline"
    accessibilityLabel={t("googleReviewsLabel") + ", " + t("viewOnGoogleMaps")} onPress={() => void open()} />;
}
