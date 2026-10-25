import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { MemberGate, AgeNotice, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { PhotoGrid } from "../../components/social/PhotoGrid";
import { AboutFields, BasicsFields } from "../../components/social/ProfileFields";
import { invalidate } from "../../hooks/useRemote";
import { saveProfile } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe, SocialProfile } from "../../types/community";
import { VerifyPanel, WaitingState } from "./Verify";

type Step = 1 | 2 | 3 | 4;
const stepTitles = { 1: "stepPhotos", 2: "stepBasics", 3: "stepFood", 4: "stepVerify" } as const;
const firstStep = (me: SocialMe): Step => !me.photos.length ? 1 : !(me.profile.firstName && me.profile.gender && me.profile.birthDate && me.profile.area) ? 2 : 3;
function Progress({ step }: { step: Step }) {
  const { theme } = usePreferences(), t = useT("social");
  return <View style={{ gap: 6 }} accessible accessibilityLabel={t("setupStep", { n: step })}>
    <View style={[common.row, { gap: 6 }]}>{([1, 2, 3, 4] as const).map(n =>
      <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= step ? theme.accent : theme.border }} />)}</View>
    <T variant="small" muted>{t("setupStep", { n: step })}</T>
  </View>;
}
/** The first time someone opens Social: Photos, Basics, Food and you, then the live selfie check. Each step saves as it goes. */
function SetupFlow({ me }: { me: SocialMe }) {
  const t = useT("social"), tc = useT("common"), { theme } = usePreferences(), problem = useSocialError(), { step: asked } = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<Step>(() => asked === "verify" ? 4 : firstStep(me)), [draft, setDraft] = useState<SocialProfile>(() => ({ ...me.profile, visible: true }));
  const { draft: choices, storageReady } = usePreferences();
  // The profile's diet labels are Food Choices'; until they have loaded, the profile keeps its own.
  const foodChoices = storageReady && choices.diets.length ? choices.diets : draft.diets;
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [outsideAge, setOutsideAge] = useState(me.standing.step === "age"), [sent, setSent] = useState(false);
  const photos = me.photos, locked = me.standing.verification !== "none";
  const save = async (next: Step) => {
    setBusy(true); setError("");
    try {
      const result = await saveProfile({ ...draft, diets: foodChoices });
      invalidate("/api/social");
      if (result.standing.step === "age") setOutsideAge(true); else setStep(next);
    } catch (failure) { setError(problem(failure)); }
    finally { setBusy(false); }
  };
  if (outsideAge) return <AgeNotice onEvents={() => router.replace("/cook?tab=events")} />;
  if (sent) return <WaitingState onDone={() => router.replace("/social")} />;
  const basicsDone = !!(draft.firstName.trim() && draft.gender && draft.birthDate && draft.area);
  const next = step === 1 ? <Button label={t("continue")} icon="arrow-forward" disabled={!photos.length} onPress={() => setStep(2)} />
    : step === 2 ? <Button label={t("continue")} icon="arrow-forward" loading={busy} disabled={!basicsDone} onPress={() => void save(3)} />
    : step === 3 ? <Button label={t("continue")} icon="arrow-forward" loading={busy} onPress={() => void save(4)} /> : null;
  return <View style={{ gap: 18 }}>
    <Progress step={step} />
    <T variant="title" accessibilityRole="header">{t(stepTitles[step])}</T>
    {step === 1 && <>
      <T muted>{t("stepPhotosText")}</T>
      <PhotoGrid photos={photos} verified={me.standing.verified} onSaved={() => invalidate("/api/social/me")} />
    </>}
    {step === 2 && <><T muted>{t("stepBasicsText")}</T><BasicsFields value={draft} onChange={setDraft} locked={locked} /></>}
    {step === 3 && <>
      <Field label={t("askRow")} value={draft.opening} onChangeText={opening => setDraft({ ...draft, opening })} placeholder={t("askMeHint")} maxLength={120} />
      <AboutFields value={draft} onChange={setDraft} />
    </>}
    {step === 4 && <VerifyPanel onSent={() => setSent(true)} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {step === 1 && !photos.length && <T variant="small" muted>{t("addOnePhoto")}</T>}
    {step === 2 && !basicsDone && <T variant="small" muted>{t("basicsMissing")}</T>}
    {next}
    {step > 1 && step < 4 && <Button label={tc("back")} variant="link" disabled={busy} onPress={() => setStep((step - 1) as Step)} />}
  </View>;
}
export function SetupScreen() {
  const t = useT("social"), me = useSocialMe();
  useEffect(() => { if (me.data?.standing.step === "ready") router.replace("/social"); }, [me.data?.standing.step]);
  return <Screen title={t("myProfile")}><MemberGate returnTo="/social/setup">
    {me.data ? <SetupFlow me={me.data} /> : <RemoteStatus remote={me} icon="people-outline" returnTo="/social/setup" />}
  </MemberGate></Screen>;
}
