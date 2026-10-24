import { Platform, View } from "react-native";
import type { Ingredient } from "../../types/food";
import { useTimerAlerts } from "../../state/TimerAlerts";
import { ingredientLine } from "../../utils/food-format";
import { TimerAlertControl } from "../food/TimerAlertControl";
import { Card, T } from "../ui";
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
      return <CheckRow key={item.id} size="large" strike label={line.text} spoken={line.spoken} checked={checked.includes(item.id)} disabled={disabled} onPress={() => onToggle(item.id)} />;
    })}
  </View>;
}
/** Ingredients this step uses, ticked as they go in; keyed per step because one ingredient can be split across steps. */
export function StepChecklist({ ingredients, ids, step, scale, used, onToggle, disabled }: {
  ingredients: Line[]; ids: string[]; step: number; scale: number; used: string[]; onToggle: (key: string) => void; disabled: boolean;
}) {
  const lines = ids.map(id => ingredients.find(item => item.id === id)).filter((item): item is Line => !!item), t = useT("cook"), language = useLanguage();
  if (!lines.length) return null;
  return <View style={{ gap: 2 }}>
    <T variant="small" muted accessibilityRole="header">{t("forThisStep")}</T>
    {lines.map(item => {
      const line = ingredientLine(item, scale, language), key = step + ":" + item.id;
      return <CheckRow key={key} size="large" strike label={line.text} spoken={line.spoken} checked={used.includes(key)} disabled={disabled} onPress={() => onToggle(key)} />;
    })}
  </View>;
}
/** Offered where a timer starts, so alerts are a choice made in context rather than buried in settings. */
export function TimerAlertOffer() {
  const alerts = useTimerAlerts(), t = useT("cook");
  if (Platform.OS === "web" || alerts.enabled) return null;
  return <Card><TimerAlertControl label={t("alertWhenEnds")} /></Card>;
}
