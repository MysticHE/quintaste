import { Screen } from "../components/Screen";
import { Appearance, Choices, Row } from "../components/PreferenceControls";
import { Card, Divider, Icon, T, common } from "../components/ui";
import { PreferenceSaveStatus, PreferenceSavingIndicator } from "../components/AutosaveStatus";
import { usePreferences } from "../state/Preferences";
import { Pressable, StyleSheet, View } from "react-native";
import { languageChoices, type LanguageChoice } from "../config/preferences";
import { systemLanguage, useLanguageChoice, useT } from "../i18n";

/** Each language is named in its own script, so it can be found from either side. */
const languageNames = { en: "English", zh: "简体中文" } as const;
/** The Me row's value: "English", "简体中文", or "Same as phone". */
export function useLanguageName(choice: LanguageChoice) {
  const t = useT("common");
  return choice === "system" ? t("languageSystem") : languageNames[choice];
}
export function LanguageScreen() {
  const { theme } = usePreferences(), { choice: current, setChoice } = useLanguageChoice(), t = useT("common");
  return <Screen title={t("language")}>
    <Card style={s.list}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("language")}>
        {languageChoices.map((choice, index) => {
          const selected = current === choice;
          return <View key={choice}>{index > 0 && <Divider />}<Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
            onPress={() => setChoice(choice)}
            style={({ pressed }) => [s.option, pressed && { backgroundColor: theme.accentSoft }]}>
            <View style={common.flex}>
              <T style={common.bold}>{choice === "system" ? t("languageSystem") : languageNames[choice]}</T>
              {choice === "system" && <T variant="small" muted>{t("languageSystemNote", { name: languageNames[systemLanguage()] })}</T>}
            </View>
            <Icon name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={selected ? theme.accent : theme.mutedForeground} />
          </Pressable></View>;
        })}
      </View>
    </Card>
    <T variant="small" muted style={s.note}>{t("languageNote")}</T>
  </Screen>;
}
const s = StyleSheet.create({
  list: { paddingVertical: 0, paddingHorizontal: 0, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
  note: { paddingHorizontal: 4 },
});
export function SettingsScreen() {
  const t = useT("me");
  return <Screen title={t("appearance")} headerAction={<PreferenceSavingIndicator />}>
    <PreferenceSaveStatus />
    <Card><Appearance /></Card>
  </Screen>;
}
export function AccessibilityScreen() {
  const { draft, patch } = usePreferences(), t = useT("me");
  return (
    <Screen
      title={t("accessibility")}
      headerAction={<PreferenceSavingIndicator />}
    >
      <PreferenceSaveStatus />
      <Card>
        <T style={[common.bold, common.section]}>{t("textSize")}</T>
        <Choices
          label={t("textSize")}
          options={["system", "large", "larger"] as const}
          labels={{ system: t("textSystem"), large: t("textLarge"), larger: t("textLarger") }}
          value={draft.textSize}
          onChange={(textSize) => patch({ textSize })}
        />
        <Divider />
        <Row
          label={t("reduceMotion")} icon="play-skip-forward-outline"
          value={draft.reduceMotion}
          onToggle={(reduceMotion) => patch({ reduceMotion })}
        />
        <Divider />
        <Row
          label={t("sounds")} icon="volume-high-outline"
          value={draft.sounds}
          onToggle={(sounds) => patch({ sounds })}
        />
        <Divider />
        <Row
          label={t("readerHints")} icon="chatbox-ellipses-outline"
          value={draft.readerHints}
          onToggle={(readerHints) => patch({ readerHints })}
        />
      </Card>

    </Screen>
  );
}
