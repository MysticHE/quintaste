import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate } from "../../components/social/SocialState";
import { useClassError, useClassLineText } from "../../components/market/ClassParts";
import { ChatThread } from "../../components/social/ChatThread";
import { useEffect } from "react";
import { View } from "react-native";
import { T } from "../../components/ui";
import { ClassCard } from "../../components/market/ChatCards";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { classChat, classChatKey, cookingClass, sendClassChat } from "../../services/classes-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** Questions about one class: a member with the teacher, or (with `member`) the teacher with one member. */
export function ClassChatScreen() {
  const { id, member, name: memberName } = useLocalSearchParams<{ id: string; member?: string; name?: string }>(), t = useT("market"), { setNotice } = usePreferences(), problem = useClassError();
  const clsRemote = useRemote(id ? "/api/market/classes/" + id : null, signal => cookingClass(id, signal)), cls = clsRemote.data, key = id ? classChatKey(id, member) : null;
  const lines = useRemote(key, signal => classChat(key!, signal), 5000), describe = useClassLineText(), teaching = !!cls?.hosting;
  const tp = useT("profile");
  const newest = lines.data?.items.at(-1)?.id;
  useEffect(() => { if (newest) invalidate("/api/market/class-conversations"); }, [newest]);
  const other = teaching ? memberName ?? "" : cls?.teacher.name ?? "";
  const send = async (text: string) => {
    try { await sendClassChat(id, text, member); lines.refresh(); invalidate("/api/market/class-conversations"); return true; }
    catch (failure) { setNotice({ text: problem(failure), error: true }); return false; }
  };
  return <Screen title={other || cls?.title || tp("class")} subtitle={tp(teaching ? "classMember" : "classTeacher")} fill backTo="/messages">
    <MemberGate returnTo={"/market/class-chat/" + id}>
      <RemoteStatus remote={lines} icon="chatbubbles-outline" returnTo="/cook?tab=events" missing={t("classUnavailable")} />
      {lines.data && <ChatThread lines={lines.data.items} name={other} describe={line => describe(line, teaching, memberName ?? "")} placeholder={teaching ? tp("messagePerson", { name: other }) : tp("askTeacher")} top={cls && <View style={{ gap: 8 }}><ClassCard cls={cls} seat={lines.data.seat} teaching={teaching} member={member} memberName={memberName ?? ""}
          onChanged={() => { lines.refresh(); clsRemote.refresh(); invalidate("/api/market/class-conversations"); }} />
          {!teaching && <T variant="caption" muted style={{ textAlign: "center" }}>{tp("privateClass")}</T>}</View>} onSend={send} empty={t("classChatEmpty", { name: other })} />}
    </MemberGate>
  </Screen>;
}
