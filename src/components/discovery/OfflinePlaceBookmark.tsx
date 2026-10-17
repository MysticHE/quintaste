import { Share } from "react-native";
import { Button, Card, T, common } from "../ui";
import { SavedPlaceLabel } from "./SavedPlaceLabel";
import { useFood } from "../../state/Food";
import { googlePlaceUrl } from "../../utils/place-directory";
import { usePreferences } from "../../state/Preferences";

export function OfflinePlaceBookmark({ placeId }: { placeId: string }) {
  const { doc } = useFood(), { setNotice } = usePreferences(), id = "google-" + placeId;
  const saved = doc.saves.find(item => item.kind === "place" && item.id === id);
  if (!saved) return null;
  const share = async () => {
    try { await Share.share({ message: googlePlaceUrl(placeId, "Place"), title: "Place link" }); }
    catch { setNotice({ text: "Sharing unavailable. Try again when connected.", error: true }); }
  };
  return <Card style={common.stack}>
    <T variant="subtitle">{doc.exploreLocal.labels[id] || "Saved place"}</T>
    <T variant="small" muted>Saved {new Date(saved.savedAt).toLocaleDateString("en-SG")} · {saved.list || "No list"}</T>
    <SavedPlaceLabel id={id} />
    <Button label="Share Place Link" variant="secondary" icon="share-outline" onPress={() => void share()} />
  </Card>;
}
