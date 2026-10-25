import { View } from "react-native";
import { Button, Field, T, common } from "../ui";
import { Chip, Chips, IconButton } from "../food/Controls";
import { CookSection } from "./CookLayout";
import { RecipePhoto } from "./RecipePhoto";
import { localId } from "../../state/Food";
import type { RecipeDraft } from "../../types/recipe-workspace";
import { recipeCategories } from "../../types/food";
import { IngredientShopLink, useOwnShopItems } from "./ShopLinks";
import { useLanguage, useT } from "../../i18n";
import type { CookKey } from "../../i18n/en/cook";
import { categoryName } from "../../utils/recipe-browse";
import { sponsorshipName } from "../../utils/private-recipes";
type Props = { draft: RecipeDraft; edit: (patch: Partial<RecipeDraft>) => void; disabled: boolean; onBusy: (busy: boolean) => void };
export function DraftBasics({ draft: d, edit, disabled, onBusy }: Props) {
  const t = useT("cook"), language = useLanguage();
  const field = (key: "title" | "description" | "author" | "language" | "servings" | "minutes", label: CookKey, maxLength: number, multiline = false) => <Field label={t(label)} value={d[key]} onChangeText={value => edit({ [key]: value })} editable={!disabled} maxLength={maxLength} multiline={multiline} />;
  return <><RecipePhoto label={t("recipeFallback")} value={d.photo} onChange={photo => edit({ photo })} disabled={disabled} onBusy={onBusy} />
    {field("title", "recipeName", 100)}{field("description", "aboutRecipe", 2000, true)}
    <View style={[common.row, { alignItems: "flex-start" }]}><View style={common.flex}>{field("servings", "servingsField", 2)}</View><View style={common.flex}>{field("minutes", "totalMinutes", 4)}</View></View>
    <T variant="small" muted>{t("category")}</T>
    <Chips label={t("category")} multiple>{recipeCategories.map(category => { const selected = d.categories.includes(category);
      return <Chip compact key={category} label={categoryName(category, language)} role="checkbox" selected={selected} disabled={disabled || (!selected && d.categories.length >= 2)}
        onPress={() => edit({ categories: selected ? d.categories.filter(c => c !== category) : [...d.categories, category] })} />; })}</Chips>
    <CookSection title={t("authorDisclosure")}>{field("author", "author", 80)}{field("language", "languageField", 40)}<T variant="small" muted>{t("sponsorship")}</T><Chips label={t("sponsorship")}>{(["None", "Paid", "Gifted", "Affiliate"] as const).map(sponsorship => <Chip compact key={sponsorship} label={sponsorshipName(sponsorship, language)} role="radio" selected={d.sponsorship === sponsorship} disabled={disabled} onPress={() => edit({ sponsorship })} />)}</Chips></CookSection>
  </>;
}
export function DraftIngredients({ draft: d, edit, disabled }: Props) {
  const shop = useOwnShopItems(), t = useT("cook");
  return <><T variant="subtitle">{t("ingredients")}</T>{d.ingredients.map((item, index) => <View key={item.id} style={{ gap: 8 }}>
    <Field label={t("ingredientN", { n: index + 1 })} value={item.name} maxLength={120} editable={!disabled} onChangeText={name => edit({ ingredients: d.ingredients.map(i => i.id === item.id ? { ...i, name } : i) })} />
    <View style={[common.row, { alignItems: "flex-start" }]}>{(["amount", "unit"] as const).map(key => <View key={key} style={common.flex}><Field label={t(key === "amount" ? "amountN" : "unitN", { n: index + 1 })} value={item[key]} maxLength={key === "amount" ? 12 : 24} editable={!disabled} placeholder={t(key === "amount" ? "toTastePlaceholder" : "unitPlaceholder")} onChangeText={value => edit({ ingredients: d.ingredients.map(i => i.id === item.id ? { ...i, [key]: value } : i) })} /></View>)}<IconButton label={t("removeIngredientN", { n: index + 1 })} icon="trash-outline" disabled={disabled} onPress={() => edit({ ingredients: d.ingredients.filter(i => i.id !== item.id) })} /></View>
    <IngredientShopLink draft={d} ingredient={item} shop={shop} disabled={disabled} onChange={listingId => edit({ ingredients: d.ingredients.map(i => i.id !== item.id ? i : { id: i.id, name: i.name, amount: i.amount, unit: i.unit, ...(listingId ? { listingId } : {}) }) })} />
  </View>)}<View style={{ alignSelf: "flex-start" }}><Button label={t("addIngredient")} icon="add" variant="link" disabled={disabled || d.ingredients.length >= 40} onPress={() => edit({ ingredients: [...d.ingredients, { id: localId("ingredient"), name: "", amount: "", unit: "" }] })} /></View></>;
}
const stepFieldLabels = { title: "stepTitleN", instruction: "instructionsN", minutes: "timerMinutesN" } as const;
export function DraftSteps({ draft: d, edit, disabled, onBusy }: Props) {
  const t = useT("cook");
  const move = (from: number, to: number) => { const steps = [...d.steps]; [steps[from], steps[to]] = [steps[to], steps[from]]; edit({ steps }); };
  return <><T variant="subtitle">{t("steps")}</T>{d.steps.map((step, index) => <View key={step.id} style={{ gap: 8, paddingVertical: 6 }}>
    <View style={common.row}><T style={common.flex}>{t("stepNumber", { n: index + 1 })}</T><IconButton label={t("moveStepUp", { n: index + 1 })} icon="arrow-up" disabled={disabled || index === 0} onPress={() => move(index, index - 1)} /><IconButton label={t("moveStepDown", { n: index + 1 })} icon="arrow-down" disabled={disabled || index === d.steps.length - 1} onPress={() => move(index, index + 1)} /><IconButton label={t("removeStepN", { n: index + 1 })} icon="trash-outline" disabled={disabled} onPress={() => edit({ steps: d.steps.filter(s => s.id !== step.id) })} /></View>
    {(["title", "instruction", "minutes"] as const).map(key => <Field key={key} label={t(stepFieldLabels[key], { n: index + 1 })} value={step[key]} editable={!disabled} multiline={key === "instruction"} maxLength={key === "instruction" ? 3000 : key === "title" ? 120 : 3} onChangeText={value => edit({ steps: d.steps.map(s => s.id === step.id ? { ...s, [key]: value } : s) })} />)}
    {!!d.ingredients.filter(i => i.name.trim()).length && <><T variant="small" muted>{t("ingredientsForStep")}</T><Chips>{d.ingredients.filter(i => i.name.trim()).map(i => <Chip key={i.id} label={i.name} role="checkbox" selected={step.ingredientIds?.includes(i.id)} disabled={disabled} onPress={() => edit({ steps: d.steps.map(s => s.id !== step.id ? s : { ...s, ingredientIds: s.ingredientIds?.includes(i.id) ? s.ingredientIds.filter(id => id !== i.id) : [...(s.ingredientIds ?? []), i.id] }) })} />)}</Chips></>}
    <RecipePhoto label={t("stepNumber", { n: index + 1 })} value={step.photo} disabled={disabled} onBusy={onBusy} onChange={photo => edit({ steps: d.steps.map(s => s.id === step.id ? { ...s, photo } : s) })} />
  </View>)}<View style={{ alignSelf: "flex-start" }}><Button label={t("addStep")} icon="add" variant="link" disabled={disabled || d.steps.length >= 30} onPress={() => edit({ steps: [...d.steps, { id: localId("step"), title: "", instruction: "", minutes: "" }] })} /></View></>;
}
