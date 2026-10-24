import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { Chip, IconButton } from "../../components/food/Controls";
import { RemoteStatus } from "../../components/CommunityGate";
import { FieldLabel, Initial, ListGroup, ListItem, StatusPill } from "../../components/GroupedList";
import { MemberGate } from "../../components/social/SocialState";
import { openMarket, refreshClasses, useClassError } from "../../components/market/ClassParts";
import { AreaField, ChoiceGroup, DietChoices } from "../../components/social/ProfileFields";
import { SgDateTimeField } from "../../components/social/SgDateTimeField";
import { Sheet } from "../../components/social/Sheet";
import { Action } from "../../components/Actions";
import { useRemote } from "../../hooks/useRemote";
import { classPeople, cookingClass, removeSeat, saveClass } from "../../services/classes-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { parseSgDateTime, sgDateTimeText } from "../../utils/sg-datetime";
import type { ClassInput, ClassPerson, CookingClass } from "../../types/community";

const lengths = [1, 1.5, 2, 2.5, 3, 4] as const;
const hoursBetween = (starts: string, ends: string) => { const a = parseSgDateTime(starts), b = parseSgDateTime(ends); return a !== null && b !== null ? (b - a) / 3600000 : 2; };
const blank: ClassInput = { title: "", makes: "", starts: "", ends: "", venue: "", area: "", seats: 8, priceCents: 0, diets: ["Plant-Based"] };
function Form({ existing }: { existing: CookingClass | null }) {
  const t = useT("market"), { theme, setNotice } = usePreferences(), problem = useClassError();
  const [c, setC] = useState<ClassInput>(() => existing ? { title: existing.title, makes: existing.makes, starts: existing.starts, ends: existing.ends,
    venue: existing.venue, area: existing.area, seats: existing.seats, priceCents: existing.priceCents, diets: existing.diets } : blank), [hours, setHours] = useState(existing ? hoursBetween(existing.starts, existing.ends) : 2);
  const [price, setPrice] = useState(existing?.priceCents ? String(existing.priceCents / 100) : ""), [busy, setBusy] = useState<"draft" | "post" | null>(null), [error, setError] = useState("");
  const set = (patch: Partial<ClassInput>) => setC({ ...c, ...patch }), posted = existing?.status === "posted";
  const ready = c.title.trim() && c.makes.trim() && c.venue.trim() && parseSgDateTime(c.starts) !== null;
  const save = async (post: boolean) => {
    if (!ready) { setError(t("classFormIncomplete")); return; }
    const start = parseSgDateTime(c.starts)!, cents = Math.round(Number(price.replace(/[^\d.]/g, "") || 0) * 100);
    setBusy(post ? "post" : "draft"); setError("");
    try {
      const result = await saveClass(existing?.id ?? null, { ...c, ends: sgDateTimeText(start + hours * 3600000), priceCents: cents }, post);
      setNotice({ text: t(post ? "classPosted" : "classSaved") }); refreshClasses();
      if (!existing && result.id) router.replace(("/market/class/" + result.id) as never); else router.back();
    } catch (failure) { setError(problem(failure)); }
    finally { setBusy(null); }
  };
  return <>
    <Field label={t("className")} value={c.title} onChangeText={title => set({ title })} maxLength={80} />
    <SgDateTimeField label={t("classStarts")} value={c.starts} onChange={starts => set({ starts })} />
    <ChoiceGroup label={t("classLength")}>{lengths.map(n => <Chip key={n} label={t("hoursShort", { n })} role="radio" selected={hours === n} onPress={() => setHours(n)} />)}</ChoiceGroup>
    <Field label={t("classVenue")} value={c.venue} onChangeText={venue => set({ venue })} placeholder={t("classVenueHint")} maxLength={160} />
    <AreaField value={c.area} onChange={area => set({ area })} />
    <View style={{ gap: 6 }}><FieldLabel>{t("classSeats")}</FieldLabel>
      <View style={[common.row, { gap: 12, alignItems: "center" }]}>
        <IconButton label={t("fewerSeats")} icon="remove" disabled={c.seats <= Math.max(1, existing?.taken ?? 1)} onPress={() => set({ seats: c.seats - 1 })} />
        <T variant="title" style={[common.bold, { minWidth: 32, textAlign: "center" }]} accessibilityLiveRegion="polite">{c.seats}</T>
        <IconButton label={t("moreSeats")} icon="add" disabled={c.seats >= 30} onPress={() => set({ seats: c.seats + 1 })} />
      </View></View>
    <Field label={t("classPrice")} value={price} onChangeText={value => setPrice(value.replace(/[^\d.]/g, "").slice(0, 7))} keyboardType="decimal-pad" placeholder="0" />
    <Field label={t("classMakes")} value={c.makes} onChangeText={makes => set({ makes })} maxLength={600} multiline />
    <DietChoices value={c.diets} onChange={diets => set({ diets })} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={posted ? t("classSave") : t("postClass")} icon="megaphone-outline" loading={busy === "post"} disabled={!!busy} onPress={() => void save(true)} />
    {!posted && <><Button label={t("saveDraft")} variant="secondary" loading={busy === "draft"} disabled={!!busy} onPress={() => void save(false)} />
      <T variant="small" muted style={{ textAlign: "center" }}>{t("postNote")}</T></>}
  </>;
}
/** New Class or Edit Class for an approved teacher. Price is paid to the teacher directly; QuinTaste takes no payment. */
export function ClassFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>(), t = useT("market"), remote = useRemote(id ? "/api/market/classes/" + id : null, signal => cookingClass(id!, signal));
  return <Screen title={t(id ? "editClassTitle" : "newClassTitle")}><MemberGate returnTo="/market/teaching">
    {id ? <><RemoteStatus remote={remote} icon="school-outline" returnTo="/market/teaching" missing={t("classUnavailable")} />{remote.data && <Form existing={remote.data} />}</>
      : <Form existing={null} />}
  </MemberGate></Screen>;
}
function PersonRow({ person: p, classId, onRemove }: { person: ClassPerson; classId: string; onRemove: () => void }) {
  const t = useT("market");
  return <ListItem title={p.name} subtitle={p.seat === "joined" ? t("peopleJoined") : t("peopleAsked")} leading={<Initial name={p.name} size={40} />}
    trailing={<View style={[common.row, { gap: 6 }]}>{p.unread > 0 && <StatusPill label={String(p.unread)} tone="accent" />}
      {p.seat === "joined" && <IconButton label={t("removeSeat")} icon="person-remove-outline" appearance="plain" onPress={onRemove} />}</View>}
    onPress={() => openMarket("/class-chat/" + classId + "?member=" + encodeURIComponent(p.id) + "&name=" + encodeURIComponent(p.name))} />;
}
/** The teacher's view of a class: who joined and who asked a question; open a chat or remove a seat. */
export function ClassPeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("market"), { setNotice } = usePreferences();
  const remote = useRemote(id ? "/api/market/teaching/classes/" + id + "/people" : null, signal => classPeople(id, signal), 15000), [removing, setRemoving] = useState<ClassPerson | null>(null);
  const items = remote.data?.items ?? [];
  return <Screen title={t("classPeople")}><MemberGate returnTo={"/market/class-people/" + id}>
    <RemoteStatus remote={remote} icon="people-outline" returnTo="/market/teaching" missing={t("classUnavailable")} />
    {remote.data && (items.length ? <ListGroup inset={64}>{items.map(p => <PersonRow key={p.id} person={p} classId={id} onRemove={() => setRemoving(p)} />)}</ListGroup>
      : <T muted style={{ textAlign: "center" }}>{t("peopleNone")}</T>)}
    {removing && <Sheet visible onClose={() => setRemoving(null)} title={t("removeSeatTitle", { name: removing.name })}>
      <T>{t("removeSeatText")}</T>
      <Action label={t("removeSeat")} icon="person-remove-outline" run={async () => {
        await removeSeat(id, removing.id); setNotice({ text: t("seatRemoved", { name: removing.name }) }); setRemoving(null); remote.refresh(); refreshClasses(); }} />
    </Sheet>}
  </MemberGate></Screen>;
}
