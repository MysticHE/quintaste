import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Chip, Chips } from "../../components/food/Controls";
import { IngredientChoices } from "../../components/market/Ingredients";
import { DietChoices, MemberGate, SizeChoices, useSocialMe } from "../../components/social/MeetUI";
import { FieldLabel, FormSection, ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { RemoteStatus } from "../../components/CommunityGate";
import { Button, Field, common } from "../../components/ui";
import { AutosaveStatus } from "../../components/AutosaveStatus";
import { useAutosave } from "../../hooks/useAutosave";
import { invalidate } from "../../hooks/useRemote";
import { useMeet } from "../../hooks/useMeet";
import { usePreferences } from "../../state/Preferences";
import { saveProfile } from "../../services/social-api";
import { profileChecklist } from "../../utils/meet";
import { marketIngredients, type MarketIngredient } from "../../config/market-ingredients";
import { keptLabels, meetPractices, meetTimes, type MeetProfile } from "../../types/meet";
import type { DietLabel } from "../../config/diet-labels";
import type { SocialProfile } from "../../types/community";

export function MeetProfileScreen() {
  const remote = useSocialMe();
  return <Screen title="Your Profile" backTo="/social"><MemberGate returnTo="/social/profile">
    {remote.data ? <Profile initial={remote.data.profile} accountName={remote.data.accountName} /> : <RemoteStatus remote={remote} icon="person-circle-outline" returnTo="/social/profile" />}
  </MemberGate></Screen>;
}
const parseInterests = (value: string) => value.split(",").map(s => s.trim().slice(0, 30)).filter(Boolean).slice(0, 5);
const listText = (items: string[]) => items.length > 1 ? items.slice(0, -1).join(", ") + " and " + items[items.length - 1] : items[0] ?? "";
const toggle = <T,>(list: T[], item: T) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
/**
 * An empty account profile starts from the profile kept on this device, or else from the account's first name and
 * the diet labels in the member's Food Choices, so the two never start out disagreeing.
 */
function starting(p: SocialProfile, local: MeetProfile, accountName: string, food: { diets: readonly DietLabel[] }): SocialProfile {
  if (p.firstName || p.area || p.times.length) return p;
  if (local.name) return { ...p, firstName: local.name, area: local.area, diets: local.diets, about: local.about, interests: local.interests, times: local.times,
    size: local.size, excluded: local.excluded, practices: local.practices };
  return { ...p, firstName: accountName.split(/\s+/)[0]?.slice(0, 40) ?? "", diets: keptLabels(food.diets) };
}
/** The switch stays disabled until the profile has what others need. */
function OpenToPlans({ p, set }: { p: SocialProfile; set: (next: SocialProfile) => void }) {
  const missing = profileChecklist(p).filter(step => !step.done).map(step => step.label);
  return <ListGroup>
    <ListItem title="Open To Plans" subtitle={missing.length ? "Add " + listText(missing) : undefined} wrap leading={<RowIcon name="eye-outline" tone={p.visible ? "accent" : "muted"} />}
      trailing={<ThemedSwitch label="Open to plans" value={p.visible} disabled={!!missing.length} onChange={visible => set({ ...p, visible })} />} />
  </ListGroup>;
}
function Profile({ initial, accountName }: { initial: SocialProfile; accountName: string }) {
  const { draft } = usePreferences(), { network } = useMeet();
  const [p, setProfile] = useState(() => starting(initial, network.profile, accountName, draft)), [interests, setInterests] = useState(p.interests.join(", "));
  const autosave = useAutosave(async (profile: SocialProfile) => {
    try { await saveProfile(profile); invalidate("/api/social/"); return true; } catch { return false; }
  });
  const seeded = useRef(false);
  // A profile started from this device or the account name is saved once, so it is not lost if left unedited.
  useEffect(() => { if (seeded.current) return; seeded.current = true; if (JSON.stringify(p) !== JSON.stringify(initial)) autosave.change(p); }, [p, initial, autosave]);
  const set = (next: SocialProfile) => { const profile = profileChecklist(next).every(step => step.done) ? next : { ...next, visible: false }; setProfile(profile); autosave.change(profile); };
  const fromFoodChoices = marketIngredients.filter(item => (draft.excluded as string[]).includes(item) && !p.excluded.includes(item)) as MarketIngredient[];
  return <>
    <OpenToPlans p={p} set={set} />
    <FormSection title="About you">
      <Field label="First Name" value={p.firstName} maxLength={40} onChangeText={firstName => set({ ...p, firstName })} />
      <Field label="Neighbourhood" value={p.area} maxLength={60} placeholder="Bugis" onChangeText={area => set({ ...p, area })} />
      <Field label="About" value={p.about} maxLength={180} multiline onChangeText={about => set({ ...p, about })} />
      <Field label="Food Interests" value={interests} maxLength={160} placeholder="Coffee, noodles, brunch" onChangeText={value => { setInterests(value); set({ ...p, interests: parseInterests(value) }); }} />
    </FormSection>
    <FormSection title="Food">
      <View style={{ gap: 6 }}><FieldLabel>Diet</FieldLabel><DietChoices value={p.diets} onChange={diets => set({ ...p, diets })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Practice</FieldLabel><Chips>{meetPractices.map(practice => <Chip key={practice} label={practice} role="checkbox" selected={p.practices.includes(practice)}
        onPress={() => set({ ...p, practices: toggle(p.practices, practice) })} />)}</Chips></View>
      <View style={{ gap: 6 }}><View style={common.spread}><FieldLabel>Avoid</FieldLabel>
        {!!fromFoodChoices.length && <Button label="Use My Food Choices" variant="link" onPress={() => set({ ...p, excluded: [...p.excluded, ...fromFoodChoices] })} />}</View>
        <IngredientChoices value={p.excluded} onChange={excluded => set({ ...p, excluded })} /></View>
    </FormSection>
    <FormSection title="Plans">
      <View style={{ gap: 6 }}><FieldLabel>Group Size</FieldLabel><SizeChoices value={p.size} onChange={size => set({ ...p, size })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Usually Free</FieldLabel><Chips>{meetTimes.map(time => <Chip key={time} label={time} role="checkbox" selected={p.times.includes(time)} onPress={() => set({ ...p, times: toggle(p.times, time) })} />)}</Chips></View>
    </FormSection>
    <AutosaveStatus saving={autosave.saving} error={autosave.failed ? "Your profile was not saved. Tap Retry." : undefined} />
    {autosave.failed && <Button label="Retry" variant="link" onPress={() => void autosave.flush()} />}
  </>;
}
