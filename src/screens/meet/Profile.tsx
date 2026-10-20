import { useEffect, useRef, useState } from "react";
import { toggleItem } from "../../utils/list";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { useMinuteClock } from "../../components/food/Timers";
import { Chip, Chips } from "../../components/food/Controls";
import { IngredientChoices } from "../../components/market/Ingredients";
import { DietChoices, MemberGate, SizeChoices, useSocialMe } from "../../components/social/MeetUI";
import { AboutSection, BasicsSection, PromptsSection, SpotsField } from "../../components/social/ProfileSections";
import { FaceSetup } from "../../components/social/FaceSetup";
import { PersonCard } from "../../components/social/PersonCard";
import { Sheet } from "../../components/social/Sheet";
import { FieldLabel, FormSection, ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { Button, Card, Field, T, common } from "../../components/ui";
import { AutosaveStatus } from "../../components/AutosaveStatus";
import { useAutosave } from "../../hooks/useAutosave";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useMeet } from "../../hooks/useMeet";
import { usePreferences } from "../../state/Preferences";
import { kakiSays, saveProfile, showKakiSay } from "../../services/social-api";
import { profileChecklist } from "../../utils/meet";
import { asSeenByOthers, completion } from "../../utils/social-match";
import { formatSgDateTime } from "../../utils/sg-datetime";
import { marketIngredients, type MarketIngredient } from "../../config/market-ingredients";
import { defaultHidden } from "../../config/social-profile";
import { keptLabels, meetPractices, meetTimes, type MeetProfile } from "../../types/meet";
import type { DietLabel } from "../../config/diet-labels";
import type { SocialProfile } from "../../types/community";

export function MeetProfileScreen() {
  const remote = useSocialMe(), [preview, setPreview] = useState(false);
  return <Screen title="Your Profile" backTo="/social" headerAction={remote.data ? <Button label="Preview" icon="eye-outline" variant="link" onPress={() => setPreview(true)} /> : undefined}>
    <MemberGate returnTo="/social/profile">
      {remote.data ? <Profile initial={remote.data.profile} accountName={remote.data.accountName} preview={preview} onPreview={setPreview} />
        : <RemoteStatus remote={remote} icon="person-circle-outline" returnTo="/social/profile" />}
    </MemberGate></Screen>;
}
const listText = (items: string[]) => items.length > 1 ? items.slice(0, -1).join(", ") + " and " + items[items.length - 1] : items[0] ?? "";
/**
 * An empty account profile starts from the profile kept on this device, or else from the account's first name and
 * the diet labels in the member's Food Choices, so the two never start out disagreeing.
 */
export function startingProfile(p: SocialProfile, local: MeetProfile, accountName: string, food: { diets: readonly DietLabel[] }): SocialProfile {
  const base = { ...p, hidden: p.hidden ?? defaultHidden };
  if (p.firstName || p.area || p.times.length) return base;
  if (local.name) return { ...base, firstName: local.name, area: local.area, diets: local.diets, about: local.about, interests: local.interests, times: local.times,
    size: local.size, excluded: local.excluded, practices: local.practices };
  return { ...base, firstName: accountName.split(/\s+/)[0]?.slice(0, 40) ?? "", diets: keptLabels(food.diets) };
}
/** The switch stays disabled until the profile has what others need, and while a pause after missed meals runs. */
function OpenToPlans({ p, set }: { p: SocialProfile; set: (next: SocialProfile) => void }) {
  const missing = profileChecklist(p).filter(step => !step.done).map(step => step.label), now = useMinuteClock();
  const paused = p.pausedUntil && Date.parse(p.pausedUntil) > now ? "Paused until " + formatSgDateTime(Date.parse(p.pausedUntil)) : "";
  return <ListGroup>
    <ListItem title="Open To Plans" subtitle={paused || (missing.length ? "Add " + listText(missing) : undefined)} wrap leading={<RowIcon name="people-outline" tone={p.visible ? "accent" : "muted"} />}
      trailing={<ThemedSwitch label="Open to plans" value={p.visible} disabled={!!missing.length || !!paused} onChange={visible => set({ ...p, visible })} />} />
  </ListGroup>;
}
function Completion({ p }: { p: SocialProfile }) {
  const { theme } = usePreferences(), c = completion(p), pct = Math.round(c.done / c.total * 100);
  return <Card style={{ gap: 8 }}>
    <View style={common.spread}><T style={common.bold}>{`Profile ${c.done} of ${c.total}`}</T></View>
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.muted, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: theme.accent, borderRadius: 4 }} /></View>
    {!!c.missing.length && <T variant="small" muted>{"Add " + listText(c.missing.slice(0, 3))}</T>}
  </Card>;
}
/** Lines tablemates wrote; show up to three. */
function KakiSays() {
  const remote = useRemote("/api/social/me/kaki-says", kakiSays), items = remote.data?.items ?? [], { setNotice } = usePreferences();
  if (!items.length) return null;
  const flip = async (id: string, shown: boolean) => {
    try { await showKakiSay(id, shown); remote.refresh(); invalidate("/api/social/people/"); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "That did not save.", error: true }); }
  };
  return <FormSection title="Kaki Says">
    <ListGroup inset={false}>{items.map(k => <ListItem key={k.id} title={"“" + k.body + "”"} subtitle={k.byName} wrap
      trailing={<ThemedSwitch label={"Show " + k.byName + "'s line"} value={k.shown} onChange={value => void flip(k.id, value)} />} />)}</ListGroup>
  </FormSection>;
}
function Profile({ initial, accountName, preview, onPreview }: { initial: SocialProfile; accountName: string; preview: boolean; onPreview: (open: boolean) => void }) {
  const { draft } = usePreferences(), { network } = useMeet(), { userId } = useMember();
  const [p, setProfile] = useState(() => startingProfile(initial, network.profile, accountName, draft)), [interests, setInterests] = useState(p.interests.join(", "));
  const autosave = useAutosave(async (profile: SocialProfile) => {
    try {
      const saved = await saveProfile(profile);
      if (saved.paused && profile.visible) setProfile(current => ({ ...current, visible: false }));
      invalidate("/api/social/"); return true;
    } catch { return false; }
  });
  const seeded = useRef(false);
  // A profile started from this device or the account name is saved once, so it is not lost if left unedited.
  useEffect(() => { if (seeded.current) return; seeded.current = true; if (JSON.stringify(p) !== JSON.stringify(initial)) autosave.change(p); }, [p, initial, autosave]);
  const set = (next: SocialProfile) => { const profile = profileChecklist(next).every(step => step.done) ? next : { ...next, visible: false }; setProfile(profile); autosave.change(profile); };
  const fromFoodChoices = marketIngredients.filter(item => (draft.excluded as string[]).includes(item) && !p.excluded.includes(item)) as MarketIngredient[];
  return <>
    <Completion p={p} />
    <OpenToPlans p={p} set={set} />
    <FormSection title="Picture"><FaceSetup name={p.firstName} hasFace={!!p.hasFace} onChange={hasFace => setProfile(current => ({ ...current, hasFace }))} /></FormSection>
    <BasicsSection p={p} set={set} />
    <FormSection title="Food">
      <View style={{ gap: 6 }}><FieldLabel>Diet</FieldLabel><DietChoices value={p.diets} onChange={diets => set({ ...p, diets })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Practice</FieldLabel><Chips>{meetPractices.map(practice => <Chip key={practice} label={practice} role="checkbox" selected={p.practices.includes(practice)}
        onPress={() => set({ ...p, practices: toggleItem(p.practices, practice) })} />)}</Chips></View>
      <View style={{ gap: 6 }}><View style={common.spread}><FieldLabel>Avoid</FieldLabel>
        {!!fromFoodChoices.length && <Button label="Use My Food Choices" variant="link" onPress={() => set({ ...p, excluded: [...p.excluded, ...fromFoodChoices] })} />}</View>
        <IngredientChoices value={p.excluded} onChange={excluded => set({ ...p, excluded })} /></View>
      <SpotsField p={p} set={set} />
    </FormSection>
    <AboutSection p={p} set={set} />
    <PromptsSection p={p} set={set} />
    <FormSection title="Plans">
      <Field label="Neighbourhood" value={p.area} maxLength={60} placeholder="Bugis" onChangeText={area => set({ ...p, area })} />
      <View style={{ gap: 6 }}><FieldLabel>Group Size</FieldLabel><SizeChoices value={p.size} onChange={size => set({ ...p, size })} /></View>
      <View style={{ gap: 6 }}><FieldLabel>Usually Free</FieldLabel><Chips>{meetTimes.map(time => <Chip key={time} label={time} role="checkbox" selected={p.times.includes(time)} onPress={() => set({ ...p, times: toggleItem(p.times, time) })} />)}</Chips></View>
      <Field label="About" value={p.about} maxLength={180} multiline onChangeText={about => set({ ...p, about })} />
      <Field label="Food Interests" value={interests} maxLength={160} placeholder="Coffee, noodles, brunch" onChangeText={value => {
        setInterests(value); set({ ...p, interests: value.split(",").map(s => s.trim().slice(0, 30)).filter(Boolean).slice(0, 5) }); }} />
    </FormSection>
    <KakiSays />
    <AutosaveStatus saving={autosave.saving} error={autosave.failed ? "Your profile was not saved. Tap Retry." : undefined} />
    {autosave.failed && <Button label="Retry" variant="link" onPress={() => void autosave.flush()} />}
    <Sheet visible={preview} onClose={() => onPreview(false)} title="How Others See You">
      {userId && <PersonCard person={asSeenByOthers(p, userId)} common={[]} />}
    </Sheet>
  </>;
}
