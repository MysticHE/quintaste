import { useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { View } from "react-native";
import { Button, Field, Icon, T } from "../ui";
import { Chip, Chips, IconButton, SearchField } from "../food/Controls";
import { DateField } from "../DateField";
import { FieldLabel, ListGroup, ListItem, ThemedSwitch } from "../GroupedList";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { dietLabels, toggleLabel } from "../../config/diet-labels";
import { educationOptions, ethnicities, genderOptions, habitOptions, hobbyOptions, languageOptions, petOptions, religions, whyPlantBased,
  type HideableField } from "../../config/social-profile";
import { sgAreas } from "../../config/sg-areas";
import type { SocialPlace, SocialProfile } from "../../types/community";
import { PlacePicker } from "./PlacePicker";
import { PlaceThumb } from "./Face";
import { Sheet } from "./Sheet";

type Edit = { value: SocialProfile; onChange: (next: SocialProfile) => void };
/** Chips with their question shown above them (the chip row's own label is read by screen readers only). */
export function ChoiceGroup({ label, multiple = false, children }: PropsWithChildren<{ label: string; multiple?: boolean }>) {
  return <View style={{ gap: 6 }}><FieldLabel>{label}</FieldLabel><Chips label={label} multiple={multiple}>{children}</Chips></View>;
}
const toggle = <T,>(list: readonly T[], item: T, max = 99) => list.includes(item) ? list.filter(x => x !== item) : list.length < max ? [...list, item] : [...list];
const yearsAgo = (years: number) => { const d = new Date(Date.now() + 8 * 3600000); d.setUTCFullYear(d.getUTCFullYear() - years); return d.toISOString().slice(0, 10); };

/** A planning area from the URA list: a button that opens a searchable list. */
export function AreaField({ value, onChange, label }: { value: string; onChange: (area: string) => void; label?: string }) {
  const t = useT("social"), { theme } = usePreferences(), [open, setOpen] = useState(false), [query, setQuery] = useState("");
  const shown = useMemo(() => sgAreas.filter(area => area.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return <View style={{ gap: 6 }}>
    <FieldLabel>{label ?? t("area")}</FieldLabel>
    <Button label={value || t("chooseArea")} icon="location-outline" variant="secondary" onPress={() => setOpen(true)} />
    <Sheet visible={open} onClose={() => setOpen(false)} title={t("chooseArea")}>
      <SearchField value={query} onChange={setQuery} placeholder={t("areaSearch")} />
      {shown.length ? <ListGroup>{shown.map(area => <ListItem key={area} title={area} trailing={area === value ? <Icon name="checkmark" size={20} color={theme.accent} /> : <View />}
        onPress={() => { onChange(area); setOpen(false); setQuery(""); }} />)}</ListGroup> : <T muted>{t("noAreas")}</T>}
    </Sheet>
  </View>;
}
/** Name, gender, birth date (18+; only the age is shown) and area. Gender and birth date lock once a selfie is sent. */
/** `afterName` sits under First name (the handle on My Profile > Basics; setup leaves it out). */
export function BasicsFields({ value: p, onChange, locked, afterName }: Edit & { locked: boolean; afterName?: ReactNode }) {
  const t = useT("social");
  return <View style={{ gap: 14 }}>
    <Field label={t("firstName")} value={p.firstName} onChangeText={firstName => onChange({ ...p, firstName })} maxLength={40} autoCapitalize="words" />
    {afterName}
    <ChoiceGroup label={t("gender")}>{genderOptions.map(g => <Chip key={g.id} label={t("optGender", { value: g.id })} role="radio" disabled={locked}
      selected={p.gender === g.id} onPress={() => onChange({ ...p, gender: g.id })} />)}</ChoiceGroup>
    <DateField label={t("birthDate")} value={p.birthDate ?? ""} onChange={birthDate => onChange({ ...p, birthDate })} disabled={locked}
      minimum="1920-01-01" maximum={yearsAgo(18)} />
    {locked && <T variant="small" muted>{t("genderLock")}</T>}
    <AreaField value={p.area} onChange={area => onChange({ ...p, area })} />
  </View>;
}
/** Diet labels: Plant-Based alone, or Vegan and/or Vegetarian, with the link that explains each rule. */
export function DietChoices({ value, onChange }: { value: SocialProfile["diets"]; onChange: (next: SocialProfile["diets"]) => void }) {
  const { theme } = usePreferences(), t = useT("social"), text = useDietText();
  return <View style={{ gap: 6 }}>
    <ChoiceGroup label={t("diet")} multiple>{dietLabels.map(label => <Chip key={label} label={text.name(label)} role="checkbox" selected={value.includes(label)}
      leading={<DietIcon diet={label} size={20} color={value.includes(label) ? theme.accent : theme.mutedForeground} />} onPress={() => onChange(toggleLabel(value, label))} />)}</ChoiceGroup>
  </View>;
}
function Multi({ label, options, value, onChange, word, max }: { label: string; options: readonly string[]; value: string[]; onChange: (next: string[]) => void;
  word: (value: string) => string; max?: number }) {
  return <ChoiceGroup label={label} multiple>{options.map(option => <Chip key={option} label={word(option)} role="checkbox" compact selected={value.includes(option)}
    onPress={() => onChange(toggle(value, option, max))} />)}</ChoiceGroup>;
}
function One({ label, options, value, onChange, word }: { label: string; options: readonly string[]; value: string; onChange: (next: string) => void; word: (value: string) => string }) {
  return <ChoiceGroup label={label}>{options.map(option => <Chip key={option} label={word(option)} role="radio" compact selected={value === option}
    onPress={() => onChange(value === option ? "" : option)} />)}</ChoiceGroup>;
}
/** Diet, ingredients to avoid and up to three favourite catalogue places. */
/** Favourite places only (owner, 25 Oct 2026): the profile's diet labels follow Food Choices (useProfileDietSync). */
export function FoodFields({ value: p, onChange, places }: Edit & { places: SocialPlace[] }) {
  const t = useT("social"), [picking, setPicking] = useState(false), [added, setAdded] = useState<SocialPlace[]>([]);
  const known = [...places, ...added.filter(a => !places.some(place => place.id === a.id))];
  return <View style={{ gap: 14 }}>
    <View style={{ gap: 8 }}>
      <FieldLabel>{t("favouritePlaces")}</FieldLabel>
      {!!p.spots.length && <ListGroup inset={64}>{p.spots.map(id => known.find(place => place.id === id)).filter((place): place is SocialPlace => !!place).map(place =>
        <ListItem key={place.id} title={place.name} subtitle={place.branch || undefined} leading={<PlaceThumb place={place} size={44} radius={10} />}
          trailing={<IconButton label={t("removePlace", { name: place.name })} icon="close" appearance="plain" onPress={() => onChange({ ...p, spots: p.spots.filter(spot => spot !== place.id) })} />} />)}</ListGroup>}
      {p.spots.length < 3 && <Button label={t("addPlace")} icon="add" variant="secondary" onPress={() => setPicking(true)} />}
    </View>
    <PlacePicker visible={picking} onClose={() => setPicking(false)} onPick={place => { setAdded(list => [...list, place]); onChange({ ...p, spots: [...new Set([...p.spots, place.id])].slice(0, 3) }); }} />
  </View>;
}
/** The short About and the hobbies and languages shown on cards; `details` adds the optional facts and what to show. */
export function AboutFields({ value: p, onChange, details = false }: Edit & { details?: boolean }) {
  const t = useT("social"), set = (patch: Partial<SocialProfile>) => onChange({ ...p, ...patch });
  return <View style={{ gap: 14 }}>
    <Field label={t("aboutMe")} value={p.about} onChangeText={about => set({ about })} placeholder={t("aboutHint")} maxLength={180} multiline />
    <Multi label={t("hobbies")} options={hobbyOptions} value={p.hobbies} max={12} word={value => t("optHobby", { value })} onChange={hobbies => set({ hobbies })} />
    <Multi label={t("languages")} options={languageOptions} value={p.languages} word={value => t("optLanguage", { value })} onChange={languages => set({ languages })} />
    {details && <Details value={p} onChange={onChange} />}
  </View>;
}
const shownFields: [HideableField, "religion" | "ethnicity" | "whyPlantBased" | "hobbies" | "languages" | "education" | "work" | "grewUp" | "height" | "drinking" | "smoking" | "pets" | "favouritePlaces"][] = [
  ["hobbies", "hobbies"], ["languages", "languages"], ["why", "whyPlantBased"], ["work", "work"], ["education", "education"], ["grewUp", "grewUp"], ["height", "height"],
  ["drinking", "drinking"], ["smoking", "smoking"], ["pets", "pets"], ["religion", "religion"], ["ethnicity", "ethnicity"], ["spots", "favouritePlaces"]];
function Details({ value: p, onChange }: Edit) {
  const t = useT("social"), set = (patch: Partial<SocialProfile>) => onChange({ ...p, ...patch });
  return <>
    <Multi label={t("whyPlantBased")} options={whyPlantBased} value={p.why} word={value => t("optWhy", { value })} onChange={why => set({ why })} />
    <Field label={t("work")} value={p.work} onChangeText={work => set({ work })} maxLength={40} />
    <One label={t("education")} options={educationOptions} value={p.education} word={value => t("optEducation", { value })} onChange={education => set({ education })} />
    <Field label={t("grewUp")} value={p.grewUp} onChangeText={grewUp => set({ grewUp })} maxLength={40} />
    <Field label={t("height")} value={p.height ? String(p.height) : ""} keyboardType="number-pad" maxLength={3}
      onChangeText={text => { const n = Number(text.replace(/\D/g, "")); set({ height: n >= 120 && n <= 230 ? n : null }); }} />
    <One label={t("drinking")} options={habitOptions} value={p.drinking} word={value => t("optHabit", { value })} onChange={drinking => set({ drinking })} />
    <One label={t("smoking")} options={habitOptions} value={p.smoking} word={value => t("optHabit", { value })} onChange={smoking => set({ smoking })} />
    {/* None is exclusive: choosing it clears the pets, choosing a pet clears None. */}
    <Multi label={t("pets")} options={petOptions} value={p.pets} word={value => t("optPet", { value })}
      onChange={pets => set({ pets: pets.includes("None") && !p.pets.includes("None") ? ["None"] : pets.length > 1 ? pets.filter(pet => pet !== "None") : pets })} />
    <One label={t("religion")} options={religions} value={p.religion} word={value => t("optReligion", { value })} onChange={religion => set({ religion })} />
    <One label={t("ethnicity")} options={ethnicities} value={p.ethnicity} word={value => t("optEthnicity", { value })} onChange={ethnicity => set({ ethnicity })} />
    <ListGroup title={t("showOnProfile")}>{shownFields.map(([field, key]) => <ListItem key={field} title={t(key)}
      trailing={<ThemedSwitch label={t(key)} value={!p.hidden.includes(field)} onChange={on => set({ hidden: on ? p.hidden.filter(h => h !== field) : [...p.hidden, field] })} />} />)}</ListGroup>
  </>;
}
