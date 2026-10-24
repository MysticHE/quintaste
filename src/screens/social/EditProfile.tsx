import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Field, T } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { SocialGate, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { AboutFields, BasicsFields, FoodFields } from "../../components/social/ProfileFields";
import { PhotoGrid } from "../../components/social/PhotoGrid";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { places, placesByIdKey, saveProfile } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe, SocialProfile } from "../../types/community";
import { openSocial } from "../../components/social/Shared";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";

type Section = "basics" | "food" | "about" | "ask";
const titles = { basics: "basicsRow", food: "foodRow", about: "aboutRow", ask: "askRow" } as const;
const readSection = (value: string | undefined): Section => value === "food" || value === "about" || value === "ask" ? value : "basics";
function Editor({ me, section }: { me: SocialMe; section: Section }) {
  const t = useT("social"), { theme, setNotice } = usePreferences(), problem = useSocialError();
  const [draft, setDraft] = useState<SocialProfile>(me.profile), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const key = section === "food" ? placesByIdKey(me.profile.spots) : null, known = useRemote(key, signal => places(key!, signal)).data?.items ?? [];
  const save = async () => {
    setBusy(true); setError("");
    try { await saveProfile(draft); invalidate("/api/social"); setNotice({ text: t("saved") }); router.back(); }
    catch (failure) { setError(problem(failure)); }
    finally { setBusy(false); }
  };
  return <>
    {section === "basics" && <BasicsFields value={draft} onChange={setDraft} locked={me.standing.verification !== "none"} />}
    {section === "food" && <FoodFields value={draft} onChange={setDraft} places={known} />}
    {section === "about" && <AboutFields value={draft} onChange={setDraft} details />}
    {section === "ask" && <Field label={t("askRow")} value={draft.opening} onChangeText={opening => setDraft({ ...draft, opening })} placeholder={t("askMeHint")} maxLength={120} />}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t("save")} icon="checkmark" loading={busy} onPress={() => void save()} />
  </>;
}
/** One part of My Profile: Basics, Food, About me or Ask me about. */
export function EditProfileScreen() {
  const t = useT("social"), { section: raw } = useLocalSearchParams<{ section?: string }>(), section = readSection(raw), me = useSocialMe();
  return <Screen title={t(titles[section])}><SocialGate returnTo={"/social/edit?section=" + section}>
    {me.data ? <Editor key={section} me={me.data} section={section} /> : <RemoteStatus remote={me} icon="person-outline" returnTo="/social/profile" />}
  </SocialGate></Screen>;
}
/** Photos: up to six; the first is the main photo. A new main photo pauses the ✓ until a new selfie is checked. */
export function PhotosScreen() {
  const t = useT("social"), me = useSocialMe();
  return <Screen title={t("photosTitle")}><SocialGate returnTo="/social/photos">
    {me.data ? <>
      <T muted>{t("stepPhotosText")}</T>
      <PhotoGrid photos={me.data.photos} verified={me.data.standing.verified} onSaved={() => invalidate("/api/social")} />
      {me.data.standing.verification === "paused" && <ListGroup><ListItem title={t("verifyAction")} subtitle={t("pausedText")} wrap
        leading={<RowIcon name="camera-outline" tone="warning" />} onPress={() => openSocial("/verify")} /></ListGroup>}
    </> : <RemoteStatus remote={me} icon="images-outline" returnTo="/social/photos" />}
  </SocialGate></Screen>;
}
