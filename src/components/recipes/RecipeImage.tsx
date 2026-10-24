import { Image, View, type StyleProp, type ViewStyle } from "react-native";
import type { Recipe } from "../../types/food";
import { photos } from "../../data/photos";
import { usePreferences } from "../../state/Preferences";
import { T, common } from "../ui";
import { useEffect, useState } from "react";
import { apiUrl } from "../../utils/api-url";
import { subscribeCataloguePhoto } from "../../services/catalogue-photo-cache";
import { usePhotoVisibility } from "../discovery/PhotoScrollView";
import { useLanguage, useT } from "../../i18n";
import { categoryName } from "../../utils/recipe-browse";

/** Illustrative photo when one exists; otherwise an honest category tile rather than a borrowed image. */
export function RecipeImage({ recipe, style, label = false, large = label }: { recipe: Pick<Recipe, "name" | "photo" | "categories" | "image">; style: StyleProp<ViewStyle>; label?: boolean; large?: boolean }) {
  const { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  const visibility = usePhotoVisibility(true), [remote, setRemote] = useState<{ asset?: string; uri?: string; failed: boolean }>({ failed: false });
  const asset = recipe.image?.path;
  useEffect(() => { if (asset && visibility.visible) return subscribeCataloguePhoto(apiUrl(asset), state => setRemote({ ...state, asset })); }, [asset, visibility.visible]);
  if (asset && remote.asset === asset && remote.uri && !remote.failed) return <View ref={node => visibility.attach(node)} onLayout={visibility.onLayout} style={[{ overflow: "hidden" }, style]}>
    <Image source={{ uri: remote.uri }} resizeMode="cover" accessibilityLabel={label ? recipe.name : undefined} accessible={label} onError={() => setRemote({ failed: true })} style={{ width: "100%", height: "100%" }} />
  </View>;
  if (recipe.photo) return <View style={[{ overflow: "hidden" }, style]}>
    <Image source={photos[recipe.photo]} resizeMode="cover" accessibilityLabel={label ? recipe.name : undefined} accessible={label} style={{ width: "100%", height: "100%" }} />
  </View>;
  // No photo: a typographic tile naming the kind of dish, so it reads as deliberate rather than a broken image.
  const category = recipe.categories[0] ? categoryName(recipe.categories[0], language) : t("recipeFallback");
  return <View ref={node => visibility.attach(node)} onLayout={visibility.onLayout} accessible={label} accessibilityLabel={label ? t("noPhotoYetName", { name: recipe.name }) : undefined}
    style={[{ overflow: "hidden", backgroundColor: theme.accentSoft, alignItems: "center", justifyContent: "center", padding: 8 }, style]}>
    <T variant={large ? "title" : "small"} color={theme.accent} numberOfLines={2} style={[common.bold, common.center]}>{category}</T>
  </View>;
}
