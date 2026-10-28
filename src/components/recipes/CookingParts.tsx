import { Platform, View } from "react-native";
import type { Ingredient } from "../../types/food";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { ingredientLine } from "../../utils/food-format";
import { TimerAlertControl } from "../food/TimerAlertControl";
import { Card, T } from "../ui";
import { Sheet } from "../Sheet";
import { Servings } from "../food/Controls";
import { CheckRow } from "./CheckRow";
import { useLanguage, useT } from "../../i18n";

type Line = Pick<Ingredient, "id" | "name" | "amount" | "unit">;
/** Mise en place: every scaled ingredient as a large tick target; ticking is optional and never blocks cooking. */
export function GatherList({ ingredients, scale, checked, onToggle, disabled }: {
  ingredients: Line[]; scale: number; checked: string[]; onToggle: (id: string) => void; disabled: boolean;
}) {
  const ready = ingredients.filter(item => checked.includes(item.id)).length, t = useT("cook"), language = useLanguage();
  return <View style={{ gap: 2 }}>
    <T variant="small" muted accessibilityLiveRegion="polite">{t("readyCount", { ready, total: ingredients.length })}</T>
    {ingredients.map(item => {
      const line = ingredientLine(item, scale, language);
      return <CheckRow key={item.id} strike lead={line.lead} label={line.rest} spoken={line.spoken} checked={checked.includes(item.id)} disabled={disabled} onPress={() => onToggle(item.id)} />;
    })}
  </View>;
}
/** Ingredients this step uses, with the same one tick per ingredient as the gather list and the ingredients sheet. */
export function StepChecklist({ ingredients, ids, scale, checked, onToggle, disabled }: {
  ingredients: Line[]; ids: string[]; scale: number; checked: string[]; onToggle: (id: string) => void; disabled: boolean;
}) {
  const lines = ids.map(id => ingredients.find(item => item.id === id)).filter((item): item is Line => !!item), t = useT("cook"), language = useLanguage();
  if (!lines.length) return null;
  return <View style={{ gap: 2 }}>
    <T variant="small" muted accessibilityRole="header">{t("forThisStep")}</T>
    {lines.map(item => {
      const line = ingredientLine(item, scale, language);
      return <CheckRow key={item.id} strike lead={line.lead} label={line.rest} spoken={line.spoken} checked={checked.includes(item.id)} disabled={disabled} onPress={() => onToggle(item.id)} />;
    })}
  </View>;
}
/** Cook mode's ingredients sheet: servings and every ingredient, with the same ticks as the step lists. */
export function IngredientSheet({ visible, onClose, ingredients, scale, servings, onServings, ticked, onToggle, disabled }: {
  visible: boolean; onClose: () => void; ingredients: Line[]; scale: number; servings: number; onServings: (value: number) => void;
  ticked: string[]; onToggle: (id: string) => void; disabled: boolean;
}) {
  const t = useT("cook");
  return <Sheet visible={visible} onClose={onClose} title={t("ingredients")}>
    <Servings value={servings} onChange={onServings} />
    <GatherList ingredients={ingredients} scale={scale} checked={ticked} onToggle={onToggle} disabled={disabled} />
  </Sheet>;
}
/** Offered where a timer starts, so alerts are a choice made in context rather than buried in settings. */
export function TimerAlertOffer() {
  const alerts = useTimerAlerts(), t = useT("cook");
  if (Platform.OS === "web" || alerts.enabled) return null;
  return <Card><TimerAlertControl label={t("alertWhenEnds")} /></Card>;
}
