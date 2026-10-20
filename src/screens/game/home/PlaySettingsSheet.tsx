import type { ReactNode } from "react";
import { View } from "react-native";
import { Row } from "../../../components/PreferenceControls";
import { T } from "../../../components/ui";
import { gameStill, type PlaySettings } from "../../../game/settings";
import { usePreferences } from "../../../state/Preferences";
import { GameSheet, Section } from "./GameSheet";
import { Seg } from "./bits";

/** Play your way (GAME_PLAN §12.2): one sheet from the café and from the game's pause menu. Changes apply at once. */
export function PlaySettingsSheet({ settings, onChange, onClose }: { settings: PlaySettings; onChange(next: PlaySettings): void; onClose(): void }) {
  const { appReducedMotion } = usePreferences();
  const put = <K extends keyof PlaySettings>(key: K, value: PlaySettings[K]) => onChange({ ...settings, [key]: value });
  return <GameSheet title="Play your way" onClose={onClose}>
    <Section title="Sound">
      <Row label="Sound effects" value={settings.sound} onToggle={v => put("sound", v)} />
      <Row label="Café music" value={settings.music} onToggle={v => put("music", v)} />
      <Row label="Haptics" value={settings.haptics} onToggle={v => put("haptics", v)} />
      <Row label="Sound captions" value={settings.captions} onToggle={v => put("captions", v)} />
    </Section>
    <Section title="Controls">
      <Choice label="Burner"><Seg label="Burner" value={settings.burner} onChange={v => put("burner", v)} options={[["toggle", "Tap on and off"], ["hold", "Hold to heat"]]} /></Choice>
    </Section>
    <Section title="Help">
      <Choice label="Pace"><Seg label="Pace" value={settings.pace} onChange={v => put("pace", v)} options={[["normal", "Normal"], ["relaxed", "Relaxed"], ["slow", "Slow"]]} /></Choice>
      <Choice label="Hints"><Seg label="Hints" value={settings.hints} onChange={v => put("hints", v)} options={[["level", "As taught"], ["always", "Always"], ["off", "Off"]]} /></Choice>
    </Section>
    <Section title="Display">
      <Choice label="Text size"><Seg label="Text size" value={settings.text} onChange={v => put("text", v)}
        options={[["app", "App"], ["standard", "Standard"], ["large", "Large"], ["largest", "Largest"]]} /></Choice>
      <Row label="Reduce motion" value={gameStill(settings, appReducedMotion)} onToggle={v => put("motion", v ? "reduced" : "full")} />
    </Section>
  </GameSheet>;
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return <View style={{ gap: 6 }}><T variant="small" muted style={{ fontWeight: "800" }}>{label}</T>{children}</View>;
}
