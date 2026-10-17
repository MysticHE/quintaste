import { router } from "expo-router";
import { View } from "react-native";
import { useFood } from "../../state/Food";
import { useExploreLocal } from "../../state/ExploreLocal";
import { recalledPlace } from "../../utils/live-place-cache";
import { Button, Card, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { LivePlaceCard } from "./LivePlaceCard";

export function SavedPlaceCard({ placeId, now, more }: { placeId: string; now: number; more: () => void }) {
  const place = recalledPlace(placeId, now), { toggleSave, doc } = useFood(), { offline } = useExploreLocal();
  const id = "google-" + placeId, label = doc.exploreLocal.labels[id] ?? "Saved place", saved = doc.saves.find(item => item.id === id && item.kind === "place");
  if (place) return <LivePlaceCard place={place} now={now} more={more} />;
  const open = () => router.push({ pathname: "/place/[id]", params: { id, from: "saved" } } as never);
  return <Card style={common.stack}><View style={common.row}><T variant="subtitle" style={common.flex} numberOfLines={2}>{label}</T>
    <IconButton label={"Remove " + label} icon="bookmark" selected onPress={() => void toggleSave("place", id)} /></View>
    <T variant="small" muted>{offline ? "Offline bookmark" : "Live details available on open"}{saved ? " · " + new Date(saved.savedAt).toLocaleDateString("en-SG") : ""}</T>
    <Button label={offline ? "View Bookmark" : "Open Place"} variant="secondary" onPress={open} />
    <Button label="More Options" variant="link" onPress={more} />
  </Card>;
}
