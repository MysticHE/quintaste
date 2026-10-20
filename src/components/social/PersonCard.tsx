import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Icon, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { dietSummary } from "../../config/preferences";
import { hereForLabel } from "../../config/social-profile";
import type { Person } from "../../types/community";
import { Face } from "./Face";
import { openSocial } from "./Shared";

/** Attendance as the trust signal: tables and no-shows, or New member before the first table. */
export function Reliability({ tables, noShows }: { tables: number; noShows: number }) {
  const { theme } = usePreferences();
  if (!tables) return <View style={{ alignSelf: "flex-start" }}><StatusPill label="New member" tone="warning" /></View>;
  return <View style={[common.row, { gap: 4 }]}>
    <Icon name="checkmark-circle" size={14} color={theme.success} />
    <T variant="small" muted>{tables + (tables === 1 ? " table · " : " tables · ") + noShows + (noShows === 1 ? " no-show" : " no-shows")}</T>
  </View>;
}
export function InCommon({ items, max = 2 }: { items: string[]; max?: number }) {
  if (!items.length) return null;
  return <View style={s.chips}>{items.slice(0, max).map(item => <StatusPill key={item} label={"✓ " + item} tone="success" lines={2} />)}</View>;
}
/** A face, a reason and something in common; the card opens the person, Invite opens the invitation sheet. */
/** Without `onInvite` (your own preview) the card has no actions. */
export function PersonCard({ person: p, common: shared, onInvite, onKaki }: { person: Person; common: string[]; onInvite?: () => void; onKaki?: () => void }) {
  const { focused, focusProps } = useKeyboardFocus(), { theme } = usePreferences(), prompt = p.prompts[0];
  const facts = [p.area, dietSummary(p.diets), p.cooked ? "Cooked " + p.cooked : ""].filter(Boolean);
  const label = [p.firstName, p.age, hereForLabel(p.hereFor), p.religion, prompt?.a, ...shared.slice(0, 2)].filter(Boolean).join(", ");
  return <Card style={{ gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => openSocial("/person/" + p.id)} {...focusProps}
      style={({ pressed }) => [{ gap: 10, opacity: pressed ? 0.85 : 1, borderRadius: 12 }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid", outlineOffset: 2 }]}>
      <View style={[common.row, { gap: 12, alignItems: "flex-start" }]}>
        <Face id={p.id} name={p.firstName} hasFace={p.hasFace} size={64} />
        <View style={[common.flex, { gap: 6, minWidth: 0 }]}>
          <T variant="subtitle" numberOfLines={1}>{p.firstName + (p.age ? ", " + p.age : "")}</T>
          <View style={s.chips}><StatusPill label={hereForLabel(p.hereFor)} tone="accent" />{!!p.religion && <StatusPill label={p.religion} />}</View>
          <Reliability tables={p.tables} noShows={p.noShows} />
        </View>
      </View>
      {prompt && <View><T variant="small" muted style={common.bold}>{prompt.q}</T><T style={common.bold} numberOfLines={2}>{"“" + prompt.a + "”"}</T></View>}
      <InCommon items={shared} />
      <T variant="small" muted numberOfLines={1}>{facts.join(" · ")}</T>
    </Pressable>
    {onInvite && <View style={[common.row, { gap: 8 }]}>
      <View style={common.flex}><Button label="Invite To A Table" onPress={onInvite} /></View>
      {onKaki && <Button label="Kaki" icon="person-add-outline" variant="secondary" accessibilityLabel={"Bring a kaki to meet " + p.firstName} onPress={onKaki} />}
    </View>}
  </Card>;
}
const s = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 } });
