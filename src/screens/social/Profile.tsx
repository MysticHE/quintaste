import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon, StatusPill, ThemedSwitch } from "../../components/GroupedList";
import { MemberGate, standingLabel, useSocialError, useSocialMe } from "../../components/social/SocialState";
import { ProfilePicture } from "../../components/social/ProfilePicture";
import { openSocial } from "../../components/social/Shared";
import { invalidate } from "../../hooks/useRemote";
import { saveProfile } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe } from "../../types/community";

function PublicSwitch({ me }: { me: SocialMe }) {
  const t = useT("social"), { setNotice } = usePreferences(), problem = useSocialError(), [busy, setBusy] = useState(false), on = me.profile.visible;
  const change = async (visible: boolean) => {
    setBusy(true);
    try { await saveProfile({ ...me.profile, visible }); invalidate("/api/social"); }
    catch (failure) { setNotice({ text: problem(failure), error: true }); }
    finally { setBusy(false); }
  };
  return <ListItem title={t("publicProfile")} subtitle={t(on ? "publicOn" : "publicOff")} wrap leading={<RowIcon name={on ? "eye-outline" : "eye-off-outline"} />}
    trailing={<ThemedSwitch label={t("publicProfile")} value={on} disabled={busy} onChange={value => void change(value)} />} />;
}
/** My Profile: how others find you, then each part of the profile, your cooking classes and blocked people. */
function ProfileHub({ me }: { me: SocialMe }) {
  const t = useT("social"), p = me.profile, s = me.standing, [label, tone] = standingLabel(s);
  const name = p.firstName || t("yourProfile"), check = s.verification === "rejected" || s.verification === "paused" || s.step === "verify";
  return <>
    <View style={{ alignItems: "center", gap: 8, paddingTop: 4 }}>
      <ProfilePicture data={me} name={name} size={96} />
      <T variant="title" style={common.bold}>{s.age ? t("nameAge", { name, age: s.age }) : name}</T>
      <StatusPill label={s.verified ? t("verifiedStatus") : s.step === "waiting" ? t("checkingStatus") : t("notVerified")} tone={s.verified ? "success" : s.step === "waiting" ? "warning" : "muted"} />
    </View>
    {check && <ListGroup><ListItem title={t("verifyAction")} subtitle={t(label)} leading={<RowIcon name="camera-outline" tone={tone} />} onPress={() => openSocial("/verify")} /></ListGroup>}
    {(s.step === "photos" || s.step === "basics") && <Button label={t("setupStart")} icon="arrow-forward" onPress={() => openSocial("/setup")} />}
    <ListGroup><PublicSwitch me={me} /></ListGroup>
    <ListGroup>
      <ListItem title={t("photosRow")} subtitle={t("photosCount", { n: me.photos.length })} leading={<RowIcon name="images-outline" />} onPress={() => openSocial("/photos")} />
      <ListItem title={t("basicsRow")} subtitle={[p.firstName, me.handle && "@" + me.handle, s.age, p.gender && t("optGender", { value: p.gender }), p.area].filter(Boolean).join(" · ") || t("basicsSub")}
        leading={<RowIcon name="person-outline" />} onPress={() => openSocial("/edit?section=basics")} />
      {/* Diet labels come from Food Choices (useProfileDietSync); this row keeps only favourite places. */}
      <ListItem title={t("favouritePlaces")} subtitle={t("placesCount", { n: p.spots.length })} leading={<RowIcon name="location-outline" />} onPress={() => openSocial("/edit?section=food")} />
      <ListItem title={t("aboutRow")} subtitle={p.about || t("aboutSub")} leading={<RowIcon name="sparkles-outline" />} onPress={() => openSocial("/edit?section=about")} />
      <ListItem title={t("askRow")} subtitle={p.opening || t("askSub")} leading={<RowIcon name="chatbubble-ellipses-outline" />} onPress={() => openSocial("/edit?section=ask")} />
    </ListGroup>
    <ListGroup>
      <ListItem title={t("blockedPeople")} leading={<RowIcon name="ban-outline" tone="muted" />} onPress={() => openSocial("/blocked")} />
    </ListGroup>
  </>;
}
export function ProfileScreen() {
  const t = useT("social"), me = useSocialMe();
  return <Screen title={t("myProfile")} headerAction={me.data?.photos.length ? <Button label={t("preview")} variant="link" onPress={() => openSocial("/person/" + me.data!.id)} /> : undefined}>
    <MemberGate returnTo="/social/profile">{me.data ? <ProfileHub me={me.data} /> : <RemoteStatus remote={me} icon="person-outline" returnTo="/social/profile" />}</MemberGate>
  </Screen>;
}
