import { useState } from "react";
import { PreferenceSaveStatus } from "../../components/AutosaveStatus";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { Chips, Chip } from "../../components/food/Controls";
import { ExclusionPicker } from "../../components/food/ExclusionPicker";
import { dietLabels, toggleLabel } from "../../config/diet-labels";
import { DietIcon } from "../../components/food/DietIcon";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { goBack } from "../../utils/navigation";

export function FoodChoicesScreen({ onboarding = false }: { onboarding?: boolean }) {
  const { draft, patch, save, storageReady, theme } = usePreferences();
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
  return <Screen title={onboarding ? "Your Food Choices" : "Food Choices"} >
    <PreferenceSaveStatus />
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Eating Style</T>
      <Chips multiple label="Eating style">{dietLabels.map(label => { const selected = draft.diets.includes(label);
        return <Chip key={label} label={label} role="checkbox" selected={selected} leading={<DietIcon diet={label} color={selected ? theme.accent : theme.foreground} />}
          onPress={() => patch({ diets: toggleLabel(draft.diets, label) })} />; })}</Chips>
</Card>
    <Card><ExclusionPicker value={draft.excluded} onChange={excluded => patch({ excluded })} /></Card>
    {onboarding && <Button label="Continue" onPress={() => void apply()} loading={busy} disabled={!storageReady} />}
    {onboarding && <Button label="Skip For Now" variant="link" onPress={() => void patchDocument({ onboardingDone: true }).then(okay => { if (okay) goBack(); })} />}
  </Screen>;
}
