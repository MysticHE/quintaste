import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Icon, T, type IconName } from "../ui";
import { IconButton, SearchField } from "../food/Controls";
import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { RemoteStatus } from "../CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { useLocationSuggestions } from "../../hooks/useLocationSuggestions";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { places, placesKey } from "../../services/social-api";
import type { SocialPlace } from "../../types/community";
import type { LocationSuggestion, SearchPoint } from "../../types/location-search";
import { distanceKm, inSingapore } from "../../utils/discovery-search";
import { addressLine } from "../../utils/location-search";
import { nearbyPosition } from "../../utils/nearby-position";
import { locationIssue, locationMessages } from "../../utils/location-feedback";
import { defaultPrivatePlace, privatePlaceKind, readPrivatePoint } from "../../utils/private-places";
import { useT } from "../../i18n";
import { PlaceThumb } from "./Face";
import { Sheet } from "./Sheet";

/** Where "nearby" is measured from: the member's default saved place, or a location they picked or found with GPS in this sheet. */
type Origin = { point: SearchPoint; label: string; icon: IconName; picked: boolean };

/**
 * Choose a place to eat. Opens on the places nearest the member's default location (Location settings), or offers their phone's
 * location. Typing searches place names and also offers matching addresses, postal codes and areas: choosing one lists the places
 * nearest to it. Only a rounded map point is sent, never a saved address.
 */
export function PlacePicker({ visible, onClose, onPick, title, selectedId }: {
  visible: boolean; onClose: () => void; onPick: (place: SocialPlace) => void; title?: string; selectedId?: string | null;
}) {
  const t = useT("social"), te = useT("explore"), { theme } = usePreferences(), { doc } = useFood();
  const [query, setQuery] = useState(""), search = useDebounced(query).trim(), typing = search.length >= 2;
  const [picked, setPicked] = useState<Origin | null>(null), [locating, setLocating] = useState(false), [issue, setIssue] = useState("");
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current += 1; }, []);
  const home = defaultPrivatePlace(doc.privatePlaces), homePoint = home ? readPrivatePoint(home.point) : undefined;
  const homeKind = home ? privatePlaceKind(home) : undefined;
  const origin: Origin | null = picked ?? (home && homePoint ? { point: homePoint, picked: false,
    icon: homeKind === "home" ? "home-outline" : homeKind === "work" ? "briefcase-outline" : "bookmark-outline",
    label: homeKind === "home" ? t("nearHomeLabel") : homeKind === "work" ? t("nearWorkLabel") : t("nearNamed", { name: home.label }) } : null);
  const key = typing || origin ? placesKey(typing ? search : "", origin?.point) : null;
  const remote = useRemote(visible && key ? key : null, signal => places(key!, signal));
  const locations = useLocationSuggestions(query, visible && typing);
  const addresses = locations.suggestions.filter((item): item is Extract<LocationSuggestion, { kind: "address" }> => item.kind === "address").slice(0, 4);
  const items = remote.data?.items ?? [];

  const reset = () => { setQuery(""); setIssue(""); };
  const close = () => { attempt.current += 1; setLocating(false); reset(); onClose(); };
  const pick = (place: SocialPlace) => { onPick(place); close(); };
  const nearLocation = (item: Extract<LocationSuggestion, { kind: "address" }>) => {
    setPicked({ point: { latitude: item.latitude, longitude: item.longitude }, picked: true, icon: "location", label: t("nearNamed", { name: item.name }) }); reset();
  };
  const locate = async () => {
    const mine = ++attempt.current, current = () => attempt.current === mine;
    setLocating(true); setIssue("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([nearbyPosition(current),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), 20000); })]);
      if (!current() || !position) return;
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      if (!inSingapore(point)) { setIssue(te(locationMessages.outside)); return; }
      setPicked({ point, picked: true, icon: "navigate", label: t("nearYouLabel") }); reset();
    } catch (problem) {
      if (current()) setIssue(te(locationMessages[locationIssue(problem)]));
    } finally {
      if (timer) clearTimeout(timer);
      if (current()) setLocating(false);
    }
  };

  const placeList = !!items.length && <ListGroup title={typing ? t("placesHeading") : t("nearbyHeading")} inset={70}>
    {items.map(place => <PlaceItem key={place.id} place={place} origin={origin?.point} selected={place.id === selectedId} onPress={() => pick(place)} />)}
  </ListGroup>;
  const locationList = !!addresses.length && <ListGroup title={t("locationsHeading")}>
    {addresses.map(item => <ListItem key={item.id} title={item.name} subtitle={addressLine(item)} leading={<RowIcon name="location-outline" tone="muted" />}
      label={t("showPlacesNear", { name: item.name })} onPress={() => nearLocation(item)} />)}
  </ListGroup>;
  // A postal code is almost always a location to search near, so its matches lead; a word is usually a place name.
  const postal = /^\d{4,6}$/.test(search);
  const settled = remote.data !== undefined && !remote.loading && !locations.busy;
  return <Sheet visible={visible} onClose={close} title={title ?? t("choosePlace")}>
    <SearchField value={query} onChange={setQuery} placeholder={t("placeSearchHint")} />
    {!typing && <ListGroup>
      {origin ? <ListItem title={origin.label} leading={<RowIcon name={origin.icon} />}
        trailing={<View style={s.originTools}>
          {origin.picked && <IconButton label={t("clearLocation")} icon="close" appearance="plain" onPress={() => { setPicked(null); setIssue(""); }} />}
          <IconButton label={t("useMyLocation")} icon="locate" appearance="plain" loading={locating} onPress={() => void locate()} />
        </View>} />
        : <ListItem title={t("useMyLocation")} leading={<RowIcon name="locate" />} label={locating ? t("findingLocation") : t("useMyLocation")} onPress={() => void locate()}
          trailing={locating ? <ActivityIndicator color={theme.accent} /> : undefined} />}
    </ListGroup>}
    {!!issue && <View style={s.issue}><Icon name="alert-circle-outline" size={16} color={theme.error} /><T variant="small" color={theme.error} style={s.issueText}>{issue}</T></View>}
    {(typing || origin) && <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social" />}
    {postal ? <>{locationList}{placeList}</> : <>{placeList}{locationList}</>}
    {typing && settled && !items.length && !addresses.length && <T muted style={s.empty}>{t("noMatchingPlaces")}</T>}
  </Sheet>;
}
/** One place: photo, name, branch and hours, and how far it is when there is a point to measure from. */
function PlaceItem({ place, origin, selected, onPress }: { place: SocialPlace; origin?: SearchPoint; selected: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("social");
  const km = origin && place.point ? distanceKm(origin, place.point) : undefined;
  const distance = km === undefined ? "" : km < 1 ? t("distanceShortM", { m: Math.max(50, Math.round(km * 20) * 50) }) : t("distanceShortKm", { km: km < 10 ? km.toFixed(1) : Math.round(km) });
  const subtitle = [place.branch, place.hours].filter(Boolean).join(" · ") || place.address;
  return <ListItem title={place.name} subtitle={subtitle} leading={<PlaceThumb place={place} size={44} radius={10} />}
    label={[place.name, subtitle, distance].filter(Boolean).join(", ")} onPress={onPress}
    trailing={<View style={s.trailing}>
      {!!distance && <T variant="small" muted style={s.distance}>{distance}</T>}
      {selected ? <Icon name="checkmark-circle" size={20} color={theme.accent} /> : <Icon name="chevron-forward" size={18} color={theme.mutedForeground} />}
    </View>} />;
}
/** A chosen place as one row, with Change. */
export function PlaceRow({ place, onChange, label }: { place: SocialPlace | null; onChange: () => void; label?: string }) {
  const t = useT("social");
  return <ListGroup><ListItem title={place?.name ?? t("choosePlace")} subtitle={place ? [place.branch, place.hours].filter(Boolean).join(" · ") || place.address : undefined}
    leading={<PlaceThumb place={place} size={44} radius={10} />} label={place ? place.name + ", " + (label ?? t("change")) : t("choosePlaceA11y")} onPress={onChange} /></ListGroup>;
}
const s = StyleSheet.create({
  originTools: { flexDirection: "row", alignItems: "center" },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  distance: { fontVariant: ["tabular-nums"] },
  issue: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 4 },
  issueText: { flex: 1 },
  empty: { paddingVertical: 12, textAlign: "center" },
});
