import { useState } from "react";
import { PreferenceSaveStatus } from "../../components/AutosaveStatus";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { Chips, Chip } from "../../components/food/Controls";
import { ExclusionPicker } from "../../components/food/ExclusionPicker";
import { diets } from "../../config/preferences";
import { usePreferences } from "../../state/Preferences";
import { useFood } from "../../state/Food";
import { goBack } from "../../utils/navigation";

export function FoodChoicesScreen({ onboarding = false }: { onboarding?: boolean }) {
  const { draft, patch, save, storageReady } = usePreferences();
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
      <Chips>{diets.map(diet => <Chip key={diet} label={diet === "Plant-based" ? "Plant-Based" : diet} role="radio" selected={draft.diet === diet} onPress={() => patch({ diet })} />)}</Chips>
</Card>
    <Card><ExclusionPicker value={draft.excluded} onChange={excluded => patch({ excluded })} /></Card>
    {onboarding && <Button label="Continue" onPress={() => void apply()} loading={busy} disabled={!storageReady} />}
    {onboarding && <Button label="Skip For Now" variant="link" onPress={() => void patchDocument({ onboardingDone: true }).then(okay => { if (okay) goBack(); })} />}
  </Screen>;
}
