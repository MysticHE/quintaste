import type { SearchPoint } from "../../types/location-search";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import type { LivePlace } from "../../types/discovery";
import { livePlaceMetadata } from "../../utils/live-place-format";
import { googlePlaceUrl } from "../../utils/place-directory";
import { GooglePhotoBackdrop } from "./GooglePhotoBackdrop";
import { usePhotoVisibility } from "./PhotoScrollView";
import { LivePlaceInformation } from "./LivePlaceInformation";
import { PhotoBlend } from "./PhotoBlend";
import { IconButton } from "../food/Controls";
import { useMenus } from "../../state/Menus";
import { menuForPlace } from "../../utils/menu-match";
import { MenuEntry } from "./MenuEntry";
import { photoCardBleed } from "../../theme/layout";

export function LivePlaceCard({ place, now, more, origin }: {
  place: LivePlace; now: number; more?: () => void; origin?: SearchPoint;
}) {
  const { theme, setNotice } = usePreferences(), { isSaved, toggleSave } = useFood();
  const { menus } = useMenus(), menu = menuForPlace(menus, place);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [panelHeight, setPanelHeight] = useState(132), [nameHeight, setNameHeight] = useState(24);
  const fadeHeight = Math.max(24, panelHeight - 8 - nameHeight / 2);
  const savedId = "google-" + place.placeId, saved = isSaved("place", savedId), meta = livePlaceMetadata(place, now, origin);
  const photo = place.photos?.[0], visibility = usePhotoVisibility();
  const open = () => router.push({ pathname: "/place/[id]", params: { id: savedId } } as never);
  const source = async () => {
    try { await Linking.openURL(photo?.sourceUri || googlePlaceUrl(place.placeId, place.name)); }
    catch { setNotice({ text: "Google Maps could not open. Please try again.", error: true }); }
  };
  return <><View testID="discovery-card" ref={node => visibility.attach(node)} onLayout={visibility.onLayout} collapsable={false}
    style={[s.card, { backgroundColor: theme.transparent, borderColor: focused || pressed ? theme.accent : theme.transparent }]}>
    <GooglePhotoBackdrop key={photo ? photo.url + "|" + place.fetchedAt : "missing"} photo={photo}
      expiresAt={place.fetchedAt + 300000} enabled={visibility.visible} panelHeight={panelHeight} nameHeight={nameHeight} panelInset={8} />
    <Pressable accessibilityRole="button" accessibilityLabel={[place.name, place.address || "Address unavailable", meta.distanceLabel,
      meta.rating, meta.hours].filter(Boolean).join(". ")} accessibilityHint="Opens this branch's details"
      onPress={open} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={StyleSheet.absoluteFill} />
    <View pointerEvents="box-none">
      <View style={s.photoSpace} pointerEvents="none" />
      <View style={[s.blend, { height: fadeHeight }]} pointerEvents="none" testID="photo-blend">
        <PhotoBlend fadeAt={24 / fadeHeight}>
          <LinearGradient colors={theme.photoBlend} locations={[0, 24 / fadeHeight, 1]} style={StyleSheet.absoluteFill} />
        </PhotoBlend>
      </View>
      <LivePlaceInformation place={place} meta={meta} measurePanel={setPanelHeight} measureName={setNameHeight} onSource={() => void source()} />
    </View>
    {menu && <View style={s.menu}><MenuEntry menu={menu} compact /></View>}
    <View style={s.actions} pointerEvents="box-none">
      {more && <IconButton label={"More options for " + place.name} icon="ellipsis-horizontal" appearance="media" onPress={more} />}
      <IconButton label={(saved ? "Remove saved " : "Save ") + place.name} icon={saved ? "bookmark" : "bookmark-outline"}
        selected={saved} appearance="media" onPress={() => { void toggleSave("place", savedId); }} />
    </View>
  </View></>;
}
const s = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", borderWidth: 2, ...photoCardBleed },
  photoSpace: { height: 116 }, blend: { position: "absolute", bottom: 0, left: 0, right: 0 },
  menu: { position: "absolute", top: 4, left: 4 },
  actions: { position: "absolute", top: 4, right: 4, flexDirection: "row", gap: 6 },
});
