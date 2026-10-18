import { Image, View, type StyleProp, type ViewStyle } from "react-native";
import type { Recipe, RecipeCategory } from "../../types/food";
import { photos } from "../../data/photos";
import { usePreferences } from "../../state/Preferences";
import { Icon, T, type IconName } from "../ui";
import { useEffect, useState } from "react";
import { apiUrl } from "../../utils/api-url";
import { subscribeCataloguePhoto } from "../../services/catalogue-photo-cache";
import { usePhotoVisibility } from "../discovery/PhotoScrollView";

export const categoryIcons: Record<RecipeCategory, IconName> = {
  Breakfast: "cafe-outline", Noodles: "restaurant-outline", "Rice meals": "leaf-outline", "With rice": "flame-outline",
  Soups: "water-outline", "Snacks & kueh": "fast-food-outline", "Desserts & drinks": "ice-cream-outline",
};
/** Illustrative photo when one exists; otherwise an honest category tile rather than a borrowed image. */
export function RecipeImage({ recipe, style, label = false }: { recipe: Pick<Recipe, "name" | "photo" | "categories" | "image">; style: StyleProp<ViewStyle>; label?: boolean }) {
  const { theme } = usePreferences();
  const visibility = usePhotoVisibility(true), [remote, setRemote] = useState<{ asset?: string; uri?: string; failed: boolean }>({ failed: false });
  const asset = recipe.image?.path;
  useEffect(() => { if (asset && visibility.visible) return subscribeCataloguePhoto(apiUrl(asset), state => setRemote({ ...state, asset })); }, [asset, visibility.visible]);
  if (asset && remote.asset === asset && remote.uri && !remote.failed) return <View ref={node => visibility.attach(node)} onLayout={visibility.onLayout} style={[{ overflow: "hidden" }, style]}>
    <Image source={{ uri: remote.uri }} resizeMode="cover" accessibilityLabel={label ? recipe.name : undefined} accessible={label} onError={() => setRemote({ failed: true })} style={{ width: "100%", height: "100%" }} />
  </View>;
  if (recipe.photo) return <View style={[{ overflow: "hidden" }, style]}>
    <Image source={photos[recipe.photo]} resizeMode="cover" accessibilityLabel={label ? recipe.name : undefined} accessible={label} style={{ width: "100%", height: "100%" }} />
  </View>;
  return <View ref={node => visibility.attach(node)} onLayout={visibility.onLayout} accessible={label} accessibilityLabel={label ? recipe.name + ", no photo yet" : undefined}
    style={[{ overflow: "hidden", backgroundColor: theme.accentSoft, borderColor: theme.border, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6 }, style]}>
    <Icon name={categoryIcons[recipe.categories[0] ?? "With rice"]} size={label ? 34 : 26} color={theme.accent} />
    {label && <T variant="small" muted>No photo yet</T>}
  </View>;
}
