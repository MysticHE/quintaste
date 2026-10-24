import { Pressable, StyleSheet, Switch, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { palettes, displayModes, type Palette } from "../config/preferences";
import { usePreferences } from "../state/Preferences";
import { fontNames, themeFor } from "../theme/tokens";
import { titleCaseLabel } from "../utils/ui-label";
import { Divider, Icon, T, common, type IconName } from "./ui";
import { useT } from "../i18n";
export function Row({
  label,
  hint,
  icon,
  onPress,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  hint?: string;
  icon?: IconName;
  onPress?: () => void;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { theme, draft } = usePreferences();
  const content = (
    <>
      {icon && <Icon name={icon} color={theme.accent} />}
      <View style={common.flex}>
        <T style={common.bold}>{label}</T>
        {hint && (
          <T variant="small" muted style={s.hint}>
            {hint}
          </T>
        )}
      </View>
      {onToggle ? (
        <Switch
          accessibilityLabel={label}
          accessibilityHint={draft.readerHints ? hint : undefined}
          value={value}
          disabled={disabled}
          onValueChange={onToggle}
          trackColor={{ false: theme.mutedForeground, true: theme.action[0] }}
          thumbColor={theme.actionForeground}
        />
      ) : onPress ? (
        <Icon name="chevron-forward" size={18} />
      ) : null}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={draft.readerHints ? hint : undefined}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={s.row}>{content}</View>
  );
}
export function Choices<T extends string>({
  options,
  value,
  onChange,
  label,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Translated text for each option; options without one show their value in Title Case. */
  labels?: Partial<Record<T, string>>;
}) {
  const { theme } = usePreferences();
  const text = (option: T) => labels?.[option] ?? titleCaseLabel(option);
  return (
    <View
      style={s.choices}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="radio"
          accessibilityLabel={text(option)}
          accessibilityState={{ checked: value === option }}
          aria-checked={value === option}
          onPress={() => onChange(option)}
          style={[
            s.choice,
            {
              backgroundColor:
                value === option ? theme.accentSoft : theme.muted,
              borderColor: value === option ? theme.accent : theme.transparent,
            },
          ]}
        >
          <T variant="button" color={theme.foreground} style={{ flexShrink: 1 }}>
            {text(option)}
          </T>
          {value === option && <Icon name="checkmark" size={16} color={theme.accent} />}
        </Pressable>
      ))}
    </View>
  );
}
export function Appearance() {
  const { draft, patch, theme } = usePreferences(), t = useT("me");
  const names = {
    coral: t("paletteCoral"),
    cobalt: t("paletteCobalt"),
    lavender: t("paletteLavender"),
  };
  return (
    <>
      <T style={common.bold}>{t("colourPalette")}</T>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("colourPalette")}>
        {palettes.map((palette, i) => (
          <View key={palette}>
            {i > 0 && <Divider />}
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={names[palette]}
              accessibilityState={{ checked: draft.palette === palette }}
              aria-checked={draft.palette === palette}
              onPress={() => patch({ palette })}
              style={s.row}
            >
              <PaletteSample palette={palette} dark={theme.dark} />
              <T style={[common.flex, { fontFamily: fontNames.bold }]}>
                {names[palette]}
              </T>
              <Icon
                name={
                  draft.palette === palette
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                color={
                  draft.palette === palette
                    ? theme.accent
                    : theme.mutedForeground
                }
              />
            </Pressable>
          </View>
        ))}
      </View>
      <T style={[common.bold, common.section]}>{t("displayMode")}</T>
      <Choices
        label={t("displayMode")}
        options={displayModes}
        labels={{ light: t("modeLight"), dark: t("modeDark"), system: t("modeSystem") }}
        value={draft.mode}
        onChange={(mode) => patch({ mode })}
      />
    </>
  );
}
const s = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 4,
  },
  hint: { marginTop: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 48,
    minWidth: 80,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
  },
  sample: { width: 52, height: 36, borderRadius: 10, borderWidth: 1, padding: 6, justifyContent: "flex-end" },
  sampleCard: { height: 14, borderRadius: 5, justifyContent: "center", paddingLeft: 4 },
  sampleDot: { width: 8, height: 8, borderRadius: 4 },
});
/** A small preview of the palette as it will look: its backdrop, a card and the accent on top. */
function PaletteSample({ palette, dark }: { palette: Palette; dark: boolean }) {
  const preview = themeFor(palette, dark);
  return <LinearGradient colors={preview.backdrop} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.sample, { borderColor: preview.border }]}>
    <View style={[s.sampleCard, { backgroundColor: preview.card }]}><View style={[s.sampleDot, { backgroundColor: preview.accent }]} /></View>
  </LinearGradient>;
}
