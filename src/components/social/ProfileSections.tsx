import { useState, type PropsWithChildren } from "react";
import { toggleItem } from "../../utils/list";
import { Pressable, View } from "react-native";
import { Button, Field, Icon, common } from "../ui";
import { Chip, Chips, IconButton } from "../food/Controls";
import { FieldLabel, FormSection, ListGroup, ListItem } from "../GroupedList";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
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
  const hidden = !!field && p.hidden.includes(field), { theme } = usePreferences(), t = useT("social");
  return <View style={{ gap: 6 }}>
    <View style={common.spread}><FieldLabel>{label}</FieldLabel>
      {field && <Pressable accessibilityRole="switch" accessibilityState={{ checked: !hidden }} accessibilityLabel={t("showOnProfile", { label: label.toLowerCase() })} hitSlop={10}
        onPress={() => set({ ...p, hidden: toggleItem(p.hidden, field) })} style={{ padding: 4 }}>
        <Icon name={hidden ? "eye-off-outline" : "eye-outline"} size={20} color={hidden ? theme.mutedForeground : theme.accent} /></Pressable>}</View>
    {children}
  </View>;
}
type Show = (value: string) => string;
function Choice<T extends string>({ options, value, onChange, label, show }: { options: readonly T[]; value: string; onChange: (value: T | "") => void; label: string; show: Show }) {
  return <Chips label={label}>{options.map(option => <Chip key={option} label={show(option)} role="radio" selected={value === option} onPress={() => onChange(value === option ? "" : option)} />)}</Chips>;
}
function Many({ options, value, onChange, label, max, show }: { options: readonly string[]; value: string[]; onChange: (value: string[]) => void; label: string; max?: number; show: Show }) {
  return <Chips label={label} multiple>{options.map(option => <Chip key={option} label={show(option)} role="checkbox" selected={value.includes(option)}
    disabled={!!max && !value.includes(option) && value.length >= max} onPress={() => onChange(toggleItem(value, option))} />)}</Chips>;
}
const numberOrNull = (text: string, min: number, max: number) => { const n = Number(text.replace(/\D/g, "")); return text && n >= min && n <= max ? n : null; };
export function BasicsSection({ p, set }: Edit) {
  const [allFaiths, setAllFaiths] = useState(false), age = ageOf(p.birthYear), [ageText, setAgeText] = useState(age ? String(age) : ""), t = useT("social"), tc = useT("common");
  return <FormSection title={t("basics")}>
    <Field label={t("firstName")} value={p.firstName} maxLength={40} onChangeText={firstName => set({ ...p, firstName })} />
    <Labelled label={t("age")} field="age" p={p} set={set}><Field label={t("age")} showLabel={false} value={ageText} keyboardType="number-pad" maxLength={2}
      onChangeText={text => { setAgeText(text); const n = numberOrNull(text, 18, 99); set({ ...p, birthYear: n ? new Date().getFullYear() - n : null }); }} /></Labelled>
    <Labelled label={t("hereForTitle")} p={p} set={set}><Chips label={t("hereFor")}>{hereForOptions.map(o => <Chip key={o.id} label={t("optHereFor", { value: o.id })} role="radio" selected={p.hereFor === o.id}
      onPress={() => set({ ...p, hereFor: o.id })} />)}</Chips></Labelled>
    <Labelled label={t("gender")} field="gender" p={p} set={set}><Chips label={t("gender")}>{genderOptions.map(o => <Chip key={o.id} label={t("optGender", { value: o.id })} role="radio" selected={p.gender === o.id}
      onPress={() => set({ ...p, gender: p.gender === o.id ? "" : o.id })} />)}</Chips></Labelled>
    <Labelled label={t("religion")} field="religion" p={p} set={set}>
      <Choice label={t("religion")} options={allFaiths || p.religion && !commonReligions.includes(p.religion as never) ? religions : commonReligions} value={p.religion}
        show={value => t("optReligion", { value })} onChange={religion => set({ ...p, religion })} />
      {!allFaiths && <Button label={tc("more")} variant="link" onPress={() => setAllFaiths(true)} />}</Labelled>
    <Labelled label={t("ethnicity")} field="ethnicity" p={p} set={set}><Choice label={t("ethnicity")} options={ethnicities} value={p.ethnicity}
      show={value => t("optEthnicity", { value })} onChange={ethnicity => set({ ...p, ethnicity })} /></Labelled>
  </FormSection>;
}
/** Up to three usual spots from Explore; members in your area see the popular ones. */
export function SpotsField({ p, set }: Edit) {
  const [open, setOpen] = useState(false), key = placesByIdKey(p.spots), remote = useRemote(key, signal => places(key!, signal)), t = useT("social");
  const byId = new Map((remote.data?.items ?? []).map(place => [place.id, place]));
  return <Labelled label={t("usualSpotsTitle")} field="spots" p={p} set={set}>
    {!!p.spots.length && <ListGroup>{p.spots.map(id => { const place = byId.get(id);
      return <ListItem key={id} title={place?.name ?? t("place")} subtitle={place?.branch || undefined} leading={<PlaceThumb place={place ?? null} size={40} radius={10} />}
        trailing={<IconButton label={t("removeName", { name: place?.name ?? t("placeLower") })} icon="close" onPress={() => set({ ...p, spots: p.spots.filter(s => s !== id) })} />} />; })}</ListGroup>}
    {p.spots.length < 3 && <Button label={t("addSpot")} icon="add" variant="secondary" onPress={() => setOpen(true)} />}
    <PlacePicker visible={open} onClose={() => setOpen(false)} title={t("addUsualSpot")} onPick={place => set({ ...p, spots: [...new Set([...p.spots, place.id])].slice(0, 3) })} />
  </Labelled>;
}
export function AboutSection({ p, set }: Edit) {
  const [allHobbies, setAllHobbies] = useState(false), [height, setHeight] = useState(p.height ? String(p.height) : ""), t = useT("social");
  const shows = (key: "optHobby" | "optLanguage" | "optWhy" | "optEducation" | "optHabit" | "optFamily" | "optPet"): Show => value => t(key, { value });
  return <FormSection title={t("about")}>
    <Labelled label={t("hobbies")} field="hobbies" p={p} set={set}><Many label={t("hobbies")} show={shows("optHobby")} max={12} options={allHobbies ? hobbyOptions : [...new Set([...hobbyOptions.slice(0, 16), ...p.hobbies])]}
      value={p.hobbies} onChange={hobbies => set({ ...p, hobbies })} />{!allHobbies && <Button label={t("moreHobbies")} variant="link" onPress={() => setAllHobbies(true)} />}</Labelled>
    <Labelled label={t("languages")} field="languages" p={p} set={set}><Many label={t("languages")} show={shows("optLanguage")} options={languageOptions} value={p.languages} onChange={languages => set({ ...p, languages })} /></Labelled>
    <Labelled label={t("whyPlantBasedTitle")} field="why" p={p} set={set}><Many label={t("whyPlantBased")} show={shows("optWhy")} options={whyPlantBased} value={p.why} onChange={why => set({ ...p, why })} /></Labelled>
    <Labelled label={t("education")} field="education" p={p} set={set}><Choice label={t("education")} show={shows("optEducation")} options={educationOptions} value={p.education} onChange={education => set({ ...p, education })} /></Labelled>
    <Labelled label={t("job")} field="work" p={p} set={set}><Field label={t("job")} showLabel={false} value={p.work} maxLength={40} placeholder={t("workHint")} onChangeText={work => set({ ...p, work })} /></Labelled>
    <Labelled label={t("grewUpInTitle")} field="grewUp" p={p} set={set}><Field label={t("grewUpIn")} showLabel={false} value={p.grewUp} maxLength={40} placeholder={t("grewUpHint")} onChangeText={grewUp => set({ ...p, grewUp })} /></Labelled>
    <Labelled label={t("heightTitle")} field="height" p={p} set={set}><Field label={t("height")} showLabel={false} value={height} keyboardType="number-pad" maxLength={3}
      onChangeText={text => { setHeight(text); set({ ...p, height: numberOrNull(text, 120, 230) }); }} /></Labelled>
    <Labelled label={t("drinking")} field="drinking" p={p} set={set}><Choice label={t("drinking")} show={shows("optHabit")} options={habitOptions} value={p.drinking} onChange={drinking => set({ ...p, drinking })} /></Labelled>
    <Labelled label={t("smoking")} field="smoking" p={p} set={set}><Choice label={t("smoking")} show={shows("optHabit")} options={habitOptions} value={p.smoking} onChange={smoking => set({ ...p, smoking })} /></Labelled>
    {p.hereFor === "more" && <Labelled label={t("familyPlansTitle")} field="family" p={p} set={set}><Choice label={t("familyPlans")} show={shows("optFamily")} options={familyOptions} value={p.family} onChange={family => set({ ...p, family })} /></Labelled>}
    <Labelled label={t("pets")} field="pets" p={p} set={set}><Many label={t("pets")} show={shows("optPet")} options={petOptions} value={p.pets} onChange={pets => set({ ...p, pets })} /></Labelled>
  </FormSection>;
}
/** Three prompts from the bank, each answered in 100 characters, plus the question invitations must answer. */
export function PromptsSection({ p, set }: Edit) {
  const [picking, setPicking] = useState<number | null>(null), slots = [0, 1, 2], t = useT("social"), question = (q: string) => t("optPrompt", { value: q });
  const answer = (index: number, a: string) => set({ ...p, prompts: p.prompts.map((item, i) => i === index ? { ...item, a } : item) });
  return <FormSection title={t("prompts")}>
    {slots.map(index => { const item = p.prompts[index];
      return item ? <View key={item.q} style={{ gap: 6 }}>
        <View style={common.spread}><FieldLabel>{question(item.q)}</FieldLabel><IconButton label={t("removeName", { name: question(item.q) })} icon="close" onPress={() => set({ ...p, prompts: p.prompts.filter((_, i) => i !== index) })} /></View>
        <Field label={question(item.q)} showLabel={false} value={item.a} maxLength={100} multiline onChangeText={a => answer(index, a)} />
      </View> : index === p.prompts.length ? <Button key={index} label={t("addPrompt")} icon="add" variant="secondary" onPress={() => setPicking(index)} /> : null; })}
    <Field label={t("openingQuestion")} value={p.opening} maxLength={120} placeholder={t("openingHint")} onChangeText={opening => set({ ...p, opening })} />
    <Sheet visible={picking !== null} onClose={() => setPicking(null)} title={t("choosePrompt")}>
      <ListGroup>{promptBank.filter(q => !p.prompts.some(item => item.q === q)).map(q => <ListItem key={q} title={question(q)} onPress={() => {
        set({ ...p, prompts: [...p.prompts, { q, a: "" }].slice(0, 3) }); setPicking(null); }} />)}</ListGroup>
    </Sheet>
  </FormSection>;
}
