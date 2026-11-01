import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { ListGroup, ListItem, RowIcon, SwitchRow } from "../GroupedList";
import { preparePhoto, photoBudgets } from "../market/ListingPhotos";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { addPhoto, orderPhotos, removePhoto } from "../../services/social-api";
import type { SocialPhoto, Standing } from "../../types/community";
import { useSocialError } from "./SocialState";
import { useSocialSource } from "./SocialPhoto";
import { Sheet } from "../Sheet";

type Saved = { photos: SocialPhoto[]; standing: Standing };
const SLOTS = 6;
/** A photo: tap to edit it (profile photo, replace, move, delete). The pencil badge only shows that it can be edited. */
function Tile({ photo, index, onPress }: { photo: SocialPhoto; index: number; onPress: () => void }) {
  const { theme } = usePreferences(), t = useT("social"), source = useSocialSource(photo.thumb);
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t("editPhoto", { n: index + 1 }) + (index === 0 ? ", " + t("mainPhoto") : "")}
    style={({ pressed }) => [s.tile, { backgroundColor: theme.muted, opacity: pressed ? 0.8 : 1 }]}>
    {source && <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />}
    {index === 0 && <View style={[s.tag, { backgroundColor: theme.overlay }]}><T variant="caption" color={theme.mediaForeground} style={common.bold}>{t("mainPhoto")}</T></View>}
    <View style={[s.badge, { backgroundColor: theme.overlay }]} pointerEvents="none"><Icon name="pencil" size={14} color={theme.mediaForeground} /></View>
  </Pressable>;
}
/** An empty slot with the + in its centre. */
function EmptySlot({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  const { theme } = usePreferences(), t = useT("social");
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={t("addPhoto")}
    style={({ pressed }) => [s.tile, s.empty, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
    <View style={[s.plus, { backgroundColor: theme.accentSoft }]}><Icon name="add" size={26} color={theme.accent} /></View>
  </Pressable>;
}
/**
 * Six photo slots; the first photo is the profile photo, which must be a real selfie of the member because staff check it.
 * Members choose the profile photo while adding photos (the switch in the add sheet) or later from a photo's sheet, and can
 * replace, move or delete any photo. Photos upload one at a time (the edge caps each request) and the grid follows the server.
 */
export function PhotoGrid({ photos, verified, onSaved }: { photos: SocialPhoto[]; verified: boolean; onSaved: (saved: Saved) => void }) {
  const { theme } = usePreferences(), t = useT("social"), problem = useSocialError();
  const [adding, setAdding] = useState(false), [replacing, setReplacing] = useState<number | null>(null), [asProfile, setAsProfile] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null), [progress, setProgress] = useState(""), [error, setError] = useState("");
  const busy = useRef(false);
  const run = async (work: () => Promise<Saved | null>) => {
    if (busy.current) return;
    busy.current = true; setError("");
    try { const saved = await work(); if (saved) onSaved(saved); }
    catch (failure) { setError(problem(failure)); }
    finally { busy.current = false; setProgress(""); }
  };
  const choose = async (camera: boolean, limit: number) => {
    if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { setError(t("cameraDenied")); return []; }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: !camera && limit > 1, selectionLimit: limit };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    return result.canceled ? [] : result.assets.slice(0, limit);
  };
  const prepare = async (asset: ImagePicker.ImagePickerAsset) => {
    const image = await preparePhoto(asset, photoBudgets.upload);
    if (!image) setError(t("photoTooLarge"));
    return image;
  };
  const placed = (ids: string[], id: string, at: number) => { const next = ids.filter(other => other !== id); next.splice(at, 0, id); return next; };
  /** Adds the chosen photos; with "Use as my profile photo" on, the first one added becomes the profile photo. */
  const add = async (camera: boolean) => {
    const assets = await choose(camera, SLOTS - photos.length), before = new Set(photos.map(p => p.id));
    let saved: Saved | null = null;
    for (const [i, asset] of assets.entries()) {
      setProgress(t("photoUploading", { n: i + 1, total: assets.length }));
      const image = await prepare(asset);
      if (image) { saved = await addPhoto(image); onSaved(saved); }
    }
    const first = saved?.photos.find(p => !before.has(p.id)), front = asProfile;
    setAsProfile(false);
    return saved && first && front && saved.photos[0].id !== first.id ? orderPhotos(placed(saved.photos.map(p => p.id), first.id, 0)) : null;
  };
  /** Puts a new photo in the place of photo `at` in one server step; the old one stays if the upload fails. */
  const replace = async (camera: boolean, at: number) => {
    const old = photos[at], [asset] = await choose(camera, 1), image = asset ? await prepare(asset) : null;
    if (!old || !image) return null;
    setProgress(t("photoUploading", { n: 1, total: 1 }));
    return addPhoto(image, old.id);
  };
  const pick = (camera: boolean) => {
    const at = replacing;
    setAdding(false); setReplacing(null);
    void run(() => at === null ? add(camera) : replace(camera, at));
  };
  const ids = photos.map(p => p.id), move = (from: number, to: number) => placed(ids, ids[from], to);
  const act = (work: () => Promise<Saved>) => { setChosen(null); void run(work); };
  const at = chosen ?? 0, changesMain = (to: number) => verified && (at === 0 || to === 0);
  const closeAdd = () => { setAdding(false); setReplacing(null); setAsProfile(false); };
  return <View style={{ gap: 10 }}>
    <View style={s.grid}>
      {photos.map((photo, index) => <Tile key={photo.id} photo={photo} index={index} onPress={() => setChosen(index)} />)}
      {Array.from({ length: SLOTS - photos.length }, (_, i) => <EmptySlot key={"empty" + i} disabled={!!progress} onPress={() => setAdding(true)} />)}
    </View>
    {!!progress && <T variant="small" muted accessibilityLiveRegion="polite">{progress}</T>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Sheet visible={adding} onClose={closeAdd} title={replacing === null ? t("addPhotos") : t("replacePhoto")}>
      <ListGroup>
        {Platform.OS !== "web" && <ListItem title={t("takePhoto")} leading={<RowIcon name="camera-outline" />} onPress={() => pick(true)} />}
        <ListItem title={replacing === null ? t("choosePhotos") : t("choosePhoto")} leading={<RowIcon name="images-outline" />} onPress={() => pick(false)} />
      </ListGroup>
      {replacing === null && photos.length > 0 && <ListGroup><SwitchRow label={t("useAsProfile")} value={asProfile} onChange={setAsProfile} /></ListGroup>}
      {replacing === null && asProfile && verified && <T variant="small" color={theme.warning}>{t("mainChangeText")}</T>}
      <T variant="small" muted>{t("mainPhotoNote")}</T>
    </Sheet>
    <Sheet visible={chosen !== null} onClose={() => setChosen(null)} title={t("photoActions", { n: at + 1 })}>
      <ListGroup>
        {at > 0 && <ListItem title={t("makeMain")} leading={<RowIcon name="star-outline" />} subtitle={verified ? t("mainChangeText") : undefined} wrap onPress={() => act(() => orderPhotos(move(at, 0)))} />}
        <ListItem title={t("replacePhoto")} leading={<RowIcon name="swap-horizontal-outline" />} subtitle={at === 0 && verified ? t("mainChangeText") : undefined} wrap
          onPress={() => { setChosen(null); setReplacing(at); setAdding(true); }} />
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
  empty: { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  tag: { position: "absolute", top: 6, left: 6, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badge: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});
