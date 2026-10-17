import { useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Chip, Chips, EmptyState } from "../../components/food/Controls";
import { Field, T } from "../../components/ui";
import { IngredientCheck } from "../../components/market/Ingredients";
import { Action, Confirm, goToPlans } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { FieldLabel, FormSection, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { applications, deleteApplication, saveApplication } from "../../services/social-api";
import { hostDeclarations, premisesTypes } from "../../types/meet";
import type { HostApplication } from "../../types/community";
import { applicationIssue, largeHdbSession } from "../../utils/meet";

export function MeetApplicationScreen() {
  const { id = "", kind } = useLocalSearchParams<{ id: string; kind?: string }>(), { member } = useMember();
  const remote = useRemote(member && id !== "new" ? "/api/social/applications" : null, applications), saved = remote.data?.items.find(a => a.id === id);
  const home = (saved?.kind ?? (kind === "home" ? "Home dining" : "Cooking class")) === "Home dining";
  return <Screen title={home ? "Home Dining" : "Cooking Class"} backTo="/social"><MemberGate>
    {id === "new" ? <Application key="new" kind={home ? "Home dining" : "Cooking class"} />
      : saved ? <Application key={saved.id} initial={saved} kind={saved.kind} />
      : remote.data ? <EmptyState title="Application Unavailable" text="" /> : <RemoteStatus remote={remote} icon="document-text-outline" returnTo="/social" />}
  </MemberGate></Screen>;
}
type Text = "name" | "email" | "area" | "experience" | "menu" | "ingredients" | "details";
const blank = (kind: HostApplication["kind"]): HostApplication => ({ kind, name: "", email: "", area: "", experience: "", menu: "", ingredients: "", details: "",
  premises: "", capacity: "", halal: "", declarations: [], consent: false });
function Premises({ a, update }: { a: HostApplication; update: (patch: Partial<HostApplication>) => void }) {
  const { theme } = usePreferences();
  return <FormSection title="Premises">
    <Chips label="Premises">{premisesTypes.map(p => <Chip key={p} label={p} role="radio" compact selected={a.premises === p} onPress={() => update({ premises: p })} />)}</Chips>
    <Field label={a.kind === "Home dining" ? "Guests Per Session" : "Students Per Class"} value={a.capacity} maxLength={2} keyboardType="number-pad" onChangeText={capacity => update({ capacity: capacity.replace(/\D/g, "") })} />
    {largeHdbSession(a) && <T variant="small" color={theme.warning}>HDB sessions above 3 people are reviewed</T>}
    <FieldLabel>Halal Status</FieldLabel>
    <Chips label="Halal status">{(["Not halal-certified", "Halal-certified"] as const).map(h => <Chip key={h} label={h} role="radio" compact selected={a.halal === h} onPress={() => update({ halal: h })} />)}</Chips>
  </FormSection>;
}
/** A sent application is read-only while it waits in the staff review queue. */
function Submitted({ a }: { a: HostApplication }) {
  return <>
    <View style={{ alignItems: "flex-start" }}><StatusPill label="In review" tone="accent" /></View>
    <ListGroup>
      <ListItem title={a.name} subtitle={a.email} leading={<RowIcon name="person-outline" />} />
      <ListItem title={a.area} leading={<RowIcon name="location-outline" />} />
      <ListItem title={[a.premises, a.capacity + " per session", a.halal].filter(Boolean).join(" · ")} leading={<RowIcon name="home-outline" />} wrap />
    </ListGroup>
    <View style={{ alignItems: "center" }}><Confirm link label="Withdraw Application" action="Withdraw" text="Withdraw and delete this application?"
      run={async () => { if (a.id) await deleteApplication(a.id); invalidate("/api/social/applications"); goToPlans(); return true; }} /></View>
  </>;
}
function Application({ initial, kind }: { initial?: HostApplication; kind: HostApplication["kind"] }) {
  const [a, set] = useState<HostApplication>(() => initial ?? blank(kind)), [dirty, setDirty] = useState(false);
  if (initial?.state === "submitted") return <Submitted a={initial} />;
  const update = (patch: Partial<HostApplication>) => { set({ ...a, ...patch }); setDirty(true); };
  const field = (key: Text, label: string, maxLength: number, multiline = false) => <Field label={label} value={a[key]} maxLength={maxLength} multiline={multiline} onChangeText={value => update({ [key]: value })} />;
  const save = async (submit: boolean) => {
    const issue = submit ? applicationIssue(a) : null; if (issue) throw new Error(issue);
    const saved = await saveApplication(initial?.id ?? null, a, submit);
    invalidate("/api/social/applications"); setDirty(false);
    if (submit) goToPlans(); else if (!initial) router.replace(("/social/application/" + saved.id) as Href);
  };
  const home = a.kind === "Home dining";
  return <>
    <View style={{ alignItems: "flex-start" }}><StatusPill label={dirty ? "Unsaved" : initial ? "Draft" : "New"} /></View>
    <FormSection title="Contact">
      {field("name", home ? "Host or Business Name" : "Instructor or Organisation", 80)}{field("email", "Email", 160)}{field("area", "Neighbourhood", 60)}
    </FormSection>
    <FormSection title={home ? "Dining" : "Class"}>
      {field("experience", home ? "Hosting Experience & Food Handling" : "Teaching Experience", 1000, true)}
      {field("menu", home ? "Sample Menu" : "Recipes, Lesson Plan & Duration", 2000, true)}
      {field("ingredients", "Ingredients & Allergens", 3000, true)}
      {field("details", home ? "Seating & Accessibility" : "Venue & Equipment", 2000, true)}
    </FormSection>
    <Premises a={a} update={update} />
    <FormSection title="Declarations">
      {hostDeclarations.map(d => <IngredientCheck key={d} label={d} checked={a.declarations.includes(d)} onPress={() => update({ declarations: a.declarations.includes(d) ? a.declarations.filter(x => x !== d) : [...a.declarations, d] })} />)}
      <IngredientCheck label="These details are accurate" checked={a.consent} onPress={() => update({ consent: !a.consent })} />
    </FormSection>
    <Action label="Submit For Review" icon="send-outline" run={() => save(true)} />
    <Action label="Save Draft" secondary disabled={!dirty} run={() => save(false)} />
    {initial?.id && <View style={{ alignItems: "center" }}><Confirm link label="Delete Application" action="Delete" text="Delete this application?"
      run={async () => { await deleteApplication(initial.id!); invalidate("/api/social/applications"); goToPlans(); return true; }} /></View>}
  </>;
}
