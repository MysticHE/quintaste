import { View } from "react-native";
import type { PropsWithChildren } from "react";
import { Chip, Chips } from "../food/Controls";
import { Initial, ListItem, StatusPill } from "../GroupedList";
import { MemberPrompt, useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { me } from "../../services/social-api";
import { groupSizes, type GroupSize, type MeetPractice } from "../../types/meet";
import type { Person, SocialProfile } from "../../types/community";
import { profileChecklist } from "../../utils/meet";
import { openSocial } from "./Shared";

/** The signed-in member's Social profile. */
export function useSocialMe() {
  const { member } = useMember();
  return useRemote(member ? "/api/social/me" : null, me);
}
/** Social needs a signed-in, age-checked account. */
export function MemberGate({ children, returnTo = "/social" }: PropsWithChildren<{ returnTo?: string }>) {
  return useMember().member ? <>{children}</> : <MemberPrompt icon="people-outline" returnTo={returnTo} />;
}
export function SizeChoices({ value, onChange, disabled = false, label = "Group size" }: { value: GroupSize; onChange: (value: GroupSize) => void; disabled?: boolean; label?: string }) {
  return <Chips label={label}>{groupSizes.map(size => <Chip key={size} label={String(size)} disabled={disabled} icon="people-outline" role="radio" selected={value === size} onPress={() => onChange(size)} />)}</Chips>;
}
export const practiceLabel = (p: MeetPractice) => p === "No five pungent" ? "No five pungent (五辛)" : p;
export function DietTags({ person }: { person: Pick<SocialProfile, "diet" | "practices"> }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}><StatusPill label={person.diet} tone="accent" />
    {person.practices.map(p => <StatusPill key={p} label={practiceLabel(p)} />)}</View>;
}
export function PersonRow({ person }: { person: Person }) {
  return <ListItem title={person.firstName} subtitle={person.diet + " · " + person.area} detail={person.about || undefined}
    leading={<Initial name={person.firstName} size={44} />} label={[person.firstName, person.diet, person.area, person.about].filter(Boolean).join(", ")}
    onPress={() => openSocial("/person/" + person.id)} />;
}
/** Where a member's profile stands; shown in My plans, and on People until it is open to plans. */
export function profileState(p: SocialProfile) {
  return profileChecklist(p).some(step => !step.done) ? { label: "Finish profile", tone: "warning" as const }
    : p.visible ? { label: "Open to plans", tone: "success" as const } : { label: "Paused", tone: "muted" as const };
}
export function ProfileRow({ profile }: { profile: SocialProfile }) {
  const state = profileState(profile);
  return <ListItem title={profile.firstName || "Your profile"} leading={<Initial name={profile.firstName || "You"} size={44} />} subtitle={profile.area || undefined}
    trailing={<StatusPill label={state.label} tone={state.tone} />} label={"Your profile, " + state.label} onPress={() => openSocial("/profile")} />;
}
