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

const sections = [{ title: "Chats", keys: ["needs", "upcoming"] }, { title: "Waiting", keys: ["waiting"] }, { title: "Past", keys: ["past", "closed"] }] as const;
export function MeetInboxScreen() {
  const { member } = useMember(), now = useMinuteClock();
  const remote = useRemote(member ? "/api/social/groups" : null, loadGroups, 15000), items = remote.data?.items ?? [];
  useReminderSync(remote.data?.items, true);
  const rows = items.map(g => ({ g, status: groupStatus(g, now) }));
  return <Screen title="Inbox" backTo="/social" headerAction={<IconButton label="Safety & Blocked People" icon="shield-checkmark-outline" onPress={() => openSocial("/safety")} />}>
    <MemberGate>
      <RemoteStatus remote={remote} icon="chatbubbles-outline" returnTo="/social" />
      {remote.data && !items.length && <EmptyState title="No Conversations Yet" text="" action="Find People" onPress={() => router.navigate("/social")} icon="chatbubbles-outline" />}
      {sections.map(section => <ListGroup key={section.title} title={section.title}>
        {rows.filter(x => (section.keys as readonly string[]).includes(x.status.section)).map(x =>
          <GroupRow key={x.g.id} {...x} pill={section.title === "Chats" || x.status.section === "closed"} />)}
      </ListGroup>)}
    </MemberGate>
  </Screen>;
}
