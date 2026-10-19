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
import { TIER_NAMES } from "../game/content/lotus";
import { useLotus } from "../hooks/useLotus";
import { useLotusBreed } from "../hooks/useLotusBreed";
import type { LotusState } from "../services/lotus-api";
import { useAuth } from "../state/Auth";

export function LotusBreedScreen() {
  const { member, remote, unavailable } = useLotus(), { user } = useAuth();
  if (!member || !user) return <Screen title="Breed Your Avatar" backTo="/lotus">
    <T muted>Sign in to breed your own avatar.</T>
    <Button label="Sign In" icon="log-in-outline" onPress={() => router.push({ pathname: "/login", params: { returnTo: "/lotus-breed" } })} />
  </Screen>;
  if (unavailable) return <Screen title="Breed Your Avatar" backTo="/lotus"><T muted>Your lotus is not available yet.</T></Screen>;
  if (!remote.data) return <Screen title="Breed Your Avatar" backTo="/lotus">
    {remote.error ? <><T muted>Your lotus did not load.</T><Button label="Retry" variant="link" onPress={remote.refresh} /></>
      : <ActivityIndicator accessibilityLabel="Loading your lotus" />}
  </Screen>;
  return <Breeding key={user.id} userId={user.id} state={remote.data} />;
}

type View = "unbloomed" | "progress" | "failed" | "again" | "paused" | "start" | "result" | "empty";
const TITLES: Record<View, string> = { unbloomed: "Breed Your Avatar", progress: "Breeding", failed: "Breed Your Avatar", again: "Try Again",
  paused: "Breed Your Avatar", start: "Breed Your Avatar", result: "Your Avatar", empty: "Breed Your Avatar" };

function Breeding({ userId, state }: { userId: string; state: LotusState }) {
  const breed = useLotusBreed(userId, state.breed?.job), [again, setAgain] = useState(false);
  const latest = state.breed ?? null, tier = state.tier, job = breed.job;
  // A finished attempt shows once the account's breed reflects it, so the reveal always has both saved forms.
  const arrived = job?.status === "complete" && latest?.job?.requestId === job.requestId && latest.status === "bred";
  const view: View = !tier ? "unbloomed"
    : breed.uploading || job?.status === "working" || (breed.pending && !job) || (job?.status === "complete" && !arrived) ? "progress"
    : job?.status === "failed" ? "failed"
    : again && latest?.status === "bred" && latest.regenerationsLeft > 0 ? "again"
    : state.breeds?.available ? (state.generation ? "start" : "paused")
    : latest?.status === "bred" ? "result" : "empty";
  return <Screen title={TITLES[view]} backTo="/lotus">
    {view === "unbloomed" && <><T muted>Bloom your free lotus first.</T><Button label="Open Your Lotus" variant="link" onPress={() => router.replace("/lotus")} /></>}
    {view === "progress" && <BreedProgress tier={tier!} job={job} error={breed.error} onReconnect={breed.reconnect} />}
    {view === "failed" && <Card style={common.stack}>
      <T accessibilityLiveRegion="polite">{job?.message || "Breeding stopped. Nothing was used up."}</T>
      <Button label="Try Again" onPress={breed.clear} />
    </Card>}
    {view === "again" && <BreedStart regenerate triesLeft={latest!.regenerationsLeft} busy={breed.uploading} error={breed.error}
      onBreed={photo => { setAgain(false); void breed.start(photo, latest!.id); }} />}
    {view === "paused" && <T muted style={common.center}>Breeding is paused right now. Your breed is kept.</T>}
    {view === "start" && <><T style={common.center}>Your {TIER_NAMES[tier!]} Lotus breeds your Adult and Mini forms from one selfie.</T>
      <BreedStart regenerate={false} triesLeft={0} busy={breed.uploading} error={breed.error} onBreed={photo => void breed.start(photo)} /></>}
    {view === "result" && <BreedResult breed={latest!} tier={tier!} reveal={arrived} onAgain={() => { breed.clear(); setAgain(true); }} />}
    {view === "empty" && <><T muted style={common.center}>You have no breed ready. Save {state.prices?.breed ?? 600} café credits in Rush Hour to breed your avatar.</T>
      <Button label="Open Your Lotus" variant="link" onPress={() => router.replace("/lotus")} /></>}
  </Screen>;
}
