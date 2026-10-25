import { useState } from "react";
import { PreferenceSaveStatus } from "../../components/AutosaveStatus";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { Chips, Chip } from "../../components/food/Controls";
import { ExclusionPicker } from "../../components/food/ExclusionPicker";
import { dietLabels, toggleLabel } from "../../config/diet-labels";
import { DietIcon } from "../../components/food/DietIcon";
import { useDietText } from "../../components/food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { goBack } from "../../utils/navigation";
import { useT } from "../../i18n";

export function FoodChoicesScreen({ onboarding = false }: { onboarding?: boolean }) {
  const { draft, patch, save, storageReady, theme } = usePreferences(), dietText = useDietText(), t = useT("me"), tc = useT("common");
  const { patchDocument } = useFood();
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    setBusy(true);
    try {
      if (await save()) {
        if (!onboarding || await patchDocument({ onboardingDone: true })) goBack();
      }
    } finally { setBusy(false); }
  };
  return <Screen title={onboarding ? t("yourFoodChoices") : t("foodChoices")} >
    <PreferenceSaveStatus />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">{t("eatingStyleTitle")}</T>
      <Chips multiple label={t("eatingStyle")}>{dietLabels.map(label => { const selected = draft.diets.includes(label);
        return <Chip key={label} label={dietText.name(label)} role="checkbox" selected={selected} leading={<DietIcon diet={label} color={selected ? theme.accent : theme.foreground} />}
          onPress={() => patch({ diets: toggleLabel(draft.diets, label) })} />; })}</Chips>
    </Card>
    <Card><ExclusionPicker value={draft.excluded} onChange={excluded => patch({ excluded })} /></Card>
    {onboarding && <Button label={tc("continue")} onPress={() => void apply()} loading={busy} disabled={!storageReady} />}
    {onboarding && <Button label={t("skipForNow")} variant="link" onPress={() => void patchDocument({ onboardingDone: true }).then(okay => { if (okay) goBack(); })} />}
  </Screen>;
}
