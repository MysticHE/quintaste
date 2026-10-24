import { useCallback, type PropsWithChildren } from "react";
import { router } from "expo-router";
import { FirstRunState } from "../BrowseControls";
import { ListGroup, ListItem, StatusPill, type Tone } from "../GroupedList";
import { MemberPrompt, useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { me } from "../../services/social-api";
import { ApiError } from "../../services/community-api";
import { useT } from "../../i18n";
import type { SocialMe, Standing } from "../../types/community";
import type socialMessages from "../../i18n/en/social";
import { Avatar } from "./SocialPhoto";
import { openSocial } from "./Shared";

/** The signed-in member's Social profile, photos and where they stand (setup step, 21+, photo check). */
export function useSocialMe() {
  const { member } = useMember();
  return useRemote<SocialMe>(member ? "/api/social/me" : null, me);
}
/** Social needs a signed-in, age-checked account. */
export function MemberGate({ children, returnTo = "/social" }: PropsWithChildren<{ returnTo?: string }>) {
  return useMember().member ? <>{children}</> : <MemberPrompt icon="people-outline" returnTo={returnTo} />;
}
const codes: Record<string, keyof typeof socialMessages> = { SOCIAL_SETUP: "codeSetup", SOCIAL_AGE: "codeAge", SOCIAL_VERIFY: "codeVerify",
  SOCIAL_WAITING: "codeWaiting", SOCIAL_PAUSED: "codePaused", SOCIAL_NOT_FRIENDS: "codeNotFriends", SOCIAL_SAME_GENDER: "codeSameGender",
  SOCIAL_LOCKED: "codeLocked", SOCIAL_POSE: "codePose" };
/** Words a failed Social request in the member's language when the server sent a known code; otherwise the server's own message. */
export function useSocialError() {
  const t = useT("social");
  return useCallback((error: unknown, name = "") => {
    if (error instanceof ApiError) {
      if (error.code === "SOCIAL_THEM") return t("codeThem", { name });
      const key = error.code ? codes[error.code] : undefined;
      return key ? t(key) as string : error.message;
    }
    return t("actionFailed");
  }, [t]);
}
const states = { public: ["statePublic", "success"], friends: ["stateFriendsOnly", "muted"], waiting: ["stateChecking", "warning"], verify: ["stateVerify", "accent"],
  paused: ["statePaused", "warning"], rejected: ["stateRejected", "warning"] } as const;
/** What a member's standing means for being found, as a label and tone. */
export function standingLabel(s: Standing): readonly [keyof typeof socialMessages, Tone] {
  if (s.verification === "paused") return states.paused;
  if (s.verification === "rejected") return states.rejected;
  if (s.step === "waiting") return states.waiting;
  if (s.step === "verify") return states.verify;
  return s.public ? states.public : states.friends;
}
/** Your profile as one row: main photo, name and how others find you; opens My Profile, or the photo check when that is the next step. */
export function StandingRow({ data }: { data: SocialMe }) {
  const t = useT("social"), [key, tone] = standingLabel(data.standing), name = data.profile.firstName || t("yourProfile");
  return <ListGroup><ListItem title={name} leading={<Avatar uri={data.photos[0]?.thumb} name={name} size={44} />}
    trailing={<StatusPill label={t(key)} tone={tone} />} label={name + ", " + t(key)}
    onPress={() => openSocial(data.standing.step === "verify" ? "/verify" : "/profile")} /></ListGroup>;
}
/** Before the first-time setup: what Social is for and one way in. */
export function SetupPrompt() {
  const t = useT("social");
  return <FirstRunState icon="people-outline" title={t("setupTitle")} text={t("setupText")}
    action={{ label: t("setupStart"), icon: "arrow-forward", onPress: () => openSocial("/setup") }} />;
}
/** Members outside 21 to 45: Social is not for them; Events and cooking classes are in Market. */
export function AgeNotice({ onEvents }: { onEvents: () => void }) {
  const t = useT("social");
  return <FirstRunState icon="calendar-outline" title={t("ageTitle")} text={t("ageText")} action={{ label: t("seeEvents"), icon: "calendar-outline", onPress: onEvents }} />;
}
/** Social screens past setup: a signed-in member aged 21 to 45. Anyone outside the range sees the notice that points to Market > Events. */
export function SocialGate({ children, returnTo }: PropsWithChildren<{ returnTo: string }>) {
  const me = useSocialMe().data;
  return <MemberGate returnTo={returnTo}>{me?.standing.step === "age" ? <AgeNotice onEvents={() => router.push("/market?tab=events")} /> : children}</MemberGate>;
}
/** People, Friends and Dinners need a finished setup and age 21 to 45; the gate shows the right first step instead. */
export function MeetGate({ data, onEvents, children }: PropsWithChildren<{ data: SocialMe | undefined; onEvents: () => void }>) {
  if (!data) return null;
  if (data.standing.step === "photos" || data.standing.step === "basics") return <SetupPrompt />;
  if (data.standing.step === "age") return <AgeNotice onEvents={onEvents} />;
  return <>{children}</>;
}
