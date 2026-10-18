import { useRef, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import type { Recipe } from "../../types/food";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { alliumFree, recipeFit } from "../../utils/recipe-dietary";
import { alliums, fivePungentLabel } from "../../config/preferences";
import { cookedStats } from "../../utils/recipe-browse";
import { ingredientLine, shortDate } from "../../utils/food-format";
import { IconButton } from "../food/Controls";
import { FitBadge } from "../food/Evidence";
import { Button, Icon, T, common } from "../ui";
import { RecipeImage } from "./RecipeImage";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ReportSheet } from "../ReportSheet";
import { ensureMember, useMember } from "../CommunityGate";

export function RecipeFit({ recipe }: { recipe: Recipe }) {
  const { draft } = usePreferences();
  return <View style={[common.row, { gap: 6, flexWrap: "wrap", alignSelf: "flex-start", maxWidth: "100%" }]}>
    <FitBadge fit={recipeFit(recipe, draft.diet, draft.excluded).fit} /><FivePungentTag recipe={recipe} />
  </View>;
}
/** The five pungent decide a meal for much of this audience, so every recipe says where it stands: free of them, or which it uses. */
export function FivePungentTag({ recipe, detail = false }: { recipe: Recipe; detail?: boolean }) {
  const { theme } = usePreferences(), used = alliums.filter(item => recipe.dietary.contains.includes(item));
  if (alliumFree(recipe)) return <View style={[s.tag, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
    <T variant="small" color={theme.success} style={common.bold}>{fivePungentLabel}</T></View>;
  if (!detail || !used.length) return null;
  return <View style={[s.tag, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
    <T variant="small" color={theme.warning} style={common.bold}>Has {used.join(", ").toLowerCase()}</T></View>;
}
function bundledShareText(recipe: Recipe) {
  if (recipe.member) return recipe.name + "\nBy " + recipe.author + " · " + recipe.minutes + " min · " + recipe.servings + " servings\n" +
    recipe.ingredients.map(i => ingredientLine(i).text).join("\n") + "\n\n" + recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n") +
    "\n\nShared on QuinTaste · Ingredient claims are the author’s." + (recipe.member.sponsorship !== "None" ? "\nSponsorship: " + recipe.member.sponsorship : "");
  return recipe.name + "\n" + recipe.minutes + " min · " + recipe.servings + " servings\n" +
    recipe.ingredients.map(i => ingredientLine(i).text).join("\n") + "\n\n" +
    recipe.steps.map((s, n) => (n + 1) + ". " + s.instruction).join("\n\n") + (recipe.provenance ? "\n\nQuinTaste · Source-reviewed adaptation; not kitchen-tested.\n" + recipe.provenance.sources.join("\n") : "\n\nQuinTaste bundled recipe · Ingredient claims unreviewed.");
}
export function RecipeOverview({ recipe }: { recipe: Recipe }) {
  const { doc, isSaved, toggleSave, readable } = useFood();
  const { draft, theme } = usePreferences();
  const [info, setInfo] = useState(false), [fallback, setFallback] = useState(false), [failedLink, setFailedLink] = useState("");
  const [busy, setBusy] = useState(false), lock = useRef(false), [report, setReport] = useState(false), member = useMember();
  const saved = isSaved("recipe", recipe.id), result = recipeFit(recipe, draft.diet, draft.excluded);
  const cooked = cookedStats(doc.recipes.cooked, recipe.id), shareText = bundledShareText(recipe);
  const save = async () => {
    if (lock.current || !readable) return;
    lock.current = true; setBusy(true);
    try { await toggleSave("recipe", recipe.id); } finally { lock.current = false; setBusy(false); }
  };
  const share = async () => { try { await Share.share({ message: shareText }); } catch { setFallback(true); } };
  return <>
    <RecipeImage recipe={recipe} label style={{ width: "100%", aspectRatio: 2.4, borderRadius: 16 }} />
    <View style={[common.row, { gap: 6 }]}>
      <View style={[common.flex, { gap: 4, alignItems: "flex-start" }]}>
        <T variant="small" muted>{[recipe.minutes + " min", recipe.onePot ? "One pot" : "", cooked.count ? "Cooked " + cooked.count + "× · last " + shortDate(cooked.last) : ""].filter(Boolean).join(" · ")}</T>
        <View style={[common.row, { gap: 6, flexWrap: "wrap" }]}><FitBadge fit={result.fit} /><FivePungentTag recipe={recipe} detail /></View>
      </View>
      <IconButton label={saved ? "Remove Saved Recipe" : "Save Recipe"} icon={saved ? "bookmark" : "bookmark-outline"} selected={saved} disabled={!readable || busy} loading={busy} onPress={() => void save()} />
      <IconButton label="Share Recipe" icon="share-outline" onPress={() => void share()} />
      <IconButton label="Recipe Info" icon="information-circle-outline" selected={info} onPress={() => setInfo(!info)} />
    </View>
    {recipe.member?.shop && <AuthorShop author={recipe.author} shop={recipe.member.shop} />}
    {!!result.conflicts.length && <T variant="small" color={theme.warning}>Contains: {result.conflicts.join(", ")}</T>}
    {!!result.unknown.length && <T variant="small" color={theme.warning}>Unconfirmed: {result.unknown.join(", ")}</T>}
    {info && recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.author} · {recipe.language} · v{recipe.revision}</T>
      <T variant="small" muted>Member recipe · Ingredient claims are the author’s{recipe.member.sponsorship !== "None" ? " · Sponsorship: " + recipe.member.sponsorship : ""}</T>
      <T variant="small" muted>Updated {recipe.updatedAt}</T>
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!recipe.member.own && <Button label="Report Recipe" icon="flag-outline" variant="link" onPress={() => { if (ensureMember(member, "/cook/recipe/" + recipe.id)) setReport(true); }} />}
    </View>}
    {recipe.member && <ReportSheet kind="recipe" targetId={recipe.id} name={recipe.name} visible={report} onClose={() => setReport(false)} />}
    {info && !recipe.member && <View style={{ gap: 6 }}>
      <T variant="small">{recipe.author} · {recipe.language} · v{recipe.revision}</T>
      <T variant="small" muted>{recipe.provenance ? "Source-reviewed adaptation · Not kitchen-tested" : "Bundled recipe"} · {recipe.photo || recipe.image ? "Illustrative image" : "No photo yet"}</T>
      <T variant="small" muted>Updated {recipe.updatedAt}{recipe.provenance ? " · Reviewed by QT Manager" : " · Ingredient claims unreviewed"}</T>
      {recipe.provenance?.sources.map((url, index) => <Button key={url} label={"Recipe Source " + (index + 1)} variant="link" onPress={() => { setFailedLink(""); void Linking.openURL(url).catch(() => setFailedLink(url)); }} />)}
      {!!recipe.description && <T variant="small">{recipe.description}</T>}
      {!!recipe.adaptationNote && <T variant="small">{recipe.adaptationNote}</T>}
    </View>}
    {!!failedLink && <View style={{ gap: 6 }}><T variant="small">Link did not open. Select and copy:</T><T selectable>{failedLink}</T><IconButton label="Close Link" icon="close" onPress={() => setFailedLink("")} /></View>}
    {fallback && <View style={{ gap: 6 }}><T variant="small">Sharing unavailable. Select and copy:</T><T selectable>{shareText}</T><IconButton label="Close Share Text" icon="close" onPress={() => setFallback(false)} /></View>}
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
const s = StyleSheet.create({ tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" } });
