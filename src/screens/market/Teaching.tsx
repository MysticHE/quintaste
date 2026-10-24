import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { DateTile, ListGroup, ListItem, RowIcon, StatusPill, ThemedSwitch, type Tone } from "../../components/GroupedList";
import { StateView } from "../../components/StateView";
import { FloatingAddButton } from "../../components/FloatingAddButton";
import { MemberGate } from "../../components/social/SocialState";
import { openMarket, refreshClasses, useClassError } from "../../components/market/ClassParts";
import { AreaField } from "../../components/social/ProfileFields";
import { useRemote } from "../../hooks/useRemote";
import { applyToTeach, myClasses, teaching as loadTeaching } from "../../services/classes-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { sgDateTile } from "../../utils/sg-datetime";
import type { CookingClass, Teacher } from "../../types/community";

const hostState: Record<Teacher["status"], ["teachPending" | "teachApproved" | "teachRejected" | "teachSuspended", Tone]> = {
  pending: ["teachPending", "warning"], approved: ["teachApproved", "success"], rejected: ["teachRejected", "warning"], suspended: ["teachSuspended", "warning"] };
function ClassRow({ c, own }: { c: CookingClass; own: boolean }) {
  const t = useT("market"), language = useLanguage(), tile = sgDateTile(c.starts, language);
  const note = c.hidden ? t("hiddenByTeam") : c.status === "draft" ? t("notPosted") : c.status === "cancelled" ? t("classStatusCancelled") : own ? t("seatsTaken", { taken: c.taken, seats: c.seats }) : c.venue;
  return <ListItem title={c.title} subtitle={note} leading={tile ? <DateTile day={tile.day} month={tile.month} /> : undefined}
    trailing={c.status === "draft" ? <StatusPill label={t("classStatusDraft")} /> : c.unread ? <StatusPill label={String(c.unread)} tone="accent" /> : undefined}
    onPress={() => openMarket("/class/" + c.id)} />;
}
/** My Cooking Classes: classes you joined, and teaching (apply, then post classes that appear in Events). */
export function TeachingScreen() {
  const t = useT("market"), remote = useRemote("/api/market/teaching", loadTeaching), joined = useRemote("/api/market/me/classes", myClasses).data?.items ?? [];
  const host = remote.data?.host, approved = host?.status === "approved";
  const { create } = useLocalSearchParams<{ create?: string }>();
  useEffect(() => { if (create === "1" && approved) router.replace("/market/class-edit"); }, [create, approved]);
  return <Screen title={t("teachTitle")} floatingAction={approved ? <FloatingAddButton label={t("newClass")} onPress={() => openMarket("/class-edit")} /> : undefined}>
    <MemberGate returnTo="/market/teaching">
      <RemoteStatus remote={remote} icon="school-outline" returnTo="/cook?tab=events" />
      {!!joined.length && <ListGroup title={t("joinedClasses")} inset={72}>{joined.map(c => <ClassRow key={c.id} c={c} own={false} />)}</ListGroup>}
      {remote.data && (host ? <ListGroup><ListItem title={t(hostState[host.status][0])} subtitle={host.reason || undefined} wrap
        leading={<RowIcon name="school-outline" tone={hostState[host.status][1]} />}
        trailing={host.status === "rejected" ? <Button label={t("applyAgain")} variant="link" onPress={() => openMarket("/teach-apply")} /> : undefined} /></ListGroup>
        : <StateView icon="school-outline" title={t("teachNone")} text={t("teachNoneText")} primary={{ label: t("applyToTeach"), icon: "arrow-forward", onPress: () => openMarket("/teach-apply") }} />)}
      {host && (remote.data!.classes.length ? <ListGroup title={t("yourClasses")} inset={72}>{remote.data!.classes.map(c => <ClassRow key={c.id} c={c} own />)}</ListGroup>
        : approved && <T muted style={{ textAlign: "center" }}>{t("classesNone")}</T>)}
    </MemberGate>
  </Screen>;
}
/** Apply To Teach: staff check the application in the admin console; members later pay the teacher directly. */
export function TeachApplyScreen() {
  const t = useT("market"), { theme, setNotice } = usePreferences(), problem = useClassError();
  const [form, setForm] = useState({ displayName: "", area: "", experience: "", teaches: "", consent: false }), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const send = async () => {
    setBusy(true); setError("");
    try { await applyToTeach(form); setNotice({ text: t("applicationSent") }); refreshClasses(); router.back(); }
    catch (failure) { setError(problem(failure)); }
    finally { setBusy(false); }
  };
  const ready = form.displayName.trim() && form.experience.trim().length >= 20 && form.teaches.trim().length >= 5 && form.consent;
  return <Screen title={t("applyTitle")}><MemberGate returnTo="/market/teach-apply">
    <Field label={t("teacherName")} value={form.displayName} onChangeText={displayName => set({ displayName })} maxLength={60} />
    <AreaField value={form.area} onChange={area => set({ area })} />
    <Field label={t("experience")} value={form.experience} onChangeText={experience => set({ experience })} placeholder={t("experienceHint")} maxLength={600} multiline />
    <Field label={t("teaches")} value={form.teaches} onChangeText={teaches => set({ teaches })} placeholder={t("teachesHint")} maxLength={300} multiline />
    <ListGroup><ListItem title={t("teachConsent")} wrap trailing={<ThemedSwitch label={t("teachConsent")} value={form.consent} onChange={consent => set({ consent })} />} /></ListGroup>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <View><Button label={t("sendApplication")} icon="send-outline" loading={busy} disabled={!ready} onPress={() => void send()} /></View>
  </MemberGate></Screen>;
}
