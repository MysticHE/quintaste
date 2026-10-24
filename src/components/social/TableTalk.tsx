import { View } from "react-native";
import { Icon, T, common } from "../ui";
import { Chip, HorizontalChips } from "../food/Controls";
import { usePreferences } from "../../state/Preferences";
import type { Group } from "../../types/community";
import { translate, useLanguage, useT, type Language } from "../../i18n";

/** Questions from tablemates' own prompts and reasons for eating plant-based. Tapping one fills the message; nothing is sent by itself. */
export function tableTalk(g: Group, language: Language = "en") {
  const out: string[] = [];
  for (const m of g.members) {
    if (m.isMe || m.status !== "accepted") continue;
    const prompt = m.prompts?.[0];
    if (prompt) out.push(translate(language, "social", "talkAbout", { name: m.name, answer: prompt.a }));
    if (m.why?.length) out.push(translate(language, "social", "talkWhy", { name: m.name }));
  }
  return out.slice(0, 6);
}
export function TableTalk({ group, onPick }: { group: Group; onPick: (text: string) => void }) {
  const { theme } = usePreferences(), t = useT("social"), questions = tableTalk(group, useLanguage());
  if (!questions.length) return null;
  return <View style={{ gap: 6 }}>
    <View style={[common.row, { gap: 6 }]}><Icon name="sparkles-outline" size={16} color={theme.accent} /><T variant="small" style={common.bold}>{t("tableTalk")}</T></View>
    <HorizontalChips>{questions.map(q => <Chip key={q} label={q} compact style={{ maxWidth: 260 }} onPress={() => onPick(q)} />)}</HorizontalChips>
  </View>;
}
