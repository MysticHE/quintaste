import { Image } from "expo-image";
import type { ReactNode } from "react";
import { CookSection } from "./CookLayout";
import { T } from "../ui";
import { View } from "react-native";
import type { RecipeDraft } from "../../types/recipe-workspace";
import { ingredientLine } from "../../utils/food-format";
import { sponsorshipName } from "../../utils/private-recipes";
import { useLanguage, useT } from "../../i18n";
export function PrivateRecipeContent({ draft: d, servings, controls }: { draft: RecipeDraft; servings?: number; controls?: ReactNode }) {
  const t = useT("cook"), tc = useT("common"), language = useLanguage();
  const scale = servings && /^[1-8]$/.test(d.servings) ? servings / +d.servings : 1;
  return <>
    {d.photo && <Image source={{ uri: d.photo }} contentFit="contain" accessibilityLabel={t("yourRecipePhoto")} style={{ width: "100%", height: 160, borderRadius: 16 }} />}
    <T variant="title">{d.title || t("untitledRecipe")}</T>
    {!controls && <T>{t("servingsCount", { n: servings ?? (d.servings || "?") })}{d.minutes ? " · " + tc("minutes", { n: d.minutes }) : ""}</T>}
    {!!controls && !!d.minutes && <T variant="small" muted>{tc("minutes", { n: d.minutes })}</T>}
    {d.sponsorship && d.sponsorship !== "None" && <T variant="small">{sponsorshipName(d.sponsorship, language)}</T>}
    {controls}
    <View style={{ gap: 6 }}><T variant="subtitle">{t("ingredients")}</T>{!d.ingredients.length && <T muted>{t("addIngredientsInEdit")}</T>}{d.ingredients.map(i => <T key={i.id}>{!i.name.trim() ? t("incompleteIngredient") : !i.amount.trim() ? t("toTaste", { name: i.name })
      : Number.isFinite(+i.amount) ? ingredientLine({ name: i.name, unit: i.unit, amount: +i.amount }, scale, language).text : [i.amount, i.unit, i.name].filter(Boolean).join(" ")}</T>)}</View>
    {d.steps.map((s, n) => <View key={s.id} style={{ gap: 6, paddingVertical: 6 }}><T variant="subtitle">{n + 1}. {s.title || t("untitledStep")}</T><T>{s.instruction || t("instructionsMissing")}</T>{!!s.minutes && <T variant="small">{t("timerLine", { n: s.minutes })}</T>}{s.photo && <Image source={{ uri: s.photo }} contentFit="contain" style={{ height: 150, width: "100%" }} accessibilityLabel={t("stepPhoto", { n: n + 1 })} />}</View>)}
    <CookSection title={t("recipeInfo")}>{!!d.author && <T>{d.author}</T>}<T variant="small">{d.language} · v{d.revision}</T>{!!d.description && <T>{d.description}</T>}</CookSection>
  </>;
}
