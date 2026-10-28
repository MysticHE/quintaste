import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { exclusionList, recipeFit } from "../../utils/recipe-dietary";
import { IconButton } from "../food/Controls";
import { DietLabels } from "../food/DietLabels";
import { Icon, T, common, type IconName } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { Action, ReactionBar, cookedBy } from "../ReactionBar";
import { useReaction, useReactions } from "../../hooks/useReactions";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { recipeShareMessage } from "../../utils/recipe-share";
import { sponsorshipName } from "../../utils/private-recipes";
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

/**
 * The recipe's photo, name and one line of facts with its diet labels, then the description (owner, 28 Oct 2026: no source links on
 * the recipe page; a video recipe keeps a plain credit to its creator).
 */
export function RecipeOverview({ recipe, shareFallback, clearShareFallback }: { recipe: Recipe; shareFallback: string; clearShareFallback: () => void }) {
  const { draft, theme } = usePreferences(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const result = recipeFit(recipe, draft.diets, draft.excluded), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  const sponsorship = recipe.member && recipe.member.sponsorship !== "None" ? sponsorshipName(recipe.member.sponsorship, language) : "";
  const creator = recipe.source?.kind === "video" ? recipe.source.creator : undefined;
  return <View style={s.overview}>
    <RecipeImage recipe={recipe} label style={s.hero} />
    <View style={s.heading}>
      <T variant="title" accessibilityRole="header">{recipe.name}</T>
      {/* Time and the other facts share one wrapping line with the diet labels, so short facts never take a row of their own. */}
      <View style={s.facts}>
        <Fact icon="time-outline">{tc("minutes", { n: recipe.minutes })}</Fact>
        {recipe.onePot && <Fact icon="restaurant-outline">{t("onePot")}</Fact>}
        {cooks > 0 && <Fact icon="flame-outline">{cookedBy(cooks, language)}</Fact>}
        {!!sponsorship && <Fact icon="pricetag-outline">{t("sponsorshipFact", { value: sponsorship })}</Fact>}
        <DietLabels labels={result.labels} />
      </View>
    </View>
    {!!recipe.description && <T variant="small" muted>{recipe.description}</T>}
    {!!creator && <T variant="caption" muted>{t("videoBy", { creator })}</T>}
    {recipe.member?.shop && <AuthorShop author={recipe.author} shop={recipe.member.shop} />}
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>{t("containsList", { list: exclusionList(result.conflicts, language) })}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>{t("unconfirmedList", { list: exclusionList(result.unknown, language) })}</T>}
    {!!shareFallback && <View style={{ gap: 6 }}><T variant="small">{t("shareFailed")}</T><T selectable>{shareFallback}</T><IconButton label={t("closeShareText")} icon="close" onPress={clearShareFallback} /></View>}
  </View>;
}
function Fact({ icon, children }: { icon: IconName; children: string }) {
  const { theme } = usePreferences();
  return <View style={[common.row, { gap: 4 }]}><Icon name={icon} size={15} color={theme.mutedForeground} /><T variant="small" muted>{children}</T></View>;
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
const s = StyleSheet.create({
  overview: { gap: 10 },
  hero: { width: "100%", aspectRatio: 16 / 9, maxHeight: 240, borderRadius: 18 },
  heading: { gap: 6 },
  facts: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 6 },
});
