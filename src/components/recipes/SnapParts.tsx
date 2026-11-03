import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Button, Icon, T, common, type IconName } from "../ui";
import { SegmentedTabs } from "../SegmentedTabs";
import { photoBudgets, preparePhoto } from "../market/ListingPhotos";
import { useDietText } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { ApiError } from "../../services/community-api";
import { SNAP_CONSENT, type SnapDiet } from "../../services/ai-recipes";
import { useT } from "../../i18n";

/** Shared by Snap a dish and My ingredients (docs/AI_FOOD_LIBRARY_PLAN.md §6, §7): the photo notice, the diet, picking a photo. */
const consentKey = (userId: string) => "@quintaste/snap-consent/" + userId;
const dietKey = "@quintaste/snap-diet";
const diets: readonly SnapDiet[] = ["vegan", "vegetarian", "both"];

/** Whether this account accepted the photo notice (null while reading), the diet last chosen, and how to change both. */
export function useSnapChoices(userId: string | null | undefined) {
  const alive = useRef(true), [consent, setConsent] = useState<boolean | null>(null), [diet, setDiet] = useState<SnapDiet>("both");
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    if (!userId) return;
    void AsyncStorage.multiGet([consentKey(userId), dietKey]).then(([[, agreed], [, saved]]) => {
      if (!alive.current) return;
      setConsent(agreed === SNAP_CONSENT);
      if (diets.includes(saved as SnapDiet)) setDiet(saved as SnapDiet);
    }).catch(() => { if (alive.current) setConsent(false); });
  }, [userId]);
  const agree = () => {
    setConsent(true);
    if (userId) void AsyncStorage.setItem(consentKey(userId), SNAP_CONSENT).catch(() => {});
  };
  const chooseDiet = (value: SnapDiet) => { setDiet(value); void AsyncStorage.setItem(dietKey, value).catch(() => {}); };
  return { consent, agree, revoke: () => setConsent(false), diet, chooseDiet };
}

/** A failed photo or job call: no plan opens the plans, a stale notice asks again, anything else is a short notice. */
export function useSnapFailure(revoke: () => void) {
  const { setNotice } = usePreferences();
  return (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.code === "PLAN_REQUIRED") { router.push("/cook/ai-plans" as never); return; }
    if (error instanceof ApiError && error.code === "SNAP_CONSENT") revoke();
    setNotice({ text: error instanceof ApiError ? error.message : fallback, error: true });
  };
}

/** One photo from the camera or the library, made small enough to send; null when cancelled or refused (the reason is shown). */
export function usePickPhoto() {
  const { setNotice } = usePreferences(), t = useT("cook");
  return async (camera: boolean): Promise<string | null> => {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { setNotice({ text: t("snapCameraDenied"), error: true }); return null; }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    const photo = await preparePhoto(asset, photoBudgets.upload);
    if (!photo) setNotice({ text: t("snapPhotoLarge"), error: true });
    return photo;
  };
}

/** The one-line notice before the first photo, with Continue. */
export function PhotoNotice({ onAgree }: { onAgree: () => void }) {
  const { theme } = usePreferences(), t = useT("cook");
  return <View style={s.stack}>
    <View style={[common.row, s.notice]}><Icon name="shield-checkmark-outline" size={18} color={theme.mutedForeground} />
      <T variant="small" muted style={common.flex}>{t("snapNotice")}</T></View>
    <Button label={t("snapAgree")} onPress={onAgree} />
  </View>;
}

/** Vegan, Vegetarian or both. */
export function DietChoice({ value, onChange }: { value: SnapDiet; onChange: (value: SnapDiet) => void }) {
  const t = useT("cook"), dietText = useDietText();
  const options = [{ id: "vegan" as const, label: dietText.name("Vegan") }, { id: "vegetarian" as const, label: dietText.name("Vegetarian") }, { id: "both" as const, label: t("snapBoth") }];
  return <SegmentedTabs label={t("snapDiet")} options={options} value={value} onChange={onChange} />;
}

/** Take Photo and Choose Photo as two tiles; `compact` makes them small squares beside photos already added. */
export function PickTiles({ onPick, compact = false, disabled = false }: { onPick: (camera: boolean) => void; compact?: boolean; disabled?: boolean }) {
  const t = useT("cook");
  return <View style={s.pickers}>
    <PickTile icon="camera-outline" label={t("takePhoto")} compact={compact} disabled={disabled} onPress={() => onPick(true)} />
    <PickTile icon="images-outline" label={t("choosePhoto")} compact={compact} disabled={disabled} onPress={() => onPick(false)} />
  </View>;
}
function PickTile({ icon, label, compact, disabled, onPress }: { icon: IconName; label: string; compact: boolean; disabled: boolean; onPress: () => void }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [compact ? s.square : s.tile, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card, opacity: disabled ? 0.5 : 1 }]}>
    <Icon name={icon} size={compact ? 24 : 28} color={theme.accent} />{!compact && <T style={common.bold}>{label}</T>}
  </Pressable>;
}
export const SQUARE = 72;
const s = StyleSheet.create({
  stack: { gap: 12 },
  notice: { gap: 8, alignItems: "flex-start" },
  pickers: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, minHeight: 132, gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 20 },
  square: { width: SQUARE, height: SQUARE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 16 },
});
