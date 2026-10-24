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
import { useLanguage, useT } from "../../i18n";

export function MeetApplicationScreen() {
  const { id = "", kind } = useLocalSearchParams<{ id: string; kind?: string }>(), { member } = useMember();
  const remote = useRemote(member && id !== "new" ? "/api/social/applications" : null, applications), saved = remote.data?.items.find(a => a.id === id);
  const home = (saved?.kind ?? (kind === "home" ? "Home dining" : "Cooking class")) === "Home dining", t = useT("social");
  return <Screen title={t(home ? "homeDining" : "cookingClass")} backTo="/social"><MemberGate>
    {id === "new" ? <Application key="new" kind={home ? "Home dining" : "Cooking class"} />
      : saved ? <Application key={saved.id} initial={saved} kind={saved.kind} />
      : remote.data ? <EmptyState title={t("applicationUnavailable")} text="" /> : <RemoteStatus remote={remote} icon="document-text-outline" returnTo="/social" />}
  </MemberGate></Screen>;
}
type Text = "name" | "email" | "area" | "experience" | "menu" | "ingredients" | "details";
const blank = (kind: HostApplication["kind"]): HostApplication => ({ kind, name: "", email: "", area: "", experience: "", menu: "", ingredients: "", details: "",
  premises: "", capacity: "", halal: "", declarations: [], consent: false });
function Premises({ a, update }: { a: HostApplication; update: (patch: Partial<HostApplication>) => void }) {
  const { theme } = usePreferences(), t = useT("social");
  return <FormSection title={t("premises")}>
    <Chips label={t("premises")}>{premisesTypes.map(p => <Chip key={p} label={t("optPremises", { value: p })} role="radio" compact selected={a.premises === p} onPress={() => update({ premises: p })} />)}</Chips>
    <Field label={t(a.kind === "Home dining" ? "guestsPerSession" : "studentsPerClass")} value={a.capacity} maxLength={2} keyboardType="number-pad" onChangeText={capacity => update({ capacity: capacity.replace(/\D/g, "") })} />
    {largeHdbSession(a) && <T variant="small" color={theme.warning}>{t("hdbReview")}</T>}
    <FieldLabel>{t("halalStatusTitle")}</FieldLabel>
    <Chips label={t("halalStatus")}>{(["Not halal-certified", "Halal-certified"] as const).map(h => <Chip key={h} label={t("optHalal", { value: h })} role="radio" compact selected={a.halal === h} onPress={() => update({ halal: h })} />)}</Chips>
  </FormSection>;
}
/** A sent application is read-only while it waits in the staff review queue. */
function Submitted({ a }: { a: HostApplication }) {
  const t = useT("social");
  return <>
    <View style={{ alignItems: "flex-start" }}><StatusPill label={t("inReview")} tone="accent" /></View>
    <ListGroup>
      <ListItem title={a.name} subtitle={a.email} leading={<RowIcon name="person-outline" />} />
      <ListItem title={a.area} leading={<RowIcon name="location-outline" />} />
      <ListItem title={[a.premises && t("optPremises", { value: a.premises }), t("perSession", { n: a.capacity }), a.halal && t("optHalal", { value: a.halal })].filter(Boolean).join(" · ")} leading={<RowIcon name="home-outline" />} wrap />
    </ListGroup>
    <View style={{ alignItems: "center" }}><Confirm link label={t("withdrawApplication")} action={t("withdraw")} text={t("withdrawText")}
      run={async () => { if (a.id) await deleteApplication(a.id); invalidate("/api/social/applications"); goToPlans(); return true; }} /></View>
  </>;
}
function Application({ initial, kind }: { initial?: HostApplication; kind: HostApplication["kind"] }) {
  const [a, set] = useState<HostApplication>(() => initial ?? blank(kind)), [dirty, setDirty] = useState(false), t = useT("social"), tc = useT("common"), language = useLanguage();
  if (initial?.state === "submitted") return <Submitted a={initial} />;
  const update = (patch: Partial<HostApplication>) => { set({ ...a, ...patch }); setDirty(true); };
  const field = (key: Text, label: string, maxLength: number, multiline = false) => <Field label={label} value={a[key]} maxLength={maxLength} multiline={multiline} onChangeText={value => update({ [key]: value })} />;
  const save = async (submit: boolean) => {
    const issue = submit ? applicationIssue(a, language) : null; if (issue) throw new Error(issue);
    const saved = await saveApplication(initial?.id ?? null, a, submit);
    invalidate("/api/social/applications"); setDirty(false);
    if (submit) goToPlans(); else if (!initial) router.replace(("/social/application/" + saved.id) as Href);
  };
  const home = a.kind === "Home dining";
  return <>
    <View style={{ alignItems: "flex-start" }}><StatusPill label={t(dirty ? "unsaved" : initial ? "draft" : "appNew")} /></View>
    <FormSection title={t("contact")}>
      {field("name", t(home ? "hostName" : "instructorName"), 80)}{field("email", t("email"), 160)}{field("area", t("neighbourhood"), 60)}
    </FormSection>
    <FormSection title={t(home ? "dining" : "class")}>
      {field("experience", t(home ? "hostingExperience" : "teachingExperience"), 1000, true)}
      {field("menu", t(home ? "sampleMenu" : "lessonPlan"), 2000, true)}
      {field("ingredients", t("ingredientsAllergens"), 3000, true)}
      {field("details", t(home ? "seating" : "venueEquipment"), 2000, true)}
    </FormSection>
    <Premises a={a} update={update} />
    <FormSection title={t("declarations")}>
      {hostDeclarations.map(d => <IngredientCheck key={d} label={t("optDeclaration", { value: d })} checked={a.declarations.includes(d)} onPress={() => update({ declarations: a.declarations.includes(d) ? a.declarations.filter(x => x !== d) : [...a.declarations, d] })} />)}
      <IngredientCheck label={t("detailsAccurate")} checked={a.consent} onPress={() => update({ consent: !a.consent })} />
    </FormSection>
    <Action label={t("submitForReview")} icon="send-outline" run={() => save(true)} />
    <Action label={t("saveDraft")} secondary disabled={!dirty} run={() => save(false)} />
    {initial?.id && <View style={{ alignItems: "center" }}><Confirm link label={t("deleteApplication")} action={tc("delete")} text={t("deleteApplicationText")}
      run={async () => { await deleteApplication(initial.id!); invalidate("/api/social/applications"); goToPlans(); return true; }} /></View>}
  </>;
}
