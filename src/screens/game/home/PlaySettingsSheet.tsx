import type { ReactNode } from "react";
import { View } from "react-native";
import { Row } from "../../../components/PreferenceControls";
import { T } from "../../../components/ui";
import { gameStill, type PlaySettings } from "../../../game/settings";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Seg } from "./bits";
import { useT } from "../../../i18n";

/** Play your way (GAME_PLAN §12.2): one sheet from the café and from the game's pause menu. Changes apply at once. */
export function PlaySettingsSheet({ settings, onChange, onClose }: { settings: PlaySettings; onChange(next: PlaySettings): void; onClose(): void }) {
  const { appReducedMotion } = usePreferences(), t = useT("game");
  const put = <K extends keyof PlaySettings>(key: K, value: PlaySettings[K]) => onChange({ ...settings, [key]: value });
  return <GameSheet title={t("playYourWay")} onClose={onClose}>
    <Section title={t("sound")}>
      <Row label={t("soundEffects")} value={settings.sound} onToggle={v => put("sound", v)} />
      <Row label={t("cafeMusic")} value={settings.music} onToggle={v => put("music", v)} />
      <Row label={t("haptics")} value={settings.haptics} onToggle={v => put("haptics", v)} />
      <Row label={t("soundCaptions")} value={settings.captions} onToggle={v => put("captions", v)} />
    </Section>
    <Section title={t("controls")}>
      <Choice label={t("burner")}><Seg label={t("burner")} value={settings.burner} onChange={v => put("burner", v)} options={[["toggle", t("burnerToggle")], ["hold", t("burnerHold")]]} /></Choice>
      {__DEV__ && <Choice label={t("heatPrototype")}><Seg label={t("heat")} value={settings.heat} onChange={v => put("heat", v)} options={[["classic", t("heatClassic")], ["knob", t("heatKnob")]]} /></Choice>}
      {__DEV__ && settings.heat === "knob" && <Row label={t("knobAssist")} value={settings.knobAssist} onToggle={v => put("knobAssist", v)} />}
    </Section>
    <Section title={t("help")}>
      <Choice label={t("pace")}><Seg label={t("pace")} value={settings.pace} onChange={v => put("pace", v)} options={[["normal", t("paceNormal")], ["relaxed", t("paceRelaxed")], ["slow", t("paceSlow")]]} /></Choice>
      <Choice label={t("hints")}><Seg label={t("hints")} value={settings.hints} onChange={v => put("hints", v)} options={[["level", t("hintsAsTaught")], ["always", t("hintsAlways")], ["off", t("hintsOff")]]} /></Choice>
    </Section>
    <Section title={t("display")}>
      <Choice label={t("textSize")}><Seg label={t("textSize")} value={settings.text} onChange={v => put("text", v)}
        options={[["app", t("textApp")], ["standard", t("textStandard")], ["large", t("textLarge")], ["largest", t("textLargest")]]} /></Choice>
      <Row label={t("reduceMotion")} value={gameStill(settings, appReducedMotion)} onToggle={v => put("motion", v ? "reduced" : "full")} />
    </Section>
  </GameSheet>;
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ gap: 6 }}><T variant="small" muted style={{ fontWeight: "800" }}>{label}</T>{children}</View>;
}
