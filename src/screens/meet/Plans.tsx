import { Redirect } from "expo-router";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { openSocial } from "../../components/social/Shared";
import { ProfileRow, useSocialMe } from "../../components/social/MeetUI";
import { Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { applications, groups as loadGroups, myGatherings } from "../../services/social-api";
import { groupName, groupStatus, type GroupStatus } from "../../utils/meet";
import { formatSgShort } from "../../utils/sg-datetime";
import type { Group, HostApplication } from "../../types/community";
import { GatheringRow } from "./Events";

export function MeetPlansScreen() { return <Redirect href="/social?tab=plans" />; }
export function GroupRow({ g, status, pill = true }: { g: Group; status: GroupStatus; pill?: boolean }) {
  const name = groupName(g), where = g.venue ? [g.venue, formatSgShort(g.starts)].filter(Boolean).join(" · ") : "", last = g.last || where || g.intro;
  return <ListItem title={name} leading={<Initial name={name} />} subtitle={last} badge={g.unread ? <StatusPill label="New" tone="accent" /> : undefined}
    trailing={pill ? <StatusPill label={status.label} tone={status.tone} /> : undefined} label={[name, g.unread && "new", status.label, last].filter(Boolean).join(", ")}
    onPress={() => openSocial((status.section === "closed" ? "/group/" : "/chat/") + g.id)} />;
}
function ApplicationItem({ a }: { a: HostApplication }) {
  return <ListItem title={a.name || "Untitled"} subtitle={a.kind} leading={<RowIcon name={a.kind === "Home dining" ? "home-outline" : "school-outline"} />}
    trailing={<StatusPill label={a.state === "submitted" ? "In review" : "Draft"} tone={a.state === "submitted" ? "accent" : "muted"} />} onPress={() => openSocial("/application/" + a.id)} />;
}
/** Your groups, gatherings and applications; everything here belongs to your account. */
export function PersonalPlans({ query, findPeople }: { query: string; findPeople: () => void }) {
  const profile = useSocialMe(), now = useMinuteClock(), search = query.trim().toLowerCase();
  const groups = useRemote("/api/social/groups", loadGroups, 30000), gatherings = useRemote("/api/social/gatherings/mine", myGatherings);
  const apps = useRemote("/api/social/applications", applications);
  useReminderSync(groups.data?.items, true);
  const matches = (...values: (string | null)[]) => values.join(" ").toLowerCase().includes(search);
  const rows = (groups.data?.items ?? []).filter(g => matches(groupName(g), g.venue)).map(g => ({ g, status: groupStatus(g, now) }));
  const events = (gatherings.data?.items ?? []).filter(g => matches(g.title, g.area, g.venue));
  const inSection = (...sections: GroupStatus["section"][]) => rows.filter(x => sections.includes(x.status.section));
  const needs = inSection("needs"), upcoming = inSection("upcoming", "waiting"), past = inSection("past", "closed");
  const drafts = events.filter(g => g.state === "draft"), coming = events.filter(g => g.state === "posted" && !g.past);
  const ended = events.filter(g => g.state === "cancelled" || (g.state === "posted" && g.past)), forms = (apps.data?.items ?? []).filter(a => matches(a.name, a.kind));
  const loaded = !!groups.data && !!gatherings.data && !!apps.data;
  const empty = loaded && !rows.length && !events.length && !forms.length;
  return <>
    {profile.data && <ListGroup><ProfileRow profile={profile.data.profile} /></ListGroup>}
    <RemoteStatus remote={groups.error ? groups : [gatherings, apps].find(remote => remote.error) ?? groups} icon="people-outline" returnTo="/social" />
    <ListGroup title="Needs you">{needs.map(x => <GroupRow key={x.g.id} {...x} />)}</ListGroup>
    <ListGroup title="Upcoming">{upcoming.map(x => <GroupRow key={x.g.id} {...x} />)}{coming.map(g => <GatheringRow key={g.id} g={g} />)}</ListGroup>
    <ListGroup title="Drafts">{drafts.map(g => <GatheringRow key={g.id} g={g} status="Draft" />)}
      {forms.filter(a => a.state !== "submitted").map(a => <ApplicationItem key={a.id} a={a} />)}</ListGroup>
    <ListGroup title="Applications">{forms.filter(a => a.state === "submitted").map(a => <ApplicationItem key={a.id} a={a} />)}</ListGroup>
    <ListGroup title="Past">{past.map(x => <GroupRow key={x.g.id} {...x} pill={x.status.section === "closed"} />)}
      {ended.map(g => <GatheringRow key={g.id} g={g} status={g.state === "cancelled" ? "Cancelled" : "Past"} />)}</ListGroup>
    {empty && (search ? <EmptyState title="No Matching Plans" text="" icon="people-outline" />
      : <FirstRunState icon="restaurant-outline" title="Plan your first meal" text="Invite people to eat together." action={{ label: "Create", onPress: () => openSocial("/create") }} />)}
  </>;
}
