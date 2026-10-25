import { router } from "expo-router";
import { View } from "react-native";
import { useFood } from "../../state/Food";
import { recalledPlace } from "../../utils/live-place-cache";
import { Button, Card, T, common } from "../ui";
import { IconButton } from "../food/Controls";
import { LivePlaceCard } from "./LivePlaceCard";
import { useLanguage, useT } from "../../i18n";
import { zhLocalDate } from "../../utils/food-format";

export function SavedPlaceCard({ placeId, now, more }: { placeId: string; now: number; more: () => void }) {
  const place = recalledPlace(placeId, now), { toggleSave, doc } = useFood();
  const t = useT("explore"), language = useLanguage();
  const id = "google-" + placeId, label = doc.exploreLocal.labels[id] ?? t("savedPlace"), saved = doc.saves.find(item => item.id === id && item.kind === "place");
  if (place) return <LivePlaceCard place={place} now={now} more={more} />;
  const open = () => router.push({ pathname: "/place/[id]", params: { id, from: "saved" } } as never);
  return <Card style={common.stack}><View style={common.row}><T variant="subtitle" style={common.flex} numberOfLines={2}>{label}</T>
    <IconButton label={t("removeName", { name: label })} icon="bookmark" selected onPress={() => void toggleSave("place", id)} /></View>
    {saved && <T variant="small" muted>{language === "zh" ? zhLocalDate(saved.savedAt) : new Date(saved.savedAt).toLocaleDateString("en-SG")}</T>}
    <Button label={t("openPlace")} variant="secondary" onPress={open} />
    <Button label={t("moreOptions")} variant="link" onPress={more} />
  </Card>;
}
