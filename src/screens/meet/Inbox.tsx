import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { ListGroup } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { groups as loadGroups } from "../../services/social-api";
import { groupStatus } from "../../utils/meet";
import { GroupRow } from "./Plans";
import { useLanguage, useT } from "../../i18n";

const sections = [{ title: "inboxChats", keys: ["needs", "upcoming"] }, { title: "inboxWaiting", keys: ["waiting"] }, { title: "past", keys: ["past", "closed"] }] as const;
export function MeetInboxScreen() {
  const { member } = useMember(), now = useMinuteClock(), t = useT("social"), language = useLanguage();
  const remote = useRemote(member ? "/api/social/groups" : null, loadGroups, 15000), items = remote.data?.items ?? [];
  useReminderSync(remote.data?.items, true);
  const rows = items.map(g => ({ g, status: groupStatus(g, now, language) }));
  return <Screen title={t("inbox")} backTo="/social" headerAction={<IconButton label={t("safetyBlocked")} icon="shield-checkmark-outline" onPress={() => openSocial("/safety")} />}>
    <MemberGate>
      <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/social" />
      {remote.data && !items.length && <EmptyState title={t("noConversations")} text="" action={t("findPeopleAction")} onPress={() => router.navigate("/social")} icon="chatbubbles-outline" />}
      {sections.map(section => <ListGroup key={section.title} title={t(section.title)}>
        {rows.filter(x => (section.keys as readonly string[]).includes(x.status.section)).map(x =>
          <GroupRow key={x.g.id} {...x} pill={section.title === "inboxChats" || x.status.section === "closed"} />)}
      </ListGroup>)}
    </MemberGate>
  </Screen>;
}
