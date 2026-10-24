import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { preparePhoto, photoBudgets } from "../market/ListingPhotos";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { addPhoto, orderPhotos, removePhoto } from "../../services/social-api";
import type { SocialPhoto, Standing } from "../../types/community";
import { useSocialError } from "./SocialState";
import { useSocialSource } from "./SocialPhoto";
import { Sheet } from "./Sheet";

type Saved = { photos: SocialPhoto[]; standing: Standing };
function Tile({ photo, index, onPress }: { photo: SocialPhoto; index: number; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("social"), source = useSocialSource(photo.thumb);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t("photoActions", { n: index + 1 }) + (index === 0 ? ", " + t("mainPhoto") : "")}
    style={({ pressed }) => [s.tile, { backgroundColor: theme.muted, opacity: pressed ? 0.8 : 1 }]}>
    {source && <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}
    {index === 0 && <View style={[s.tag, { backgroundColor: theme.overlay }]}><T variant="caption" color={theme.mediaForeground} style={common.bold}>{t("mainPhoto")}</T></View>}
  </Pressable>;
}
/**
 * Up to six photos in order; the first is the main photo staff compare with the selfie. Tap a photo to make it the main
 * one, move it or remove it. Photos upload one at a time (the edge caps each request) and the grid follows the server.
 */
export function PhotoGrid({ photos, verified, onSaved }: { photos: SocialPhoto[]; verified: boolean; onSaved: (saved: Saved) => void }) {
  const { theme } = usePreferences(), t = useT("social"), problem = useSocialError();
  const [adding, setAdding] = useState(false), [chosen, setChosen] = useState<number | null>(null), [progress, setProgress] = useState(""), [error, setError] = useState("");
  const busy = useRef(false);
  const run = async (work: () => Promise<Saved | null>) => {
    if (busy.current) return;
    busy.current = true; setError("");
    try { const saved = await work(); if (saved) onSaved(saved); }
    catch (failure) { setError(problem(failure)); }
    finally { busy.current = false; setProgress(""); }
  };
  const pick = (camera: boolean) => run(async () => {
    setAdding(false);
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { setError(t("cameraDenied")); return null; }
    const room = 6 - photos.length, options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: !camera && room > 1, selectionLimit: room };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return null;
    for (const [i, asset] of result.assets.slice(0, room).entries()) {
      setProgress(t("photoUploading", { n: i + 1, total: Math.min(room, result.assets.length) }));
      const image = await preparePhoto(asset, photoBudgets.upload);
      if (!image) { setError(t("photoTooLarge")); continue; }
      onSaved(await addPhoto(image));
    }
    return null;
  });
  const ids = photos.map(p => p.id), move = (from: number, to: number) => { const next = [...ids]; next.splice(to, 0, ...next.splice(from, 1)); return next; };
  const act = (work: () => Promise<Saved>) => { setChosen(null); void run(work); };
  const at = chosen ?? 0, changesMain = (to: number) => verified && (at === 0 || to === 0);
  return <View style={{ gap: 10 }}>
    <View style={s.grid}>
      {photos.map((photo, index) => <Tile key={photo.id} photo={photo} index={index} onPress={() => setChosen(index)} />)}
      {photos.length < 6 && <Pressable onPress={() => setAdding(true)} disabled={!!progress} accessibilityRole="button" accessibilityLabel={t("addPhoto")}
        style={({ pressed }) => [s.tile, s.add, { borderColor: theme.accent, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
        <Icon name="add" size={30} color={theme.accent} /></Pressable>}
    </View>
    {!!progress && <T variant="small" muted accessibilityLiveRegion="polite">{progress}</T>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Sheet visible={adding} onClose={() => setAdding(false)} title={t("addPhotos")}>
      <ListGroup>
        {Platform.OS !== "web" && <ListItem title={t("takePhoto")} leading={<RowIcon name="camera-outline" />} onPress={() => void pick(true)} />}
        <ListItem title={t("choosePhotos")} leading={<RowIcon name="images-outline" />} onPress={() => void pick(false)} />
      </ListGroup>
      <T variant="small" muted>{t("mainPhotoNote")}</T>
    </Sheet>
    <Sheet visible={chosen !== null} onClose={() => setChosen(null)} title={t("photoActions", { n: at + 1 })}>
      <ListGroup>
        {at > 0 && <ListItem title={t("makeMain")} leading={<RowIcon name="star-outline" />} subtitle={verified ? t("mainChangeText") : undefined} wrap onPress={() => act(() => orderPhotos(move(at, 0)))} />}
        {at > 1 && <ListItem title={t("moveEarlier")} leading={<RowIcon name="arrow-back" tone="muted" />} onPress={() => act(() => orderPhotos(move(at, at - 1)))} />}
        {at < photos.length - 1 && <ListItem title={t("moveLater")} leading={<RowIcon name="arrow-forward" tone="muted" />}
          subtitle={changesMain(at + 1) ? t("mainChangeText") : undefined} wrap onPress={() => act(() => orderPhotos(move(at, at + 1)))} />}
        <ListItem title={t("removePhoto")} leading={<RowIcon name="trash-outline" tone="warning" />} subtitle={at === 0 && verified && photos.length > 1 ? t("mainChangeText") : undefined}
          wrap onPress={() => act(() => removePhoto(photos[at].id))} />
      </ListGroup>
      <Button label={t("cancel")} variant="link" onPress={() => setChosen(null)} />
    </Sheet>
  </View>;
}
const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31.5%", aspectRatio: 3 / 4, borderRadius: 14, overflow: "hidden" },
  add: { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  tag: { position: "absolute", top: 6, left: 6, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
});
