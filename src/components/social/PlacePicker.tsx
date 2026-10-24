import { useState } from "react";
import { View } from "react-native";
import { T } from "../ui";
import { SearchField } from "../food/Controls";
import { ListGroup, ListItem } from "../GroupedList";
import { RemoteStatus } from "../CommunityGate";
import { useDebounced } from "../../hooks/useDebounced";
import { useRemote } from "../../hooks/useRemote";
import { places, placesKey } from "../../services/social-api";
import type { SocialPlace } from "../../types/community";
import { useT } from "../../i18n";
import { PlaceThumb } from "./Face";
import { Sheet } from "./Sheet";

/** Search Explore's places by name, branch, address or postal code and choose one. */
export function PlacePicker({ visible, onClose, onPick, title }: { visible: boolean; onClose: () => void; onPick: (place: SocialPlace) => void; title?: string }) {
  const t = useT("social"), [query, setQuery] = useState(""), search = useDebounced(query), ready = search.trim().length >= 2;
  const remote = useRemote(visible && ready ? placesKey(search) : null, signal => places(placesKey(search), signal));
  return <Sheet visible={visible} onClose={onClose} title={title ?? t("choosePlace")}>
    <SearchField value={query} onChange={setQuery} placeholder={t("placeSearchHint")} />
    {ready && <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social" />}
    {ready && remote.data && (remote.data.items.length ? <ListGroup>{remote.data.items.map(place =>
      <ListItem key={place.id} title={place.name} subtitle={[place.branch, place.hours].filter(Boolean).join(" · ") || place.address}
        leading={<PlaceThumb place={place} size={40} radius={10} />} onPress={() => { onPick(place); setQuery(""); onClose(); }} />)}</ListGroup>
      : <View style={{ paddingVertical: 12 }}><T muted>{t("noMatchingPlaces")}</T></View>)}
  </Sheet>;
}
/** A chosen place as one row, with Change. */
export function PlaceRow({ place, onChange, label }: { place: SocialPlace | null; onChange: () => void; label?: string }) {
  const t = useT("social");
  return <ListGroup><ListItem title={place?.name ?? t("choosePlace")} subtitle={place ? [place.branch, place.hours].filter(Boolean).join(" · ") || place.address : undefined}
    leading={<PlaceThumb place={place} size={44} radius={10} />} label={place ? place.name + ", " + (label ?? t("change")) : t("choosePlaceA11y")} onPress={onChange} /></ListGroup>;
}
