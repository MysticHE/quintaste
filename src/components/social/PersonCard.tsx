import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Icon, T, common } from "../ui";
import { StatusPill } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useT } from "../../i18n";
import type { Person } from "../../types/community";
import { Face } from "./Face";
import { openSocial } from "./Shared";
import { useDietSummary } from "./MeetUI";

/** Attendance as the trust signal: tables and no-shows, or New member before the first table. */
export function Reliability({ tables, noShows }: { tables: number; noShows: number }) {
  const { theme } = usePreferences(), t = useT("social");
  if (!tables) return <View style={{ alignSelf: "flex-start" }}><StatusPill label={t("newMember")} tone="warning" /></View>;
  return <View style={[common.row, { gap: 4 }]}>
    <Icon name="checkmark-circle" size={14} color={theme.success} />
    <T variant="small" muted>{t("reliability", { tables, noShows })}</T>
  </View>;
}
export function InCommon({ items, max = 2 }: { items: string[]; max?: number }) {
  if (!items.length) return null;
  return <View style={s.chips}>{items.slice(0, max).map(item => <StatusPill key={item} label={"✓ " + item} tone="success" lines={2} />)}</View>;
}
/** A face, a reason and something in common; the card opens the person, Invite opens the invitation sheet. */
/** Without `onInvite` (your own preview) the card has no actions. */
export function PersonCard({ person: p, common: shared, onInvite, onKaki }: { person: Person; common: string[]; onInvite?: () => void; onKaki?: () => void }) {
  const { focused, focusProps } = useKeyboardFocus(), { theme } = usePreferences(), prompt = p.prompts[0], t = useT("social"), dietSummary = useDietSummary();
  const hereFor = t("optHereFor", { value: p.hereFor }), religion = p.religion ? t("optReligion", { value: p.religion }) : "";
  const facts = [p.area, dietSummary(p.diets), p.cooked ? t("cooked", { n: p.cooked }) : ""].filter(Boolean);
  const label = [p.firstName, p.age, hereFor, religion, prompt?.a, ...shared.slice(0, 2)].filter(Boolean).join(", ");
  return <Card style={{ gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => openSocial("/person/" + p.id)} {...focusProps}
      style={({ pressed }) => [{ gap: 10, opacity: pressed ? 0.85 : 1, borderRadius: 12 }, focused && { outlineWidth: 2, outlineColor: theme.accent, outlineStyle: "solid", outlineOffset: 2 }]}>
      <View style={[common.row, { gap: 12, alignItems: "flex-start" }]}>
        <Face id={p.id} name={p.firstName} hasFace={p.hasFace} size={64} />
        <View style={[common.flex, { gap: 6, minWidth: 0 }]}>
          <T variant="subtitle" numberOfLines={1}>{p.firstName + (p.age ? ", " + p.age : "")}</T>
          <View style={s.chips}><StatusPill label={hereFor} tone="accent" />{!!religion && <StatusPill label={religion} />}</View>
          <Reliability tables={p.tables} noShows={p.noShows} />
        </View>
      </View>
      {prompt && <View><T variant="small" muted style={common.bold}>{t("optPrompt", { value: prompt.q })}</T><T style={common.bold} numberOfLines={2}>{"“" + prompt.a + "”"}</T></View>}
      <InCommon items={shared} />
      <T variant="small" muted numberOfLines={1}>{facts.join(" · ")}</T>
    </Pressable>
    {onInvite && <View style={[common.row, { gap: 8 }]}>
      <View style={common.flex}><Button label={t("inviteToTable")} onPress={onInvite} /></View>
      {onKaki && <Button label={t("kaki")} icon="person-add-outline" variant="secondary" accessibilityLabel={t("bringKakiTo", { name: p.firstName })} onPress={onKaki} />}
    </View>}
  </Card>;
}
const s = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 } });
