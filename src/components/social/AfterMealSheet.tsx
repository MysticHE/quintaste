import { useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { FieldLabel } from "../GroupedList";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { invalidate } from "../../hooks/useRemote";
import { attend } from "../../services/social-api";
import type { Group } from "../../types/community";
import { Action } from "./Shared";
import { Face } from "./Face";
import { Sheet } from "./Sheet";

const answers = [{ id: "yes", label: "wentYes" }, { id: "no", label: "wentNo" }, { id: "changed", label: "plansChanged" }] as const;
/** After the meal: did you go, who you would eat with again, and an optional line about each tablemate (they approve it first). */
export function AfterMealSheet({ group: g, title, visible, onClose }: { group: Group; title: string; visible: boolean; onClose: () => void }) {
  const { theme, setNotice } = usePreferences(), t = useT("social"), tc = useT("common"), mates = g.members.filter(m => !m.isMe && m.status === "accepted");
  const [went, setWent] = useState<"yes" | "no" | "changed" | null>(null), [again, setAgain] = useState<string[]>([]), [says, setSays] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const toggleMissing = (id: string) => { setMissing(missing.includes(id) ? missing.filter(x => x !== id) : [...missing, id]); setAgain(again.filter(x => x !== id)); };
  const save = async () => {
    if (!went) throw new Error(t("sayWhetherWent"));
    const result = await attend(g.id, { attended: went, eatAgain: went === "yes" ? again : [], missing: went === "yes" ? missing : [], says: went === "yes" ? says : {} });
    invalidate("/api/social/groups", "/api/social/repeat", "/api/social/me");
    setNotice({ text: result.paused ? t("pausedThirty") : t("thanksSaved") });
    onClose();
  };
  return <Sheet visible={visible} onClose={onClose} title={title} footer={<Action label={tc("done")} disabled={!went} run={save} />}>
    <View style={{ gap: 6 }}><FieldLabel>{t("didYouGo")}</FieldLabel>
      <Chips label={t("didYouGo")}>{answers.map(a => <Chip key={a.id} label={t(a.label)} role="radio" selected={went === a.id} onPress={() => setWent(a.id)} />)}</Chips></View>
    {went === "yes" && !!mates.length && <>
      <View style={{ gap: 8 }}><FieldLabel>{t("eatAgainWith")}</FieldLabel>
        <View style={[common.row, { gap: 14, flexWrap: "wrap" }]}>{mates.map(m => { const on = again.includes(m.id);
          return <Pressable key={m.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={t("eatAgainWithName", { name: m.name })}
            onPress={() => { setAgain(on ? again.filter(id => id !== m.id) : [...again, m.id]); setMissing(missing.filter(id => id !== m.id)); }} style={{ alignItems: "center", gap: 4, width: 64 }}>
            <View style={{ borderRadius: 32, borderWidth: 3, borderColor: on ? theme.accent : theme.transparent, padding: 2 }}>
              <Face id={m.id} name={m.name} hasFace={m.hasFace} size={52} /></View>
            {on && <View style={{ position: "absolute", right: 2, top: 38, backgroundColor: theme.accent, borderRadius: 10, padding: 2 }}><Icon name="checkmark" size={14} color={theme.actionForeground} /></View>}
            <T variant="small" numberOfLines={1}>{m.name}</T>
          </Pressable>; })}</View>
      </View>
      <View style={{ gap: 6 }}><FieldLabel>{t("didNotCome")}</FieldLabel>
        <Chips label={t("didNotCome")} multiple>{mates.map(m => <Chip key={m.id} label={m.name} role="checkbox" icon="close-circle-outline"
          selected={missing.includes(m.id)} onPress={() => toggleMissing(m.id)} />)}</Chips></View>
      <View style={{ gap: 8 }}><FieldLabel>{t("kakiSaysOptional")}</FieldLabel>
        {mates.filter(m => !missing.includes(m.id)).map(m => <View key={m.id} style={[common.row, { gap: 10 }]}><Face id={m.id} name={m.name} hasFace={m.hasFace} size={32} />
          <View style={common.flex}><Field label={t("oneLineAbout", { name: m.name })} showLabel={false} placeholder={t("oneLineAbout", { name: m.name })} value={says[m.id] ?? ""} maxLength={80}
            onChangeText={text => setSays({ ...says, [m.id]: text })} /></View></View>)}
      </View>
    </>}
  </Sheet>;
}
