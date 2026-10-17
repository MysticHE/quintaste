import { Screen } from "../components/Screen";
import { Appearance, Choices, Row } from "../components/PreferenceControls";
import { Card, Divider, T, common } from "../components/ui";
import { PreferenceSaveStatus } from "../components/AutosaveStatus";
import { usePreferences } from "../state/Preferences";
export function SettingsScreen() {
  return <Screen title="Appearance">
    <PreferenceSaveStatus />
    <Card><Appearance /></Card>
  </Screen>;
}
export function AccessibilityScreen() {
  const { draft, patch } = usePreferences();
  return (
    <Screen
      title="Accessibility"

    >
      <PreferenceSaveStatus />
      <Card>
        <T style={[common.bold, common.section]}>Text Size</T>
        <Choices
          label="Text Size"
          options={["system", "large", "larger"] as const}
          value={draft.textSize}
          onChange={(textSize) => patch({ textSize })}
        />
        <Divider />
        <Row
          label="Reduce Motion" icon="play-skip-forward-outline"
          value={draft.reduceMotion}
          onToggle={(reduceMotion) => patch({ reduceMotion })}
        />
        <Divider />
        <Row
          label="Screen-Reader Hints" icon="chatbox-ellipses-outline"
          value={draft.readerHints}
          onToggle={(readerHints) => patch({ readerHints })}
        />
      </Card>

    </Screen>
  );
}
