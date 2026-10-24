import { useState } from "react";
import { Pressable, View } from "react-native";
import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { exclusionList, recipeFit } from "../../utils/recipe-dietary";
import { IconButton } from "../food/Controls";
import { DietLabels } from "../food/DietLabels";
import { Button, Icon, T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { Action, ReactionBar, cookedBy } from "../ReactionBar";
import { useReaction, useReactions } from "../../hooks/useReactions";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { recipeShareMessage } from "../../utils/recipe-share";
import { sponsorshipName } from "../../utils/private-recipes";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ReportSheet } from "../ReportSheet";
import { ensureMember, useMember } from "../CommunityGate";
import { nextTier, useKitchen } from "../../hooks/useKitchen";
import { MakeLevelAction } from "./MakeLevel";
import { useLanguage, useT } from "../../i18n";

export function RecipeOverview({ recipe }: { recipe: Recipe }) {
  const save = useRecipeSave(recipe.id);
  const { draft, theme } = usePreferences(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const [info, setInfo] = useState(false), [fallback, setFallback] = useState(""), [failedLink, setFailedLink] = useState("");
  const [report, setReport] = useState(false), member = useMember();
  const result = recipeFit(recipe, draft.diets, draft.excluded), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  // Play it in Rush Hour when this recipe has a live Recipe Kitchen level (members only for now).
  const kitchen = useKitchen(), level = kitchen.data?.levels.find(l => l.recipeId === recipe.id);
  useReactions("recipe", [recipe.id]);
  const open = (url: string) => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); };
  return <>
    <RecipeImage recipe={recipe} label style={{ width: "100%", aspectRatio: 2.4, borderRadius: 16 }} />
    <ReactionBar kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe, language)} onShareFailed={setFallback} trailing={<>
      <Action icon={save.saved ? "bookmark" : "bookmark-outline"} color={save.saved ? theme.accent : theme.foreground} busy={save.busy} disabled={save.disabled}
        label={t(save.saved ? "removeSaved" : "saveName", { name: recipe.name })} selected={save.saved} onPress={save.onPress} />
      {level && <Action icon="game-controller-outline" color={theme.foreground} label={t("playName", { name: recipe.name })}
        onPress={() => router.push({ pathname: "/game/play", params: { pack: level.hash, tier: nextTier(level), run: String(Date.now()) } })} />}
      {kitchen.data && !level && recipe.member?.own && <MakeLevelAction recipeId={recipe.id} onReady={kitchen.refresh} />}
      <Action icon={info ? "information-circle" : "information-circle-outline"} color={info ? theme.accent : theme.foreground} label={t("recipeInfo")} selected={info} onPress={() => setInfo(!info)} />
    </>} />
    <View style={{ gap: 4, alignItems: "flex-start" }}>
      <T variant="small" muted>{[tc("minutes", { n: recipe.minutes }), recipe.onePot ? t("onePot") : "", cooks ? cookedBy(cooks, language) : ""].filter(Boolean).join(" · ")}</T>
      <DietLabels labels={result.labels} />
    </View>
    {recipe.member?.shop && <AuthorShop author={recipe.author} shop={recipe.member.shop} />}
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>{t("containsList", { list: exclusionList(result.conflicts, language) })}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>{t("unconfirmedList", { list: exclusionList(result.unknown, language) })}</T>}
    {info && recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.author} · {recipe.language} · v{recipe.revision}</T>
      <T variant="small" muted>{t(recipe.source ? (recipe.source.kind === "video" ? "aiFromVideo" : "aiFromPages") : "memberRecipeNote")}{recipe.member.sponsorship !== "None" ? t("sponsorshipSuffix", { value: sponsorshipName(recipe.member.sponsorship, language) }) : ""}</T>
      {recipe.source?.kind === "video" && !!recipe.source.url && <Button label={recipe.source.creator ? t("watchOriginalBy", { creator: recipe.source.creator }) : t("watchOriginal")} variant="link" onPress={() => open(recipe.source!.url!)} />}
      {recipe.source?.kind === "request" && recipe.source.urls?.map((url, index) => <Button key={url} label={t("recipeSourceN", { n: index + 1 })} variant="link" onPress={() => open(url)} />)}
      {!!recipe.source?.notes && <T variant="small" muted>{recipe.source.notes}</T>}
      <T variant="small" muted>{t("updatedOn", { date: recipe.updatedAt })}</T>
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!recipe.member.own && <Button label={t("reportRecipe")} icon="flag-outline" variant="link" onPress={() => { if (ensureMember(member, "/cook/recipe/" + recipe.id)) setReport(true); }} />}
    </View>}
    {recipe.member && <ReportSheet kind="recipe" targetId={recipe.id} name={recipe.name} visible={report} onClose={() => setReport(false)} />}
    {info && !recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.sourceRating ? t("recipeBySite", { author: recipe.author, site: recipe.sourceRating.site }) : recipe.author + " · " + recipe.language + " · v" + recipe.revision}</T>
      <T variant="small" muted>{t(recipe.provenance ? "sourceReviewed" : "bundledRecipe")} · {t(recipe.photo || recipe.image ? "illustrativeImage" : "noPhotoYet")}</T>
      <T variant="small" muted>{t("updatedOn", { date: recipe.updatedAt })}{t(recipe.provenance ? "reviewedByManager" : "claimsUnreviewed")}</T>
      {recipe.sourceRating && <T variant="small">{t("originalRated", { value: recipe.sourceRating.value.toFixed(1), count: recipe.sourceRating.count.toLocaleString("en-SG") })}</T>}
      {recipe.provenance?.sources.map((url, index) => <Button key={url} label={t("recipeSourceN", { n: index + 1 })} variant="link" onPress={() => open(url)} />)}
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!!recipe.adaptationNote && <T variant="small">{recipe.adaptationNote}</T>}
    </View>}
    {!!failedLink && <View style={{ gap: 6 }}><T variant="small">{t("linkFailed")}</T><T selectable>{failedLink}</T><IconButton label={t("closeLink")} icon="close" onPress={() => setFailedLink("")} /></View>}
    {!!fallback && <View style={{ gap: 6 }}><T variant="small">{t("shareFailed")}</T><T selectable>{fallback}</T><IconButton label={t("closeShareText")} icon="close" onPress={() => setFallback("")} /></View>}
  </>;
}
/** The author sells on Market: one line naming their shop, which opens it. */
function AuthorShop({ author, shop }: { author: string; shop: { id: string; name: string } }) {
  const { theme } = usePreferences(), t = useT("cook");
  return <Pressable accessibilityRole="link" accessibilityLabel={t("authorShopSpoken", { author, shop: shop.name })} onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: shop.id } })}
    style={({ pressed }) => [common.row, { gap: 6, minHeight: 44, alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 }]}>
    <Icon name="storefront-outline" size={16} color={theme.accent} />
    <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{t("authorShopLine", { author })}<T variant="small" color={theme.accent} style={common.bold}>{shop.name}</T></T>
  </Pressable>;
}
