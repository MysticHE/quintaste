import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useMinuteClock } from "../../components/food/Timers";
import { EmptyState } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { openSocial } from "../../components/social/Shared";
import { ProfileRow, useSocialMe } from "../../components/social/MeetUI";
import { ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { FaceStack } from "../../components/social/Face";
import { RemoteStatus } from "../../components/CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { applications, groups as loadGroups, myGatherings, repeat } from "../../services/social-api";
import { groupName, groupStatus, type GroupStatus } from "../../utils/meet";
import { formatSgShort } from "../../utils/sg-datetime";
import type { Group, HostApplication } from "../../types/community";
import { GatheringRow } from "./Events";
import { useLanguage, useT } from "../../i18n";

export function MeetPlansScreen() { return <Redirect href="/social?tab=plans" />; }
export function GroupRow({ g, status, pill = true }: { g: Group; status: GroupStatus; pill?: boolean }) {
  const t = useT("social"), language = useLanguage();
  const venue = g.venue ? g.place?.name ?? g.venue : g.offer?.place?.name ?? g.offer?.venue ?? "", starts = g.venue ? g.starts : g.offer?.starts ?? "";
  const name = groupName(g, language), where = venue ? [venue, formatSgShort(starts, language)].filter(Boolean).join(" · ") : "", last = status.section === "needs" && where ? where : g.last || where || g.intro;
  const faces = g.members.filter(m => !m.isMe && (m.status === "accepted" || m.status === "invited"));
  return <ListItem title={name} leading={<FaceStack people={faces.length ? faces : g.members.filter(m => !m.isMe)} size={32} />} subtitle={last} badge={g.unread ? <StatusPill label={t("unreadNew")} tone="accent" /> : undefined}
    trailing={pill ? <StatusPill label={status.label} tone={status.tone} /> : undefined} label={[name, g.unread && t("unreadNewLower"), status.label, last].filter(Boolean).join(", ")}
    onPress={() => openSocial((status.section === "closed" ? "/group/" : "/chat/") + g.id)} />;
}
function ApplicationItem({ a }: { a: HostApplication }) {
  const t = useT("social");
  return <ListItem title={a.name || t("untitled")} subtitle={t("optAppKind", { value: a.kind })} leading={<RowIcon name={a.kind === "Home dining" ? "home-outline" : "school-outline"} />}
    trailing={<StatusPill label={t(a.state === "submitted" ? "inReview" : "draft")} tone={a.state === "submitted" ? "accent" : "muted"} />} onPress={() => openSocial("/application/" + a.id)} />;
}
/** People you both want to eat with again: one row starts a private table with them. */
function RepeatRows() {
  const remote = useRemote("/api/social/repeat", repeat), people = remote.data?.items ?? [], t = useT("social");
  if (!people.length) return null;
  return <ListGroup title={t("eatAgain")}><ListItem title={t("eatWithAgain", { names: people.slice(0, 3).map(p => p.firstName).join(t("nameJoin")) })}
    leading={<FaceStack people={people.slice(0, 3).map(p => ({ id: p.id, name: p.firstName, hasFace: p.hasFace }))} size={28} />}
    onPress={() => openSocial("/table/new?invite=" + people.slice(0, 3).map(p => p.id).join(","))} /></ListGroup>;
}
/** Your groups, gatherings and applications; everything here belongs to your account. */
/** `onEmpty` tells Social when the empty state (with its own Create) is showing, so it can drop the floating button. */
export function PersonalPlans({ query, onEmpty }: { query: string; onEmpty: (empty: boolean) => void }) {
  const profile = useSocialMe(), now = useMinuteClock(), search = query.trim().toLowerCase(), t = useT("social"), language = useLanguage();
  const groups = useRemote("/api/social/groups", loadGroups, 30000), gatherings = useRemote("/api/social/gatherings/mine", myGatherings);
  const apps = useRemote("/api/social/applications", applications);
  useReminderSync(groups.data?.items, true);
  const matches = (...values: (string | null)[]) => values.join(" ").toLowerCase().includes(search);
  const rows = (groups.data?.items ?? []).filter(g => matches(groupName(g, language), g.venue)).map(g => ({ g, status: groupStatus(g, now, language) }));
  const events = (gatherings.data?.items ?? []).filter(g => matches(g.title, g.area, g.venue));
  const inSection = (...sections: GroupStatus["section"][]) => rows.filter(x => sections.includes(x.status.section));
  const needs = inSection("needs"), upcoming = inSection("upcoming", "waiting"), past = inSection("past", "closed");
  const drafts = events.filter(g => g.state === "draft"), coming = events.filter(g => g.state === "posted" && !g.past);
  const ended = events.filter(g => g.state === "cancelled" || (g.state === "posted" && g.past)), forms = (apps.data?.items ?? []).filter(a => matches(a.name, a.kind));
  const loaded = !!groups.data && !!gatherings.data && !!apps.data;
  const empty = loaded && !rows.length && !events.length && !forms.length, firstRun = empty && !search;
  useEffect(() => { onEmpty(firstRun); }, [firstRun, onEmpty]);
  return <>
    {profile.data && <ListGroup><ProfileRow profile={profile.data.profile} /></ListGroup>}
    <RepeatRows />
    <RemoteStatus remote={groups.error ? groups : [gatherings, apps].find(remote => remote.error) ?? groups} icon="people-outline" returnTo="/social" />
    <ListGroup title={t("needsYou")}>{needs.map(x => <GroupRow key={x.g.id} {...x} />)}</ListGroup>
    <ListGroup title={t("upcoming")}>{upcoming.map(x => <GroupRow key={x.g.id} {...x} />)}{coming.map(g => <GatheringRow key={g.id} g={g} />)}</ListGroup>
    <ListGroup title={t("drafts")}>{drafts.map(g => <GatheringRow key={g.id} g={g} status="draft" />)}
      {forms.filter(a => a.state !== "submitted").map(a => <ApplicationItem key={a.id} a={a} />)}</ListGroup>
    <ListGroup title={t("applications")}>{forms.filter(a => a.state === "submitted").map(a => <ApplicationItem key={a.id} a={a} />)}</ListGroup>
    <ListGroup title={t("past")}>{past.map(x => <GroupRow key={x.g.id} {...x} pill={x.status.section === "closed"} />)}
      {ended.map(g => <GatheringRow key={g.id} g={g} status={g.state === "cancelled" ? "cancelled" : "past"} />)}</ListGroup>
    {empty && (search ? <EmptyState title={t("noMatchingPlans")} text="" icon="people-outline" />
      : <FirstRunState icon="restaurant-outline" title={t("firstMealTitle")} text={t("firstMealText")} action={{ label: t("createPlan"), icon: "add", onPress: () => openSocial("/create") }} />)}
  </>;
}
