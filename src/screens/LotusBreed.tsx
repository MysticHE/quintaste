/**
 * Breed your avatar (/lotus-breed; AVATAR_LOTUS_PLAN §2 steps 7–9): the selfie with its consent sheet, breeding progress
 * and the reveal. A breed starts only with an entitlement (600 earned café credits on /lotus); free regenerations reuse
 * this flow. Every state comes from the server, so leaving, reloading or switching device resumes the same breed.
 */
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { BreedProgress } from "../components/lotus/BreedProgress";
import { BreedResult } from "../components/lotus/BreedResult";
import { BreedStart } from "../components/lotus/BreedStart";
import { Screen } from "../components/Screen";
import { Button, Card, T, common } from "../components/ui";
import { useLotus } from "../hooks/useLotus";
import { useLotusBreed } from "../hooks/useLotusBreed";
import type { LotusState } from "../services/lotus-api";
import { useAuth } from "../state/Auth";
import { useT } from "../i18n";
import { LOTUS_TIER_KEYS, type GameKey } from "./game/home/bits";

export function LotusBreedScreen() {
  const { member, remote, unavailable } = useLotus(), { user } = useAuth(), t = useT("game"), tc = useT("common");
  if (!member || !user) return <Screen title={t("lotusBreedTitle")} backTo="/lotus">
    <T muted>{t("lotusBreedSignIn")}</T>
    <Button label={tc("signIn")} icon="log-in-outline" onPress={() => router.push({ pathname: "/login", params: { returnTo: "/lotus-breed" } })} />
  </Screen>;
  if (unavailable) return <Screen title={t("lotusBreedTitle")} backTo="/lotus"><T muted>{t("lotusNotAvailable")}</T></Screen>;
  if (!remote.data) return <Screen title={t("lotusBreedTitle")} backTo="/lotus">
    {remote.error ? <><T muted>{t("lotusLoadFailed")}</T><Button label={tc("retry")} variant="link" onPress={remote.refresh} /></>
      : <ActivityIndicator accessibilityLabel={t("lotusLoading")} />}
  </Screen>;
  return <Breeding key={user.id} userId={user.id} state={remote.data} />;
}

type View = "unbloomed" | "progress" | "failed" | "again" | "paused" | "start" | "result" | "empty";
/** Screen titles: message keys in the `game` namespace ("Try Again" is shared in `common`). */
const TITLES: Record<View, GameKey | "tryAgain"> = { unbloomed: "lotusBreedTitle", progress: "lotusBreedingTitle", failed: "lotusBreedTitle", again: "tryAgain",
  paused: "lotusBreedTitle", start: "lotusBreedTitle", result: "lotusResultTitle", empty: "lotusBreedTitle" };

function Breeding({ userId, state }: { userId: string; state: LotusState }) {
  const breed = useLotusBreed(userId, state.breed?.job), [again, setAgain] = useState(false), t = useT("game"), tc = useT("common");
  const latest = state.breed ?? null, tier = state.tier, job = breed.job;
  // A finished attempt shows once the account's breed reflects it, so the reveal always has both saved forms.
  const arrived = job?.status === "complete" && latest?.job?.requestId === job.requestId && latest.status === "bred";
  const view: View = !tier ? "unbloomed"
    : breed.uploading || job?.status === "working" || (breed.pending && !job) || (job?.status === "complete" && !arrived) ? "progress"
    : job?.status === "failed" ? "failed"
    : again && latest?.status === "bred" && latest.regenerationsLeft > 0 ? "again"
    : state.breeds?.available ? (state.generation ? "start" : "paused")
    : latest?.status === "bred" ? "result" : "empty";
  const title = TITLES[view];
  return <Screen title={title === "tryAgain" ? tc("tryAgain") : t(title)} backTo="/lotus">
    {view === "unbloomed" && <><T muted>{t("lotusBloomFirst")}</T><Button label={t("openYourLotus")} variant="link" onPress={() => router.replace("/lotus")} /></>}
    {view === "progress" && <BreedProgress tier={tier!} job={job} error={breed.error} onReconnect={breed.reconnect} />}
    {view === "failed" && <Card style={common.stack}>
      <T accessibilityLiveRegion="polite">{job?.message || t("lotusBreedStopped")}</T>
      <Button label={tc("tryAgain")} onPress={breed.clear} />
    </Card>}
    {view === "again" && <BreedStart regenerate triesLeft={latest!.regenerationsLeft} busy={breed.uploading} error={breed.error}
      onBreed={photo => { setAgain(false); void breed.start(photo, latest!.id); }} />}
    {view === "paused" && <T muted style={common.center}>{t("lotusBreedPausedKept")}</T>}
    {view === "start" && <><T style={common.center}>{t("lotusBreedIntro", { tier: t(LOTUS_TIER_KEYS[tier!]) })}</T>
      <BreedStart regenerate={false} triesLeft={0} busy={breed.uploading} error={breed.error} onBreed={photo => void breed.start(photo)} /></>}
    {view === "result" && <BreedResult breed={latest!} tier={tier!} reveal={arrived} onAgain={() => { breed.clear(); setAgain(true); }} />}
    {view === "empty" && <><T muted style={common.center}>{t("lotusBreedEmpty", { n: state.prices?.breed ?? 600 })}</T>
      <Button label={t("openYourLotus")} variant="link" onPress={() => router.replace("/lotus")} /></>}
  </Screen>;
}
