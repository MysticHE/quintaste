import { Image } from "expo-image";
import type { ReactNode } from "react";
import { CookSection } from "./CookLayout";
import { T } from "../ui";
import { View } from "react-native";
import type { RecipeDraft } from "../../types/recipe-workspace";
import { ingredientLine } from "../../utils/food-format";
export function PrivateRecipeContent({ draft: d, servings, controls }: { draft: RecipeDraft; servings?: number; controls?: ReactNode }) {
  const scale = servings && /^[1-8]$/.test(d.servings) ? servings / +d.servings : 1;
  return <>
    {d.photo && <Image source={{ uri: d.photo }} contentFit="contain" accessibilityLabel="Your recipe photo" style={{ width: "100%", height: 160, borderRadius: 16 }} />}
    <T variant="title">{d.title || "Untitled recipe"}</T>
    {!controls && <T>{servings ?? (d.servings || "?")} servings{d.minutes ? " · " + d.minutes + " min" : ""}</T>}
    {!!controls && !!d.minutes && <T variant="small" muted>{d.minutes} min</T>}
    {d.diet !== "Unspecified" && <T variant="small">{d.diet}</T>}
    {d.sponsorship && d.sponsorship !== "None" && <T variant="small">{d.sponsorship}</T>}
    {controls}
    <View style={{ gap: 6 }}><T variant="subtitle">Ingredients</T>{!d.ingredients.length && <T muted>Add ingredients in Edit.</T>}{d.ingredients.map(i => <T key={i.id}>{!i.name.trim() ? "Incomplete ingredient" : !i.amount.trim() ? i.name + ", to taste"
      : Number.isFinite(+i.amount) ? ingredientLine({ name: i.name, unit: i.unit, amount: +i.amount }, scale).text : [i.amount, i.unit, i.name].filter(Boolean).join(" ")}</T>)}</View>
    {d.steps.map((s, n) => <View key={s.id} style={{ gap: 6, paddingVertical: 6 }}><T variant="subtitle">{n + 1}. {s.title || "Untitled step"}</T><T>{s.instruction || "Instructions missing"}</T>{!!s.minutes && <T variant="small">Timer: {s.minutes} min</T>}{s.photo && <Image source={{ uri: s.photo }} contentFit="contain" style={{ height: 150, width: "100%" }} accessibilityLabel={"Step " + (n + 1) + " photo"} />}</View>)}
    <CookSection title="Recipe Info">{!!d.author && <T>{d.author}</T>}<T variant="small">{d.language} · v{d.revision}</T>{!!d.description && <T>{d.description}</T>}</CookSection>
  </>;
}
