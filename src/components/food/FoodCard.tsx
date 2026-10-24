import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { dishById } from "../../data/dishes";
import { recipeById } from "../../data/recipes";
import { usePublishedRecipe } from "../../hooks/useEditorial";
import { RecipeImage } from "../recipes/RecipeImage";
import { recipeLabels } from "../../utils/recipe-dietary";
import { venueById } from "../../data/venues";
import { areaById } from "../../data/areas";
import { photos } from "../../data/photos";
import type { SavedKind } from "../../types/food";
import { openingLabel, openingState } from "../../utils/opening-hours";
import { money } from "../../utils/food-format";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Card, Icon, T, common } from "../ui";
import { EvidenceLine } from "./Evidence";
import { DietLabels } from "./DietLabels";
import { EmptyState } from "./Controls";
import { useLanguage, useT } from "../../i18n";

export function FoodCard({ kind, id, onOpen, onMore, now = 0 }: { kind: SavedKind; id: string; onOpen: () => void; onMore?: () => void; now?: number }) {
  const { theme } = usePreferences(), t = useT("explore"), language = useLanguage();
  const { isSaved, toggleSave, readable } = useFood();
  const [busy, setBusy] = useState(false);
  const remote = usePublishedRecipe(kind === "recipe" ? id : null);
  const item = kind === "place" ? venueById(id) : kind === "dish" ? dishById(id) : recipeById(id);
  const saved = isSaved(kind, id);
  if (!item && remote.loading) return <T muted>{t("loadingSavedRecipe")}</T>;
  if (!item) return <EmptyState title={t("itemUnavailable")} text={t("itemUnavailableText")}
    action={t("removeFromSaved")} onPress={() => void toggleSave(kind, id)} icon="archive-outline" />;
  const venue = kind === "dish" ? venueById(dishById(id)!.venueId) : kind === "place" ? venueById(id) : undefined;
  const recipe = kind === "recipe" ? recipeById(id) : undefined;
  const metadata = recipe ? t("recipeMeta", { minutes: recipe.minutes, servings: recipe.servings })
    : [areaById(venue?.areaId ?? "")?.name, kind === "dish" ? money(dishById(id)!.price, language) : venue?.cuisine].filter(Boolean).join(" · ");
  const save = async () => { setBusy(true); try { await toggleSave(kind, id); } finally { setBusy(false); } };
  return <Card style={s.card}>
    <Pressable accessibilityRole="button" accessibilityHint={t("openDetails")} onPress={onOpen}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      {recipe ? <RecipeImage recipe={recipe} style={s.image} /> : <View style={s.image}><Image source={photos[item.photo!]} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" accessible={false} /></View>}
      <View style={s.content}><T variant="subtitle">{item.name}</T><T variant="small" muted>{metadata}</T>{kind === "place" && venue && <T variant="small" color={openingState(venue, now) === "open" ? theme.success : theme.mutedForeground}>{openingLabel(venue, now, language)}</T>}</View>
    </Pressable>
    <View style={s.bottom}>
      <View style={common.flex}>{recipe ? <DietLabels labels={recipeLabels(recipe)} interactive={false} /> : <EvidenceLine dietary={item.dietary} />}</View>
      <Pressable accessibilityRole="button" accessibilityLabel={t(saved ? "unsaveName" : "saveName", { name: item.name })}
        accessibilityState={{ selected: saved, disabled: busy || !readable, busy }}
        disabled={busy || !readable} onPress={() => void save()} style={s.save}>
        <Icon name={saved ? "bookmark" : "bookmark-outline"} color={saved ? theme.accent : theme.foreground} />
      </Pressable>
      {onMore && <Pressable accessibilityRole="button" accessibilityLabel={t("moreActionsFor", { name: item.name })} onPress={onMore} style={s.save}><Icon name="ellipsis-horizontal" /></Pressable>}
    </View>
  </Card>;
}
const s = StyleSheet.create({
  card: { padding: 0, overflow: "hidden", borderRadius: 22 },
  image: { width: "100%", aspectRatio: 1.95 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 3 },
  bottom: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16, paddingRight: 6, paddingBottom: 10, paddingTop: 6 },
  save: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
});
