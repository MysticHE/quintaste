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

/** Like, share, save, play and (on another member's recipe) report, for the recipe page header. */
export function RecipeActions({ recipe, onShareFailed }: { recipe: Recipe; onShareFailed: (text: string) => void }) {
  const save = useRecipeSave(recipe.id), { theme } = usePreferences(), t = useT("cook"), language = useLanguage();
  const [report, setReport] = useState(false), member = useMember();
  // Play it in Rush Hour when this recipe has a live Recipe Kitchen level (members only for now).
  const kitchen = useKitchen(), level = kitchen.data?.levels.find(l => l.recipeId === recipe.id);
  useReactions("recipe", [recipe.id]);
  return <>
    <ReactionBar kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe, language)} onShareFailed={onShareFailed} trailing={<>
      <Action icon={save.saved ? "bookmark" : "bookmark-outline"} color={save.saved ? theme.accent : theme.foreground} busy={save.busy} disabled={save.disabled}
        label={t(save.saved ? "removeSaved" : "saveName", { name: recipe.name })} selected={save.saved} onPress={save.onPress} />
      {level && <Action icon="game-controller-outline" color={theme.foreground} label={t("playName", { name: recipe.name })}
        onPress={() => router.push({ pathname: "/game/play", params: { pack: level.hash, tier: nextTier(level), run: String(Date.now()) } })} />}
      {kitchen.data && !level && recipe.member?.own && <MakeLevelAction recipeId={recipe.id} onReady={kitchen.refresh} />}
      {recipe.member && !recipe.member.own && <Action icon="flag-outline" color={theme.foreground} label={t("reportRecipe")}
        onPress={() => { if (ensureMember(member, "/cook/recipe/" + recipe.id)) setReport(true); }} />}
    </>} />
    {recipe.member && <ReportSheet kind="recipe" targetId={recipe.id} name={recipe.name} visible={report} onClose={() => setReport(false)} />}
  </>;
}

export function RecipeOverview({ recipe, shareFallback, clearShareFallback }: { recipe: Recipe; shareFallback: string; clearShareFallback: () => void }) {
  const { draft, theme } = usePreferences(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const [failedLink, setFailedLink] = useState("");
  const result = recipeFit(recipe, draft.diets, draft.excluded), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  const open = (url: string) => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); };
  const sponsorship = recipe.member && recipe.member.sponsorship !== "None" ? sponsorshipName(recipe.member.sponsorship, language) : "";
  const video = recipe.source?.kind === "video" ? recipe.source : undefined;
  // Adapted and AI-from-pages recipes credit where they came from.
  const sources = [...(recipe.provenance?.sources ?? []), ...(recipe.source?.kind === "request" ? recipe.source.urls ?? [] : [])];
  return <View style={{ gap: 12 }}>
    <RecipeImage recipe={recipe} label style={{ width: "100%", aspectRatio: 16 / 9, maxHeight: 240, borderRadius: 18 }} />
    <View style={{ gap: 4 }}>
      <T variant="title" accessibilityRole="header">{recipe.name}</T>
      <T variant="small" muted>{[tc("minutes", { n: recipe.minutes }), recipe.onePot ? t("onePot") : "", cooks ? cookedBy(cooks, language) : "", sponsorship ? t("sponsorshipFact", { value: sponsorship }) : ""].filter(Boolean).join(" · ")}</T>
    </View>
    <DietLabels labels={result.labels} />
    {!!recipe.description && <T variant="small">{recipe.description}</T>}
    {!!video?.url && <View style={{ alignSelf: "flex-start" }}><Button label={video.creator ? t("watchOriginalBy", { creator: video.creator }) : t("watchOriginal")} variant="link" icon="open-outline" onPress={() => open(video.url!)} /></View>}
    {sources.length > 0 && <View style={[common.row, { flexWrap: "wrap", columnGap: 8 }]}>{sources.map((url, index) =>
      <Button key={url} label={sources.length > 1 ? t("recipeSourceN", { n: index + 1 }) : t("recipeSource")} variant="link" icon="open-outline" onPress={() => open(url)} />)}</View>}
    {recipe.member?.shop && <AuthorShop author={recipe.author} shop={recipe.member.shop} />}
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>{t("containsList", { list: exclusionList(result.conflicts, language) })}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>{t("unconfirmedList", { list: exclusionList(result.unknown, language) })}</T>}
    {!!failedLink && <View style={{ gap: 6 }}><T variant="small">{t("linkFailed")}</T><T selectable>{failedLink}</T><IconButton label={t("closeLink")} icon="close" onPress={() => setFailedLink("")} /></View>}
    {!!shareFallback && <View style={{ gap: 6 }}><T variant="small">{t("shareFailed")}</T><T selectable>{shareFallback}</T><IconButton label={t("closeShareText")} icon="close" onPress={clearShareFallback} /></View>}
  </View>;
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
