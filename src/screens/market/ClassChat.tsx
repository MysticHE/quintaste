import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate } from "../../components/social/SocialState";
import { useClassError, useClassLineText } from "../../components/market/ClassParts";
import { ChatThread } from "../../components/social/ChatThread";
import { useRemote } from "../../hooks/useRemote";
import { classChat, classChatKey, cookingClass, sendClassChat } from "../../services/classes-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** Questions about one class: a member with the teacher, or (with `member`) the teacher with one member. */
export function ClassChatScreen() {
  const { id, member, name: memberName } = useLocalSearchParams<{ id: string; member?: string; name?: string }>(), t = useT("market"), { setNotice } = usePreferences(), problem = useClassError();
  const cls = useRemote(id ? "/api/market/classes/" + id : null, signal => cookingClass(id, signal)).data, key = id ? classChatKey(id, member) : null;
  const lines = useRemote(key, signal => classChat(key!, signal), 5000), describe = useClassLineText(), teaching = !!cls?.hosting;
  const other = teaching ? memberName ?? "" : cls?.teacher.name ?? "";
  const send = async (text: string) => {
    try { await sendClassChat(id, text, member); lines.refresh(); return true; }
    catch (failure) { setNotice({ text: problem(failure), error: true }); return false; }
  };
  return <Screen title={cls?.title ?? ""} subtitle={other || undefined} fill>
    <MemberGate returnTo={"/market/class-chat/" + id}>
      <RemoteStatus remote={lines} icon="chatbubbles-outline" returnTo="/market?tab=events" missing={t("classUnavailable")} />
      {lines.data && <ChatThread lines={lines.data.items} name={other} describe={line => describe(line, teaching, memberName ?? "")} onSend={send} empty={t("classChatEmpty", { name: other })} />}
    </MemberGate>
  </Screen>;
}
