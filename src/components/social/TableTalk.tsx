import { View } from "react-native";
import { Icon, T, common } from "../ui";
import { Chip, HorizontalChips } from "../food/Controls";
import { usePreferences } from "../../state/Preferences";
import type { Group } from "../../types/community";

/** Questions from tablemates' own prompts and reasons for eating plant-based. Tapping one fills the message; nothing is sent by itself. */
export function tableTalk(g: Group) {
  const out: string[] = [];
  for (const m of g.members) {
    if (m.isMe || m.status !== "accepted") continue;
    const prompt = m.prompts?.[0];
    if (prompt) out.push(`${m.name}, tell me more about “${prompt.a}”`);
    if (m.why?.length) out.push(`${m.name}, what made you go plant-based?`);
  }
  return out.slice(0, 6);
}
export function TableTalk({ group, onPick }: { group: Group; onPick: (text: string) => void }) {
  const { theme } = usePreferences(), questions = tableTalk(group);
  if (!questions.length) return null;
  return <View style={{ gap: 6 }}>
    <View style={[common.row, { gap: 6 }]}><Icon name="sparkles-outline" size={16} color={theme.accent} /><T variant="small" style={common.bold}>Table talk</T></View>
    <HorizontalChips>{questions.map(q => <Chip key={q} label={q} compact style={{ maxWidth: 260 }} onPress={() => onPick(q)} />)}</HorizontalChips>
  </View>;
}
