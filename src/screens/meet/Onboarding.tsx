import { useState } from "react";
import { toggleItem } from "../../utils/list";
import { router } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { Chip, Chips } from "../../components/food/Controls";
import { DietChoices, MemberGate, useSocialMe } from "../../components/social/MeetUI";
import { FaceSetup } from "../../components/social/FaceSetup";
import { Labelled, SpotsField } from "../../components/social/ProfileSections";
import { Action } from "../../components/social/Shared";
import { AreaParticipationRow } from "../../components/areas/AreaParticipationRow";
import { FieldLabel, ListGroup, ListItem, RowIcon, StatusPill, ThemedSwitch } from "../../components/GroupedList";
import { useMeet } from "../../hooks/useMeet";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { myAreas } from "../../services/areas-api";
import { planningAreaByCode } from "../../utils/planning-area";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { saveProfile } from "../../services/social-api";
import { findPlace } from "../../hooks/usePrivatePlaceEditor";
import { commonReligions, genderOptions, hereForOptions, languageOptions } from "../../config/social-profile";
import { meetTimes } from "../../types/meet";
import { profileReady } from "../../utils/meet";
import type { SocialProfile } from "../../types/community";
import { startingProfile } from "./Profile";

/** Set when the member skips, so Social does not reopen setup in this app session. */
export const skippedWelcome = { current: false };
const steps = ["See who eats near you", "Your picture", "The basics", "Where you eat"] as const;
export function MeetWelcomeScreen() {
  const remote = useSocialMe();
  return <MemberGate returnTo="/social/welcome">{remote.data && <Welcome initial={remote.data.profile} accountName={remote.data.accountName} />}</MemberGate>;
}
/** Home and Work: counted on the account already, a saved place to count, or a place to add. */
function Areas() {
  const { doc } = useFood(), mine = useRemote("/api/areas/me", myAreas).data;
  return <ListGroup>{(["home", "work"] as const).map(kind => {
    const place = findPlace(doc.privatePlaces, { kind }), counted = mine?.[kind], icon = kind === "home" ? "home-outline" : "briefcase-outline", title = kind === "home" ? "Home" : "Work";
    if (counted) return <ListItem key={kind} title={title} subtitle={planningAreaByCode.get(counted.area)?.name ?? counted.area} leading={<RowIcon name={icon} />}
      trailing={<StatusPill label="Counted" tone="success" />} />;
    return place?.point ? <View key={kind} style={{ gap: 4 }}><ListItem title={title} subtitle={place.address} leading={<RowIcon name={icon} />} />
      <AreaParticipationRow layer={kind} point={place.point} /></View>
      : <ListItem key={kind} title={"Add " + title} leading={<RowIcon name={icon} tone="muted" />} onPress={() => router.push({ pathname: "/location-place", params: { kind } })} />; })}</ListGroup>;
}
function Basics({ p, set }: { p: SocialProfile; set: (next: SocialProfile) => void }) {
  return <>
    <Field label="First Name" value={p.firstName} maxLength={40} onChangeText={firstName => set({ ...p, firstName })} />
    <View style={{ gap: 6 }}><FieldLabel>Here For</FieldLabel><Chips label="Here for">{hereForOptions.map(o => <Chip key={o.id} label={o.label} role="radio" selected={p.hereFor === o.id} onPress={() => set({ ...p, hereFor: o.id })} />)}</Chips></View>
    <Labelled label="Gender" field="gender" p={p} set={set}><Chips label="Gender">{genderOptions.map(o => <Chip key={o.id} label={o.label} role="radio" selected={p.gender === o.id} onPress={() => set({ ...p, gender: o.id })} />)}</Chips></Labelled>
    <Labelled label="Religion" field="religion" p={p} set={set}><Chips label="Religion">{commonReligions.map(r => <Chip key={r} label={r} role="radio" selected={p.religion === r} onPress={() => set({ ...p, religion: p.religion === r ? "" : r })} />)}</Chips></Labelled>
    <View style={{ gap: 6 }}><FieldLabel>Diet</FieldLabel><DietChoices value={p.diets} onChange={diets => set({ ...p, diets })} /></View>
    <Labelled label="Languages" field="languages" p={p} set={set}><Chips label="Languages" multiple>{languageOptions.slice(0, 7).map(l => <Chip key={l} label={l} role="checkbox" selected={p.languages.includes(l)} onPress={() => set({ ...p, languages: toggleItem(p.languages, l) })} />)}</Chips></Labelled>
  </>;
}
function Places({ p, set }: { p: SocialProfile; set: (next: SocialProfile) => void }) {
  return <>
    <Field label="Neighbourhood" value={p.area} maxLength={60} placeholder="Bugis" onChangeText={area => set({ ...p, area })} />
    <View style={{ gap: 6 }}><FieldLabel>Usually Free</FieldLabel><Chips label="Usually free" multiple>{meetTimes.map(time => <Chip key={time} label={time} role="checkbox" selected={p.times.includes(time)} onPress={() => set({ ...p, times: toggleItem(p.times, time) })} />)}</Chips></View>
    <SpotsField p={p} set={set} />
    <ListGroup><ListItem title="Open To Plans" leading={<RowIcon name="people-outline" />} trailing={<ThemedSwitch label="Open to plans" value={p.visible} disabled={!profileReady(p)} onChange={visible => set({ ...p, visible })} />} /></ListGroup>
  </>;
}
/** Four short steps; every Continue saves, Skip leaves for Social with what is saved so far. */
function Welcome({ initial, accountName }: { initial: SocialProfile; accountName: string }) {
  const { draft, theme } = usePreferences(), { network } = useMeet(), [step, setStep] = useState(0);
  const [p, setP] = useState(() => startingProfile(initial, network.profile, accountName, draft));
  const set = (next: SocialProfile) => setP(profileReady(next) ? next : { ...next, visible: false });
  const leave = () => { skippedWelcome.current = true; invalidate("/api/social/"); router.replace("/social"); };
  const next = async () => { if (step >= 2) await saveProfile(p); if (step === steps.length - 1) leave(); else setStep(step + 1); };
  return <Screen title={steps[step]} backTo="/social" headerAction={<Button label="Skip" variant="link" onPress={leave} />}
    footer={<Action label={step === steps.length - 1 ? "Done" : "Continue"} disabled={step === 2 && !p.firstName.trim()} run={next} />}>
    <View style={[common.row, { gap: 6 }]} accessibilityLabel={`Step ${step + 1} of ${steps.length}`}>
      {steps.map((title, index) => <View key={title} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: index <= step ? theme.accent : theme.muted }} />)}</View>
    {step === 0 && <><T muted>Only the planning area is shared.</T><Areas /></>}
    {step === 1 && <FaceSetup name={p.firstName} hasFace={!!p.hasFace} onChange={hasFace => setP({ ...p, hasFace })} />}
    {step === 2 && <Basics p={p} set={set} />}
    {step === 3 && <Places p={p} set={set} />}
  </Screen>;
}
