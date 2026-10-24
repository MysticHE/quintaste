import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "../food/Controls";
import { Button, Icon, T, common } from "../ui";
import { MarketModal } from "./MarketChrome";
import { useListingSource } from "./ListingPhoto";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";
import type { MarketPhotos, PhotoSlot } from "../../types/market";
const photoKeys: Record<PhotoSlot, MarketKey> = { item: "photoFood", detail: "photoAnother", label: "photoProductLabel", seal: "photoSeal", date: "photoDateMark" };
/** Photo size budgets: Market uploads keep labels legible within the 1 MB server limit; device-stored photos stay small. */
export const photoBudgets = { upload: { edge: 1600, compress: 0.8, chars: 1390000 }, device: { edge: 1024, compress: 0.5, chars: 299950 } } as const;
type Budget = { edge: number; compress: number; chars: number };
/** Scales a picked photo to the budget's longest edge and re-encodes it as JPEG; null when it is still too large. */
export async function preparePhoto(asset: ImagePicker.ImagePickerAsset, budget: Budget) {
  const context = ImageManipulator.manipulate(asset.uri);
  let image;
  try {
    if (Math.max(asset.width, asset.height) > budget.edge) context.resize(asset.width >= asset.height ? { width: budget.edge } : { height: budget.edge });
    image = await context.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: budget.compress, base64: true });
    if (!result.base64 || result.base64.length > budget.chars) return null;
    return "data:image/jpeg;base64," + result.base64;
  } finally { image?.release(); context.release(); }
}
export function ListingPhotos({ value, onChange, error, disabled, onBusy, slots = ["item", "label", "seal", "date"], labels, budget = photoBudgets.device }: {
  value: MarketPhotos; onChange: (next: MarketPhotos) => void; error?: string; disabled: boolean;
  onBusy: (busy: boolean) => void; slots?: PhotoSlot[]; labels?: Partial<Record<PhotoSlot, string>>; budget?: Budget;
}) {
  const t = useT("market"), names = (slot: PhotoSlot) => labels?.[slot] ?? t(photoKeys[slot]);
  const { theme } = usePreferences(), alive = useRef(true), picking = useRef(false), source = useListingSource();
  const [pickerError, setPickerError] = useState(""), [sourceSlot, setSourceSlot] = useState<PhotoSlot>();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const pick = async (slot: PhotoSlot, camera = false) => {
    if (disabled || picking.current) return;
    picking.current = true; onBusy(true); setPickerError(""); setSourceSlot(undefined);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!alive.current) return;
        if (!permission.granted) { setPickerError(t("cameraDenied")); return; }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!alive.current || result.canceled) return;
      const photo = await preparePhoto(result.assets[0], budget);
      if (!alive.current) return;
      if (!photo) { setPickerError(t("photoTooLarge")); return; }
      onChange({ ...value, [slot]: photo });
    } catch { if (alive.current) setPickerError(t("photoFailed")); }
    finally { picking.current = false; if (alive.current) onBusy(false); }
  };
  return <View style={{ gap: 6 }}><View style={s.photos}>{slots.map(slot => {
    const wide = slots.length === 1, quad = slots.length === 4, uri = value[slot];
    return <View key={slot} style={[s.tile, wide && s.wide, quad && s.quad, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t(uri ? "changePhoto" : "addPhoto", { slot: names(slot) })} accessibilityState={{ disabled }} disabled={disabled}
        onPress={() => Platform.OS === "web" ? void pick(slot) : setSourceSlot(slot)} style={({ pressed }) => [s.pick, { opacity: pressed ? 0.8 : 1 }]}>
        {uri ? <Image source={source(uri)} style={StyleSheet.absoluteFill} contentFit={slot === "item" ? "cover" : "contain"} />
          : <><Icon name="camera-outline" size={26} color={theme.accent} /><T variant="small" style={common.center}>{names(slot)}</T></>}
      </Pressable>
      {!!uri && <View style={s.remove}><IconButton appearance="media" label={t("removePhoto", { slot: names(slot) })} icon="close" disabled={disabled}
        onPress={() => onChange({ ...value, [slot]: undefined })} /></View>}
    </View>;
  })}</View>{!!(pickerError || error) && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{pickerError || error}</T>}
    <MarketModal visible={!!sourceSlot} onClose={() => setSourceSlot(undefined)} label={sourceSlot ? names(sourceSlot) : t("photo")}>
      <Button label={t("takePhoto")} icon="camera-outline" onPress={() => sourceSlot && void pick(sourceSlot, true)} />
      <Button label={t("choosePhoto")} icon="images-outline" variant="secondary" onPress={() => sourceSlot && void pick(sourceSlot)} />
    </MarketModal>
  </View>;
}
const s = StyleSheet.create({
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { flexBasis: "30%", flexGrow: 1, aspectRatio: 1, borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  wide: { flexBasis: "100%", aspectRatio: 2 },
  quad: { flexBasis: "45%", aspectRatio: 4 / 3 },
  pick: { flex: 1, alignItems: "center", justifyContent: "center", padding: 8, gap: 6 },
  remove: { position: "absolute", top: 4, right: 4 },
});
