import { View } from "react-native";
import type { PropsWithChildren } from "react";
import { Chip, Chips } from "../food/Controls";
import { Initial, ListItem, StatusPill } from "../GroupedList";
import { MemberPrompt, useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { me } from "../../services/social-api";
import { groupSizes, type GroupSize } from "../../types/meet";
import { dietLabels, toggleLabel, type DietLabel } from "../../config/diet-labels";
import { dietSummary } from "../../config/preferences";
import { usePreferences } from "../../state/Preferences";
import { DietIcon } from "../food/DietIcon";
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
/** Diet labels to keep or serve: Plant-Based alone, or Vegan and/or Vegetarian. */
export function DietChoices({ value, onChange }: { value: readonly DietLabel[]; onChange: (next: DietLabel[]) => void }) {
  const { theme } = usePreferences();
  return <Chips label="Diet" multiple>{dietLabels.map(label => <Chip key={label} label={label} role="checkbox" selected={value.includes(label)}
    leading={<DietIcon diet={label} size={20} color={value.includes(label) ? theme.accent : theme.mutedForeground} />} onPress={() => onChange(toggleLabel(value, label))} />)}</Chips>;
}
export function DietTags({ person }: { person: Pick<SocialProfile, "diets" | "practices"> }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
    {person.diets.map(label => <StatusPill key={label} label={label} tone="accent" />)}
    {person.practices.map(p => <StatusPill key={p} label={p} />)}</View>;
}
export function PersonRow({ person }: { person: Person }) {
  const diet = dietSummary(person.diets);
  return <ListItem title={person.firstName} subtitle={diet + " · " + person.area} detail={person.about || undefined}
    leading={<Initial name={person.firstName} size={44} />} label={[person.firstName, diet, person.area, person.about].filter(Boolean).join(", ")}
    onPress={() => openSocial("/person/" + person.id)} />;
}
/** Where a member's profile stands; shown in My plans, and on People until it is open to plans. */
export function profileState(p: SocialProfile) {
  return profileChecklist(p).some(step => !step.done) ? { label: "Finish profile", tone: "warning" as const }
    : p.visible ? { label: "Open to plans", tone: "success" as const } : { label: "Paused", tone: "muted" as const };
}
export function ProfileRow({ profile }: { profile: SocialProfile }) {
  const state = profileState(profile);
  // An unfinished profile is a step to take, so it reads as the row's action rather than a status badge.
  const unfinished = state.label === "Finish profile";
  return <ListItem title={profile.firstName || "Your profile"} leading={<Initial name={profile.firstName || "You"} size={44} />}
    subtitle={unfinished ? "Finish your profile to meet people" : profile.area || undefined}
    trailing={unfinished ? undefined : <StatusPill label={state.label} tone={state.tone} />} label={"Your profile, " + state.label} onPress={() => openSocial("/profile")} />;
}
