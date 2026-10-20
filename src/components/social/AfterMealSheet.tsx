import { useState } from "react";
import { Pressable, View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { Chip, Chips } from "../food/Controls";
import { FieldLabel } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { invalidate } from "../../hooks/useRemote";
import { attend } from "../../services/social-api";
import type { Group } from "../../types/community";
import { Action } from "./Shared";
import { Face } from "./Face";
import { Sheet } from "./Sheet";

const answers = [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "changed", label: "Plans changed" }] as const;
/** After the meal: did you go, who you would eat with again, and an optional line about each tablemate (they approve it first). */
export function AfterMealSheet({ group: g, title, visible, onClose }: { group: Group; title: string; visible: boolean; onClose: () => void }) {
  const { theme, setNotice } = usePreferences(), mates = g.members.filter(m => !m.isMe && m.status === "accepted");
  const [went, setWent] = useState<"yes" | "no" | "changed" | null>(null), [again, setAgain] = useState<string[]>([]), [says, setSays] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const toggleMissing = (id: string) => { setMissing(missing.includes(id) ? missing.filter(x => x !== id) : [...missing, id]); setAgain(again.filter(x => x !== id)); };
  const save = async () => {
    if (!went) throw new Error("Say whether you went.");
    const result = await attend(g.id, { attended: went, eatAgain: went === "yes" ? again : [], missing: went === "yes" ? missing : [], says: went === "yes" ? says : {} });
    invalidate("/api/social/groups", "/api/social/repeat", "/api/social/me");
    setNotice({ text: result.paused ? "Open to plans is paused for 30 days" : "Thanks. Saved." });
    onClose();
  };
  return <Sheet visible={visible} onClose={onClose} title={title} footer={<Action label="Done" disabled={!went} run={save} />}>
    <View style={{ gap: 6 }}><FieldLabel>Did you go?</FieldLabel>
      <Chips label="Did you go?">{answers.map(a => <Chip key={a.id} label={a.label} role="radio" selected={went === a.id} onPress={() => setWent(a.id)} />)}</Chips></View>
    {went === "yes" && !!mates.length && <>
      <View style={{ gap: 8 }}><FieldLabel>Eat again with</FieldLabel>
        <View style={[common.row, { gap: 14, flexWrap: "wrap" }]}>{mates.map(m => { const on = again.includes(m.id);
          return <Pressable key={m.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={"Eat again with " + m.name}
            onPress={() => { setAgain(on ? again.filter(id => id !== m.id) : [...again, m.id]); setMissing(missing.filter(id => id !== m.id)); }} style={{ alignItems: "center", gap: 4, width: 64 }}>
            <View style={{ borderRadius: 32, borderWidth: 3, borderColor: on ? theme.accent : theme.transparent, padding: 2 }}>
              <Face id={m.id} name={m.name} hasFace={m.hasFace} size={52} /></View>
            {on && <View style={{ position: "absolute", right: 2, top: 38, backgroundColor: theme.accent, borderRadius: 10, padding: 2 }}><Icon name="checkmark" size={14} color={theme.actionForeground} /></View>}
            <T variant="small" numberOfLines={1}>{m.name}</T>
          </Pressable>; })}</View>
      </View>
      <View style={{ gap: 6 }}><FieldLabel>{"Didn't come"}</FieldLabel>
        <Chips label="Didn't come" multiple>{mates.map(m => <Chip key={m.id} label={m.name} role="checkbox" icon="close-circle-outline"
          selected={missing.includes(m.id)} onPress={() => toggleMissing(m.id)} />)}</Chips></View>
      <View style={{ gap: 8 }}><FieldLabel>Kaki says · optional</FieldLabel>
        {mates.filter(m => !missing.includes(m.id)).map(m => <View key={m.id} style={[common.row, { gap: 10 }]}><Face id={m.id} name={m.name} hasFace={m.hasFace} size={32} />
          <View style={common.flex}><Field label={"One line about " + m.name} showLabel={false} placeholder={"One line about " + m.name} value={says[m.id] ?? ""} maxLength={80}
            onChangeText={text => setSays({ ...says, [m.id]: text })} /></View></View>)}
      </View>
    </>}
  </Sheet>;
}
