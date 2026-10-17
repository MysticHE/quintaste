import { Button, Icon, T, common } from "../ui";
import { View } from "react-native";
import * as Linking from "expo-linking";
import { googlePlaceUrl } from "../../utils/place-directory";
import { usePreferences } from "../../state/Preferences";

/** External Google reviews are attributed separately from QuinTaste member ratings. */
export function GoogleReviewsLink({ id, name, address }: { id: string | null; name: string; address: string }) {
  const { setNotice } = usePreferences();
  const open = async () => {
    const url = id ? googlePlaceUrl(id, name) : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(name + ", " + address);
    try { await Linking.openURL(url); } catch { setNotice({ text: "Google Maps could not open. Try again.", error: true }); }
  };
  return <View testID="google-reviews-link" style={[common.row, { flexWrap: "wrap", gap: 6 }]}>
    <Icon name="logo-google" size={16} /><T variant="small" style={common.flex}>Google reviews</T>
    <Button label="View on Google Maps" variant="link" icon="open-outline" onPress={() => void open()} />
  </View>;
}
