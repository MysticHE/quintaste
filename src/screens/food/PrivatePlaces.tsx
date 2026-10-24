import { router } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Screen } from "../../components/Screen";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import type { IconName } from "../../components/ui";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import type { PrivatePlace, PrivatePlaceKind } from "../../types/food";
import { privatePlaceFor, privatePlaceKind, readPrivatePoint } from "../../utils/private-places";
import { placeTitle } from "../../hooks/usePrivatePlaceEditor";
import { useT } from "../../i18n";

export const openPlace = (params: { id?: string; kind: PrivatePlaceKind }) => router.push({ pathname: "/location-place", params });
const icons: Record<PrivatePlaceKind, IconName> = { home: "home-outline", work: "briefcase-outline", custom: "location-outline" };
export function PrivatePlacesScreen() {
  const { owner } = useFood();
  return <LocationList key={owner} />;
}
/** Home and Work always have their own row; other places follow, then Add Place. */
function PlaceRow({ kind, place }: { kind: PrivatePlaceKind; place?: PrivatePlace }) {
  const t = useT("explore");
  const title = placeTitle(kind, place?.label, { home: t("home"), work: t("work") }), resolved = !!place && !!readPrivatePoint(place.point);
  const address = place?.address ? [place.address, place.details].filter(Boolean).join(", ") : "";
  return <ListItem title={title} subtitle={address || t("addAddress")} leading={<RowIcon name={icons[kind]} tone={resolved ? "accent" : "muted"} />} wrap
    trailing={place?.isDefault && resolved ? <StatusPill label={t("defaultTag")} tone="accent" /> : place && !resolved ? <StatusPill label={t("updateTag")} tone="warning" /> : undefined}
    label={[title, address || t("noAddress"), place?.isDefault ? t("defaultLower") : ""].filter(Boolean).join(", ")}
    onPress={() => openPlace(place ? { id: place.id, kind } : { kind })} />;
}
function LocationList() {
  const { doc, ready } = useFood(), { theme } = usePreferences(), t = useT("explore");
  const others = doc.privatePlaces.filter(place => privatePlaceKind(place) === "custom");
  return <Screen title={t("location")}>
    {!ready ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingPlaces")} /> : <>
      <ListGroup>
        <PlaceRow kind="home" place={privatePlaceFor(doc.privatePlaces, "home")} />
        <PlaceRow kind="work" place={privatePlaceFor(doc.privatePlaces, "work")} />
        {others.map(place => <PlaceRow key={place.id} kind="custom" place={place} />)}
        {doc.privatePlaces.length < 20 && <ListItem title={t("addPlace")} leading={<RowIcon name="add" />} onPress={() => openPlace({ kind: "custom" })} />}
      </ListGroup>
    </>}
  </Screen>;
}
