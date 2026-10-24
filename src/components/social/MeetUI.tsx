import { View } from "react-native";
import { useCallback, type PropsWithChildren } from "react";
import { Chip, Chips } from "../food/Controls";
import { Initial, ListItem, StatusPill } from "../GroupedList";
import { MemberPrompt, useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { me } from "../../services/social-api";
import { groupSizes, shownPractices, type GroupSize } from "../../types/meet";
import { dietLabels, toggleLabel, type DietLabel } from "../../config/diet-labels";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import type { Person, SocialProfile } from "../../types/community";
import { profileChecklist } from "../../utils/meet";
import { openSocial } from "./Shared";

/** The signed-in member's Social profile. */
export function useSocialMe() {
  const { member } = useMember();
  return useRemote(member ? "/api/social/me" : null, me);
}
/** Diet labels as one line in the interface language: "Vegan · Vegetarian". */
export function useDietSummary() {
  const text = useDietText();
  return useCallback((labels: readonly DietLabel[]) => labels.map(text.name).join(" · "), [text]);
}
/** Social needs a signed-in, age-checked account. */
export function MemberGate({ children, returnTo = "/social" }: PropsWithChildren<{ returnTo?: string }>) {
  return useMember().member ? <>{children}</> : <MemberPrompt icon="people-outline" returnTo={returnTo} />;
}
export function SizeChoices({ value, onChange, disabled = false, label }: { value: GroupSize; onChange: (value: GroupSize) => void; disabled?: boolean; label?: string }) {
  const t = useT("social");
  return <Chips label={label ?? t("groupSize")}>{groupSizes.map(size => <Chip key={size} label={String(size)} disabled={disabled} icon="people-outline" role="radio" selected={value === size} onPress={() => onChange(size)} />)}</Chips>;
}
/** Diet labels to keep or serve: Plant-Based alone, or Vegan and/or Vegetarian. */
export function DietChoices({ value, onChange }: { value: readonly DietLabel[]; onChange: (next: DietLabel[]) => void }) {
  const { theme } = usePreferences(), t = useT("social"), text = useDietText();
  return <Chips label={t("diet")} multiple>{dietLabels.map(label => <Chip key={label} label={text.name(label)} role="checkbox" selected={value.includes(label)}
    leading={<DietIcon diet={label} size={20} color={value.includes(label) ? theme.accent : theme.mutedForeground} />} onPress={() => onChange(toggleLabel(value, label))} />)}</Chips>;
}
export function DietTags({ person }: { person: Pick<SocialProfile, "diets" | "practices"> }) {
  const t = useT("social"), text = useDietText();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
    {person.diets.map(label => <StatusPill key={label} label={text.name(label)} tone="accent" />)}
    {shownPractices(person.practices).map(p => <StatusPill key={p} label={t("optPractice", { value: p })} />)}</View>;
}
export function PersonRow({ person }: { person: Person }) {
  const diet = useDietSummary()(person.diets);
  return <ListItem title={person.firstName} subtitle={diet + " · " + person.area} detail={person.about || undefined}
    leading={<Initial name={person.firstName} size={44} />} label={[person.firstName, diet, person.area, person.about].filter(Boolean).join(", ")}
    onPress={() => openSocial("/person/" + person.id)} />;
}
/** Where a member's profile stands; shown in My plans, and on People until it is open to plans. */
export function profileState(p: SocialProfile) {
  return profileChecklist(p).some(step => !step.done) ? { id: "finish" as const, tone: "warning" as const }
    : p.visible ? { id: "open" as const, tone: "success" as const } : { id: "paused" as const, tone: "muted" as const };
}
const stateKey = { finish: "finishProfile", open: "openToPlans", paused: "paused" } as const;
export function ProfileRow({ profile }: { profile: SocialProfile }) {
  const t = useT("social"), state = profileState(profile), label = t(stateKey[state.id]);
  // An unfinished profile is a step to take, so it reads as the row's action rather than a status badge.
  const unfinished = state.id === "finish";
  return <ListItem title={profile.firstName || t("yourProfile")} leading={<Initial name={profile.firstName || t("you")} size={44} />}
    subtitle={unfinished ? t("finishToMeet") : profile.area || undefined}
    trailing={unfinished ? undefined : <StatusPill label={label} tone={state.tone} />} label={t("yourProfileA11y", { state: label })} onPress={() => openSocial("/profile")} />;
}
