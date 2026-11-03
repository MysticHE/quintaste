import { Platform, View } from "react-native";
import type { Ingredient } from "../../types/food";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { ingredientLine } from "../../utils/food-format";
import { TimerAlertControl } from "../food/TimerAlertControl";
import { Card, T } from "../ui";
import { Sheet } from "../Sheet";
import { Servings } from "../food/Controls";
import { CheckRow } from "./CheckRow";
import { SwapButton, UndoLink, swapView, type IngredientSwaps } from "./IngredientList";
import { shortName } from "../../utils/swaps";
import { useLanguage, useT } from "../../i18n";

type Line = Pick<Ingredient, "id" | "name" | "amount" | "unit">;
/** One tick row; with `swaps` it shows the member's swap ("Instead of …" and Undo) or the swap button, as on the recipe page. */
function IngredientCheck({ original, scale, checked, onToggle, disabled, swaps }: {
  original: Line; scale: number; checked: boolean; onToggle: () => void; disabled: boolean; swaps?: IngredientSwaps;
}) {
  const t = useT("cook"), language = useLanguage(), { item, swap, left, offered } = swapView(original, swaps), line = ingredientLine(item, scale, language);
  const caption = swap ? (left ? t("leftOut") : t("insteadOf", { name: shortName(swap.original) })) : undefined;
  const trailing = swap && swaps ? <UndoLink name={swap.original} onPress={() => swaps.onUndo(original.id)} />
    : offered && swaps ? <SwapButton name={original.name} onPress={() => swaps.onOpen(original.id)} /> : undefined;
  return <CheckRow strike lead={line.lead} label={line.rest} spoken={line.spoken} caption={caption} checked={checked || left} disabled={disabled || left}
    onPress={onToggle} trailing={trailing} />;
}
/** Mise en place: every scaled ingredient as a large tick target; ticking is optional and never blocks cooking. */
export function GatherList({ ingredients, scale, checked, onToggle, disabled, swaps }: {
  ingredients: Line[]; scale: number; checked: string[]; onToggle: (id: string) => void; disabled: boolean; swaps?: IngredientSwaps;
}) {
  // A line the member left out is neither needed nor counted.
  const needed = ingredients.filter(item => !swaps?.chosen.get(item.id)?.option.leave), t = useT("cook");
  const ready = needed.filter(item => checked.includes(item.id)).length;
  return <View style={{ gap: 2 }}>
    <T variant="small" muted accessibilityLiveRegion="polite">{t("readyCount", { ready, total: needed.length })}</T>
    {ingredients.map(item => <IngredientCheck key={item.id} original={item} scale={scale} checked={checked.includes(item.id)} disabled={disabled}
      onToggle={() => onToggle(item.id)} swaps={swaps} />)}
  </View>;
}
/** Ingredients this step uses, with the same one tick per ingredient as the gather list and the ingredients sheet. */
export function StepChecklist({ ingredients, ids, scale, checked, onToggle, disabled, swaps }: {
  ingredients: Line[]; ids: string[]; scale: number; checked: string[]; onToggle: (id: string) => void; disabled: boolean; swaps?: IngredientSwaps;
}) {
  const lines = ids.map(id => ingredients.find(item => item.id === id)).filter((item): item is Line => !!item), t = useT("cook");
  if (!lines.length) return null;
  return <View style={{ gap: 2 }}>
    <T variant="small" muted accessibilityRole="header">{t("forThisStep")}</T>
    {lines.map(item => <IngredientCheck key={item.id} original={item} scale={scale} checked={checked.includes(item.id)} disabled={disabled}
      onToggle={() => onToggle(item.id)} swaps={swaps} />)}
  </View>;
}
/** Cook mode's ingredients sheet: servings and every ingredient, with the same ticks as the step lists. */
export function IngredientSheet({ visible, onClose, ingredients, scale, servings, onServings, ticked, onToggle, disabled, swaps }: {
  visible: boolean; onClose: () => void; ingredients: Line[]; scale: number; servings: number; onServings: (value: number) => void;
  ticked: string[]; onToggle: (id: string) => void; disabled: boolean; swaps?: IngredientSwaps;
}) {
  const t = useT("cook");
  return <Sheet visible={visible} onClose={onClose} title={t("ingredients")}>
    <Servings value={servings} onChange={onServings} />
    <GatherList ingredients={ingredients} scale={scale} checked={ticked} onToggle={onToggle} disabled={disabled} swaps={swaps} />
  </Sheet>;
}
/** Offered where a timer starts, so alerts are a choice made in context rather than buried in settings. */
export function TimerAlertOffer() {
  const alerts = useTimerAlerts(), t = useT("cook");
  if (Platform.OS === "web" || alerts.enabled) return null;
  return <Card><TimerAlertControl label={t("alertWhenEnds")} /></Card>;
}
