import { useState, type PropsWithChildren } from "react";
import { toggleItem } from "../../utils/list";
import { Pressable, View } from "react-native";
import { Button, Field, Icon, common } from "../ui";
import { Chip, Chips, IconButton } from "../food/Controls";
import { FieldLabel, FormSection, ListGroup, ListItem } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useRemote } from "../../hooks/useRemote";
import { places, placesByIdKey } from "../../services/social-api";
import { commonReligions, educationOptions, ethnicities, familyOptions, genderOptions, habitOptions, hereForOptions, hobbyOptions, languageOptions, petOptions,
  promptBank, religions, whyPlantBased, type HideableField } from "../../config/social-profile";
import type { SocialProfile } from "../../types/community";
import { ageOf } from "../../utils/social-match";
import { PlacePicker } from "./PlacePicker";
import { PlaceThumb } from "./Face";
import { Sheet } from "./Sheet";

export type Edit = { p: SocialProfile; set: (next: SocialProfile) => void };
/** A field label with an eye that shows or hides the field on your profile. */
export function Labelled({ label, field, p, set, children }: PropsWithChildren<Edit & { label: string; field?: HideableField }>) {
  const hidden = !!field && p.hidden.includes(field), { theme } = usePreferences();
  return <View style={{ gap: 6 }}>
    <View style={common.spread}><FieldLabel>{label}</FieldLabel>
      {field && <Pressable accessibilityRole="switch" accessibilityState={{ checked: !hidden }} accessibilityLabel={"Show " + label.toLowerCase() + " on profile"} hitSlop={10}
        onPress={() => set({ ...p, hidden: toggleItem(p.hidden, field) })} style={{ padding: 4 }}>
        <Icon name={hidden ? "eye-off-outline" : "eye-outline"} size={20} color={hidden ? theme.mutedForeground : theme.accent} /></Pressable>}</View>
    {children}
  </View>;
}
function Choice<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: string; onChange: (value: T | "") => void; label: string }) {
  return <Chips label={label}>{options.map(option => <Chip key={option} label={option} role="radio" selected={value === option} onPress={() => onChange(value === option ? "" : option)} />)}</Chips>;
}
function Many({ options, value, onChange, label, max }: { options: readonly string[]; value: string[]; onChange: (value: string[]) => void; label: string; max?: number }) {
  return <Chips label={label} multiple>{options.map(option => <Chip key={option} label={option} role="checkbox" selected={value.includes(option)}
    disabled={!!max && !value.includes(option) && value.length >= max} onPress={() => onChange(toggleItem(value, option))} />)}</Chips>;
}
const numberOrNull = (text: string, min: number, max: number) => { const n = Number(text.replace(/\D/g, "")); return text && n >= min && n <= max ? n : null; };
export function BasicsSection({ p, set }: Edit) {
  const [allFaiths, setAllFaiths] = useState(false), age = ageOf(p.birthYear), [ageText, setAgeText] = useState(age ? String(age) : "");
  return <FormSection title="Basics">
    <Field label="First Name" value={p.firstName} maxLength={40} onChangeText={firstName => set({ ...p, firstName })} />
    <Labelled label="Age" field="age" p={p} set={set}><Field label="Age" showLabel={false} value={ageText} keyboardType="number-pad" maxLength={2}
      onChangeText={text => { setAgeText(text); const n = numberOrNull(text, 18, 99); set({ ...p, birthYear: n ? new Date().getFullYear() - n : null }); }} /></Labelled>
    <Labelled label="Here For" p={p} set={set}><Chips label="Here for">{hereForOptions.map(o => <Chip key={o.id} label={o.label} role="radio" selected={p.hereFor === o.id}
      onPress={() => set({ ...p, hereFor: o.id })} />)}</Chips></Labelled>
    <Labelled label="Gender" field="gender" p={p} set={set}><Chips label="Gender">{genderOptions.map(o => <Chip key={o.id} label={o.label} role="radio" selected={p.gender === o.id}
      onPress={() => set({ ...p, gender: p.gender === o.id ? "" : o.id })} />)}</Chips></Labelled>
    <Labelled label="Religion" field="religion" p={p} set={set}>
      <Choice label="Religion" options={allFaiths || p.religion && !commonReligions.includes(p.religion as never) ? religions : commonReligions} value={p.religion} onChange={religion => set({ ...p, religion })} />
      {!allFaiths && <Button label="More" variant="link" onPress={() => setAllFaiths(true)} />}</Labelled>
    <Labelled label="Ethnicity" field="ethnicity" p={p} set={set}><Choice label="Ethnicity" options={ethnicities} value={p.ethnicity} onChange={ethnicity => set({ ...p, ethnicity })} /></Labelled>
  </FormSection>;
}
/** Up to three usual spots from Explore; members in your area see the popular ones. */
export function SpotsField({ p, set }: Edit) {
  const [open, setOpen] = useState(false), key = placesByIdKey(p.spots), remote = useRemote(key, signal => places(key!, signal));
  const byId = new Map((remote.data?.items ?? []).map(place => [place.id, place]));
  return <Labelled label="Usual Spots" field="spots" p={p} set={set}>
    {!!p.spots.length && <ListGroup>{p.spots.map(id => { const place = byId.get(id);
      return <ListItem key={id} title={place?.name ?? "Place"} subtitle={place?.branch || undefined} leading={<PlaceThumb place={place ?? null} size={40} radius={10} />}
        trailing={<IconButton label={"Remove " + (place?.name ?? "place")} icon="close" onPress={() => set({ ...p, spots: p.spots.filter(s => s !== id) })} />} />; })}</ListGroup>}
    {p.spots.length < 3 && <Button label="Add A Spot" icon="add" variant="secondary" onPress={() => setOpen(true)} />}
    <PlacePicker visible={open} onClose={() => setOpen(false)} title="Add A Usual Spot" onPick={place => set({ ...p, spots: [...new Set([...p.spots, place.id])].slice(0, 3) })} />
  </Labelled>;
}
export function AboutSection({ p, set }: Edit) {
  const [allHobbies, setAllHobbies] = useState(false), [height, setHeight] = useState(p.height ? String(p.height) : "");
  return <FormSection title="About">
    <Labelled label="Hobbies" field="hobbies" p={p} set={set}><Many label="Hobbies" max={12} options={allHobbies ? hobbyOptions : [...new Set([...hobbyOptions.slice(0, 16), ...p.hobbies])]}
      value={p.hobbies} onChange={hobbies => set({ ...p, hobbies })} />{!allHobbies && <Button label="More Hobbies" variant="link" onPress={() => setAllHobbies(true)} />}</Labelled>
    <Labelled label="Languages" field="languages" p={p} set={set}><Many label="Languages" options={languageOptions} value={p.languages} onChange={languages => set({ ...p, languages })} /></Labelled>
    <Labelled label="Why Plant-Based" field="why" p={p} set={set}><Many label="Why plant-based" options={whyPlantBased} value={p.why} onChange={why => set({ ...p, why })} /></Labelled>
    <Labelled label="Education" field="education" p={p} set={set}><Choice label="Education" options={educationOptions} value={p.education} onChange={education => set({ ...p, education })} /></Labelled>
    <Labelled label="Work" field="work" p={p} set={set}><Field label="Work" showLabel={false} value={p.work} maxLength={40} placeholder="Nurse, civil service, runs a bakery" onChangeText={work => set({ ...p, work })} /></Labelled>
    <Labelled label="Grew Up In" field="grewUp" p={p} set={set}><Field label="Grew up in" showLabel={false} value={p.grewUp} maxLength={40} placeholder="Singapore" onChangeText={grewUp => set({ ...p, grewUp })} /></Labelled>
    <Labelled label="Height (cm)" field="height" p={p} set={set}><Field label="Height in centimetres" showLabel={false} value={height} keyboardType="number-pad" maxLength={3}
      onChangeText={text => { setHeight(text); set({ ...p, height: numberOrNull(text, 120, 230) }); }} /></Labelled>
    <Labelled label="Drinking" field="drinking" p={p} set={set}><Choice label="Drinking" options={habitOptions} value={p.drinking} onChange={drinking => set({ ...p, drinking })} /></Labelled>
    <Labelled label="Smoking" field="smoking" p={p} set={set}><Choice label="Smoking" options={habitOptions} value={p.smoking} onChange={smoking => set({ ...p, smoking })} /></Labelled>
    {p.hereFor === "more" && <Labelled label="Family Plans" field="family" p={p} set={set}><Choice label="Family plans" options={familyOptions} value={p.family} onChange={family => set({ ...p, family })} /></Labelled>}
    <Labelled label="Pets" field="pets" p={p} set={set}><Many label="Pets" options={petOptions} value={p.pets} onChange={pets => set({ ...p, pets })} /></Labelled>
  </FormSection>;
}
/** Three prompts from the bank, each answered in 100 characters, plus the question invitations must answer. */
export function PromptsSection({ p, set }: Edit) {
  const [picking, setPicking] = useState<number | null>(null), slots = [0, 1, 2];
  const answer = (index: number, a: string) => set({ ...p, prompts: p.prompts.map((item, i) => i === index ? { ...item, a } : item) });
  return <FormSection title="Prompts">
    {slots.map(index => { const item = p.prompts[index];
      return item ? <View key={item.q} style={{ gap: 6 }}>
        <View style={common.spread}><FieldLabel>{item.q}</FieldLabel><IconButton label={"Remove " + item.q} icon="close" onPress={() => set({ ...p, prompts: p.prompts.filter((_, i) => i !== index) })} /></View>
        <Field label={item.q} showLabel={false} value={item.a} maxLength={100} multiline onChangeText={a => answer(index, a)} />
      </View> : index === p.prompts.length ? <Button key={index} label="Add A Prompt" icon="add" variant="secondary" onPress={() => setPicking(index)} /> : null; })}
    <Field label="Opening Question" value={p.opening} maxLength={120} placeholder="What's your go-to hawker order?" onChangeText={opening => set({ ...p, opening })} />
    <Sheet visible={picking !== null} onClose={() => setPicking(null)} title="Choose A Prompt">
      <ListGroup>{promptBank.filter(q => !p.prompts.some(item => item.q === q)).map(q => <ListItem key={q} title={q} onPress={() => {
        set({ ...p, prompts: [...p.prompts, { q, a: "" }].slice(0, 3) }); setPicking(null); }} />)}</ListGroup>
    </Sheet>
  </FormSection>;
}
