import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Confirm, goToPlans } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { GroupMembers, GroupPlanForm } from "../../components/social/GroupTools";
import { PlanSummary } from "../../components/social/PlanCard";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { group as loadGroup, leave, removeGroup } from "../../services/social-api";
import { chatOpen, groupName, isPast, tableNeeds } from "../../utils/meet";
import type { Group } from "../../types/community";

export function MeetGroupScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>(), { member } = useMember();
  const remote = useRemote(member ? "/api/social/groups/" + id : null, signal => loadGroup(id, signal)), g = remote.data;
  return <Screen title={g ? groupName(g) : "Group"} backTo="/social"><MemberGate>
    {g ? <GroupDetails group={g} refresh={remote.refresh} /> : <RemoteStatus remote={remote} icon="people-outline" returnTo="/social" missing="Group Unavailable" />}
  </MemberGate></Screen>;
}
/** Members, then either the agreed plan or the plan form, then leaving or removing the group. */
function GroupDetails({ group: g, refresh }: { group: Group; refresh: () => void }) {
  const [editing, setEditing] = useState(false), now = useMinuteClock();
  const open = chatOpen(g), past = !!g.venue && isPast(g, now), needs = tableNeeds(g), active = g.myStatus === "accepted" || g.myStatus === "invited";
  const update = () => { refresh(); invalidate("/api/social/groups"); };
  // An open table's plan belongs to its host; everyone else sees the plan without editing it.
  const editable = !g.listed || g.members.some(m => m.isMe && m.id === g.createdBy);
  useReminderSync([g], false);
  return <>
    <GroupMembers group={g} onChange={update} />
    {open && (g.venue && (!editing || !editable) ? <PlanSummary group={g} now={now} onEdit={editable ? () => setEditing(true) : undefined} onChange={update} /> : !past && editable && <>
      <ListGroup title="Plan"><ListItem title={needs.diet} subtitle={needs.detail || undefined} leading={<RowIcon name="leaf-outline" />} wrap /></ListGroup>
      <GroupPlanForm group={g} onDone={() => { setEditing(false); update(); }} />
    </>)}
    <View style={{ alignItems: "center" }}>
      {active ? <Confirm link label="Leave Group" action="Leave group" text="Leave this group? It moves to Past and will not reopen."
        run={async () => { await leave(g.id); update(); return true; }} />
        : <Confirm link label="Delete Group" action="Delete group" text="Remove this group from your plans? Others keep their copy."
          run={async () => { await removeGroup(g.id); invalidate("/api/social/groups"); goToPlans(); return true; }} />}
    </View>
  </>;
}
