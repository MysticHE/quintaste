import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, T, common } from "../../components/ui";
import { Sheet } from "../../components/Sheet";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { ItemChips } from "../../components/recipes/ItemChips";
import { PhotoNotice, PickTiles, SQUARE, usePickPhoto, useSnapChoices, useSnapFailure } from "../../components/recipes/SnapParts";
import { useBasics } from "../../hooks/useBasics";
import { usePreferences } from "../../state/Preferences";
import { seeIngredients } from "../../services/ai-recipes";
import { MAX_BASICS, MAX_ITEMS, MAX_PHOTOS, addItems, encodeItems, itemName, type FoodItem } from "../../utils/my-ingredients";
import { useLanguage, useT } from "../../i18n";

type Photo = { id: number; uri: string; reading: boolean };

/**
 * My ingredients (docs/AI_FOOD_LIBRARY_PLAN.md §7, screen 3): up to three photos, the foods found as chips (a doubtful one dashed),
 * a field to type more, one muted line of the member's basics with Edit, and Find recipes.
 */
export function MyIngredientsScreen() {
  const member = useMember(), { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  const alive = useRef(true), pickPhoto = usePickPhoto();
  const { consent, agree, revoke } = useSnapChoices(member.userId), failed = useSnapFailure(revoke);
  const { basics, setBasics } = useBasics(member.userId), [editing, setEditing] = useState(false), nextId = useRef(0);
  const [photos, setPhotos] = useState<Photo[]>([]), [items, setItems] = useState<FoodItem[]>([]);
  useEffect(() => () => { alive.current = false; }, []);
  const needsSignIn = member.enabled && !member.pending && !member.member;
  useEffect(() => { if (needsSignIn) ensureMember(member, "/cook/ingredients"); }, [needsSignIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const reading = photos.some(p => p.reading);
  const pick = async (camera: boolean) => {
    if (!ensureMember(member, "/cook/ingredients") || reading || photos.length >= MAX_PHOTOS) return;
    const uri = await pickPhoto(camera);
    if (!uri || !alive.current) return;
    const id = ++nextId.current;
    setPhotos(list => [...list, { id, uri, reading: true }]);
    try {
      const seen = await seeIngredients(uri);
      if (!alive.current) return;
      setItems(list => addItems(list, seen.items.map(i => ({ en: i.name.en, zh: i.name.zh, sure: i.sure })), MAX_ITEMS));
      setPhotos(list => list.map(p => p.id === id ? { ...p, reading: false } : p));
    } catch (error) {
      if (!alive.current) return;
      // A photo that found nothing is not kept: the member tries another.
      setPhotos(list => list.filter(p => p.id !== id));
      failed(error, t("snapFailed"));
    }
  };
  const find = () => router.push({ pathname: "/cook/can-cook", params: { items: encodeItems(items) } } as never);
  const basicsLine = basics.length ? t("itemsPlus", { list: basics.map(b => itemName(b, language)).join(language === "zh" ? "、" : ", ") }) : t("itemsNoBasics");

  return <CookLayout title={t("itemsTitle")} backTo="/cook/ai">
    {consent === false && <PhotoNotice onAgree={agree} />}
    {consent && <View style={s.stack}>
      {photos.length ? <View style={s.photos}>
        {photos.map(photo => <View key={photo.id} style={[s.thumb, { backgroundColor: theme.muted }]}>
          <Image source={{ uri: photo.uri }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} accessibilityIgnoresInvertColors />
          {photo.reading && <View style={[StyleSheet.absoluteFill, s.reading, { backgroundColor: theme.overlay }]}>
            <ActivityIndicator color={theme.actionForeground} accessibilityLabel={t("itemsReading")} /></View>}
        </View>)}
        {photos.length < MAX_PHOTOS && <PickTiles compact disabled={reading} onPick={camera => void pick(camera)} />}
      </View> : <PickTiles onPick={camera => void pick(camera)} />}
      <ItemChips items={items} onChange={setItems} placeholder={t("itemsAdd")} full={items.length >= MAX_ITEMS} />
      <Pressable accessibilityRole="button" accessibilityLabel={basicsLine + ". " + t("itemsEdit")} onPress={() => setEditing(true)} hitSlop={{ top: 12, bottom: 12 }}>
        <T variant="small" muted>{basicsLine + " · "}<T variant="small" color={theme.accent} style={common.bold}>{t("itemsEdit")}</T></T>
      </Pressable>
      <Button label={t("findRecipes")} icon="search" disabled={!items.length || reading} onPress={find} />
    </View>}
    <Sheet visible={editing} onClose={() => setEditing(false)} title={t("basicsTitle")}>
      <ItemChips items={basics} onChange={setBasics} placeholder={t("basicsAdd")} full={basics.length >= MAX_BASICS} />
    </Sheet>
  </CookLayout>;
}
const s = StyleSheet.create({
  stack: { gap: 16 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  thumb: { width: SQUARE, height: SQUARE, borderRadius: 16, overflow: "hidden" },
  reading: { alignItems: "center", justifyContent: "center" },
});
