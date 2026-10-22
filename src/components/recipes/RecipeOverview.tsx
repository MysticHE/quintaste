import { useState } from "react";
import { Pressable, View } from "react-native";
import type { Recipe } from "../../types/food";
import { usePreferences } from "../../state/Preferences";
import { recipeFit } from "../../utils/recipe-dietary";
import { IconButton } from "../food/Controls";
import { DietLabels } from "../food/DietLabels";
import { Button, Icon, T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import { Action, ReactionBar, cookedBy } from "../ReactionBar";
import { useReaction, useReactions } from "../../hooks/useReactions";
import { useRecipeSave } from "../../hooks/useRecipeSave";
import { recipeShareMessage } from "../../utils/recipe-share";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ReportSheet } from "../ReportSheet";
import { ensureMember, useMember } from "../CommunityGate";
import { nextTier, useKitchen } from "../../hooks/useKitchen";

export function RecipeOverview({ recipe }: { recipe: Recipe }) {
  const save = useRecipeSave(recipe.id);
  const { draft, theme } = usePreferences();
  const [info, setInfo] = useState(false), [fallback, setFallback] = useState(""), [failedLink, setFailedLink] = useState("");
  const [report, setReport] = useState(false), member = useMember();
  const result = recipeFit(recipe, draft.diets, draft.excluded), cooks = useReaction("recipe", recipe.id).reaction.cooks;
  // Play it in Rush Hour when this recipe has a live Recipe Kitchen level (members only for now).
  const level = useKitchen().data?.levels.find(l => l.recipeId === recipe.id);
  useReactions("recipe", [recipe.id]);
  return <>
    <RecipeImage recipe={recipe} label style={{ width: "100%", aspectRatio: 2.4, borderRadius: 16 }} />
    <ReactionBar kind="recipe" id={recipe.id} name={recipe.name} shareMessage={() => recipeShareMessage(recipe)} onShareFailed={setFallback} trailing={<>
      <Action icon={save.saved ? "bookmark" : "bookmark-outline"} color={save.saved ? theme.accent : theme.foreground} busy={save.busy} disabled={save.disabled}
        label={(save.saved ? "Remove saved " : "Save ") + recipe.name} selected={save.saved} onPress={save.onPress} />
      {level && <Action icon="game-controller-outline" color={theme.foreground} label={"Play " + recipe.name}
        onPress={() => router.push({ pathname: "/game/play", params: { pack: level.hash, tier: nextTier(level), run: String(Date.now()) } })} />}
      <Action icon={info ? "information-circle" : "information-circle-outline"} color={info ? theme.accent : theme.foreground} label="Recipe Info" selected={info} onPress={() => setInfo(!info)} />
    </>} />
    <View style={{ gap: 4, alignItems: "flex-start" }}>
      <T variant="small" muted>{[recipe.minutes + " min", recipe.onePot ? "One pot" : "", cooks ? cookedBy(cooks) : ""].filter(Boolean).join(" · ")}</T>
      <DietLabels labels={result.labels} />
    </View>
    {recipe.member?.shop && <AuthorShop author={recipe.author} shop={recipe.member.shop} />}
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>Contains: {result.conflicts.join(", ")}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>Unconfirmed: {result.unknown.join(", ")}</T>}
    {info && recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.author} · {recipe.language} · v{recipe.revision}</T>
      <T variant="small" muted>{recipe.source ? (recipe.source.kind === "video" ? "AI-written from a video · Not kitchen-tested" : "AI-written from recipe pages · Not kitchen-tested") : "Member recipe · Ingredient claims are the author’s"}{recipe.member.sponsorship !== "None" ? " · Sponsorship: " + recipe.member.sponsorship : ""}</T>
      {recipe.source?.kind === "video" && !!recipe.source.url && <Button label={"Watch The Original" + (recipe.source.creator ? " By " + recipe.source.creator : "")} variant="link" onPress={() => { setFailedLink(""); void Linking.openURL(recipe.source!.url!).catch(() => setFailedLink(recipe.source!.url!)); }} />}
      {recipe.source?.kind === "request" && recipe.source.urls?.map((url, index) => <Button key={url} label={"Recipe Source " + (index + 1)} variant="link" onPress={() => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); }} />)}
      {!!recipe.source?.notes && <T variant="small" muted>{recipe.source.notes}</T>}
      <T variant="small" muted>Updated {recipe.updatedAt}</T>
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!recipe.member.own && <Button label="Report Recipe" icon="flag-outline" variant="link" onPress={() => { if (ensureMember(member, "/cook/recipe/" + recipe.id)) setReport(true); }} />}
    </View>}
    {recipe.member && <ReportSheet kind="recipe" targetId={recipe.id} name={recipe.name} visible={report} onClose={() => setReport(false)} />}
    {info && !recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.sourceRating ? "Recipe by " + recipe.author + " (" + recipe.sourceRating.site + ")" : recipe.author + " · " + recipe.language + " · v" + recipe.revision}</T>
      <T variant="small" muted>{recipe.provenance ? "Source-reviewed adaptation · Not kitchen-tested" : "Bundled recipe"} · {recipe.photo || recipe.image ? "Illustrative image" : "No photo yet"}</T>
      <T variant="small" muted>Updated {recipe.updatedAt}{recipe.provenance ? " · Reviewed by QT Manager" : " · Ingredient claims unreviewed"}</T>
      {recipe.sourceRating && <T variant="small">Original rated {recipe.sourceRating.value.toFixed(1)} by {recipe.sourceRating.count.toLocaleString("en-SG")} cooks</T>}
      {recipe.provenance?.sources.map((url, index) => <Button key={url} label={"Recipe Source " + (index + 1)} variant="link" onPress={() => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); }} />)}
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!!recipe.adaptationNote && <T variant="small">{recipe.adaptationNote}</T>}
    </View>}
    {!!failedLink && <View style={{ gap: 6 }}><T variant="small">Link did not open. Select and copy:</T><T selectable>{failedLink}</T><IconButton label="Close Link" icon="close" onPress={() => setFailedLink("")} /></View>}
    {!!fallback && <View style={{ gap: 6 }}><T variant="small">Sharing unavailable. Select and copy:</T><T selectable>{fallback}</T><IconButton label="Close Share Text" icon="close" onPress={() => setFallback("")} /></View>}
  </>;
}
/** The author sells on Market: one line naming their shop, which opens it. */
function AuthorShop({ author, shop }: { author: string; shop: { id: string; name: string } }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="link" accessibilityLabel={"By " + author + ". Open " + shop.name + " on Market"} onPress={() => router.push({ pathname: "/market/shop/[id]", params: { id: shop.id } })}
    style={({ pressed }) => [common.row, { gap: 6, minHeight: 44, alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 }]}>
    <Icon name="storefront-outline" size={16} color={theme.accent} />
    <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>By {author} · <T variant="small" color={theme.accent} style={common.bold}>{shop.name}</T></T>
  </Pressable>;
}
