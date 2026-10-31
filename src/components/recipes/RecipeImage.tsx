import { Image as CachedImage, type ImageSource } from "expo-image";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Recipe } from "../../types/food";
import { photos } from "../../data/photos";
import { usePreferences } from "../../state/Preferences";
import { T, common } from "../ui";
import { useState } from "react";
import { apiUrl } from "../../utils/api-url";
import { usePhotoVisibility } from "../discovery/PhotoScrollView";
import { useLanguage, useT } from "../../i18n";
import { categoryName } from "../../utils/recipe-browse";

/**
 * Illustrative photo when one exists; otherwise an honest category tile rather than a borrowed image. A staff photo fades in over
 * the bundled photo or tile, which stays underneath while it loads, while it is off screen and if it fails. `load` false holds the
 * staff photo back (a horizontal row passes it for cards still off screen to the side).
 */
export function RecipeImage({ recipe, style, label = false, large = label, load = true }: { recipe: Pick<Recipe, "name" | "photo" | "categories" | "image">; style: StyleProp<ViewStyle>;
  label?: boolean; large?: boolean; load?: boolean }) {
  const { theme, reducedMotion } = usePreferences(), t = useT("cook"), language = useLanguage();
  const visibility = usePhotoVisibility(true), [failed, setFailed] = useState<string | null>(null);
  const asset = recipe.image?.path;
  let url: string | undefined;
  try { if (asset && failed !== asset) url = apiUrl(asset); } catch { /* Missing API configuration uses the bundled photo or tile. */ }
  // When the staff photo speaks for the image, what sits underneath is hidden from screen readers.
  const under = url ? { accessible: false, importantForAccessibility: "no-hide-descendants" as const, accessibilityElementsHidden: true } : {};
  const category = recipe.categories[0] ? categoryName(recipe.categories[0], language) : t("recipeFallback");
  const base = recipe.photo
    // expo-image decodes the bundled photo at the size it is drawn; React Native's Image on Android could show it blurred in small tiles.
    ? <CachedImage source={photos[recipe.photo] as ImageSource} contentFit="cover" transition={0} accessibilityLabel={label && !url ? recipe.name : undefined} accessible={label && !url} style={StyleSheet.absoluteFill} />
    // No photo: a typographic tile naming the kind of dish, so it reads as deliberate rather than a broken image.
    : <View {...under} style={[StyleSheet.absoluteFill, { backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center", padding: 8 }]}>
      <T variant={large ? "title" : "small"} color={theme.accent} numberOfLines={2} style={[common.bold, common.center]}>{category}</T></View>;
  return <View ref={node => visibility.attach(node)} onLayout={visibility.onLayout} accessible={label && !url && !recipe.photo}
    accessibilityLabel={label && !url && !recipe.photo ? t("noPhotoYetName", { name: recipe.name }) : undefined} style={[{ overflow: "hidden" }, style]}>
    {base}
    {/* Staff photos never change at a path, so expo-image keeps them on disk. */}
    {url && load && visibility.visible && <CachedImage source={{ uri: url }} cachePolicy="memory-disk" recyclingKey={asset} contentFit="cover" transition={reducedMotion ? 0 : 150}
      accessibilityLabel={label ? recipe.name : undefined} accessible={label} onError={() => setFailed(asset!)} style={StyleSheet.absoluteFill} />}
  </View>;
}
