/**
 * Your lotus (/lotus): the free first bloom and, afterwards, the lotus that seals the member's own avatar
 * (AVATAR_LOTUS_PLAN §2 steps 3–4). The server decides and records the tier before the animation starts; the odds sit on
 * this screen, Skip is always available and reduced motion swaps the spin for a fade. No prices, countdowns or offers.
 */
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { BloomAnimation, bloomDuration } from "../components/lotus/BloomAnimation";
import { LotusSeal } from "../components/lotus/LotusSeal";
import { OddsList, Perks } from "../components/lotus/LotusDetails";
import { Screen } from "../components/Screen";
import { Button, Card, T, common } from "../components/ui";
import { TIER_NAMES } from "../game/content/lotus";
import { useLotus } from "../hooks/useLotus";
import { invalidate } from "../hooks/useRemote";
import { ApiError } from "../services/community-api";
import { bloomLotus, PUBLISHED_ODDS, type LotusState } from "../services/lotus-api";
import { usePreferences } from "../state/Preferences";

type Phase = "idle" | "asking" | "playing";
const newRequestId = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-lotus";

export function LotusScreen() {
  const { member, remote, unavailable } = useLotus();
  const { theme, reducedMotion } = usePreferences();
  const [phase, setPhase] = useState<Phase>("idle"), [result, setResult] = useState<LotusState | null>(null);
  const [error, setError] = useState(""), [showOdds, setShowOdds] = useState(false);
  const requestId = useRef(""), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = useCallback(() => { clearTimeout(timer.current); setPhase("idle"); invalidate("lotus:"); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!member) return <Screen title="Your Lotus" backTo="/account">
    <T muted>Sign in to bloom your free lotus.</T>
    <Button label="Sign In" icon="log-in-outline" onPress={() => router.push({ pathname: "/login", params: { returnTo: "/lotus" } })} />
  </Screen>;
  if (unavailable) return <Screen title="Your Lotus" backTo="/account"><T muted>Your lotus is not available yet.</T></Screen>;

  const state = result ?? remote.data, tier = state?.tier ?? null, playing = phase === "playing" && !!tier, bloomed = !!tier && !playing;
  const canBloom = !!state?.freeBloom && phase === "idle";
  /** Repeating the same request id after a dropped connection returns the bloom the server already recorded. */
  const bloom = async () => {
    if (!canBloom) return;
    requestId.current ||= newRequestId();
    setPhase("asking"); setError("");
    try {
      const next = await bloomLotus(requestId.current);
      setResult(next); setPhase("playing");
      timer.current = setTimeout(finish, bloomDuration(reducedMotion));
    } catch (problem) {
      setPhase("idle");
      if (problem instanceof ApiError && problem.code === "BLOOMED") { invalidate("lotus:"); return; }
      setError(problem instanceof Error ? problem.message : "Your lotus did not bloom. Try again.");
    }
  };
  const headline = playing ? "Your lotus is blooming…" : tier ? `Your ${TIER_NAMES[tier]} Lotus is waiting` : "Tap to bloom your lotus";
  return <Screen title="Your Lotus" backTo="/account">
    <View testID="lotus-stage" style={[s.stage, { backgroundColor: theme.accentSoft }]}>
      {playing ? <View accessible accessibilityLabel="Your lotus is blooming"><BloomAnimation tier={tier} size={170} /></View>
        : <Pressable disabled={!canBloom} onPress={() => void bloom()} accessibilityRole="button" accessible={canBloom} aria-hidden={!canBloom}
          accessibilityLabel="Bloom your lotus" style={s.seal}><LotusSeal tier={bloomed ? tier : null} height={300} /></Pressable>}
      {playing && <View style={s.skip}><Button label="Skip" variant="secondary" testID="lotus-skip" onPress={finish} /></View>}
    </View>
    {!state && !remote.error ? <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your lotus" />
      : <T variant="title" style={common.center} testID="lotus-headline" accessibilityLiveRegion="polite">{state ? headline : "Your lotus did not load."}</T>}
    {!state && !!remote.error && <Button label="Retry" variant="link" onPress={remote.refresh} />}
    {!!state?.freeBloom && !playing && <>
      <Button label="Bloom My Lotus" testID="lotus-bloom" loading={phase === "asking"} disabled={!canBloom} onPress={() => void bloom()} />
      <T variant="small" muted style={common.center}>Free, once per account. Every lotus gives the same Adult and Mini forms.</T>
    </>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {bloomed && <Bloomed tier={tier} />}
    {bloomed && <Button label={showOdds ? "Hide Odds" : "Odds"} variant="link" onPress={() => setShowOdds(v => !v)} />}
    {(!bloomed || showOdds) && <Card>
      <T variant="subtitle" accessibilityRole="header">Odds</T>
      <OddsList odds={state?.odds ?? PUBLISHED_ODDS} />
    </Card>}
  </Screen>;
}

function Bloomed({ tier }: { tier: NonNullable<LotusState["tier"]> }) {
  return <View style={common.stack}>
    {tier === "pink" ? <T muted style={common.center}>Your avatar in Adult and Mini style.</T> : <>
      <T variant="subtitle" accessibilityRole="header">What your lotus brings</T>
      <Perks tier={tier} />
    </>}
    <Button label="Visit Your Café" variant="secondary" icon="storefront-outline" onPress={() => router.push("/game/cafe")} />
    <T variant="small" muted style={common.center}>Breeding your own avatar opens in a later update.</T>
  </View>;
}

const s = StyleSheet.create({
  stage: { borderRadius: 18, minHeight: 300, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  seal: { alignSelf: "stretch" },
  skip: { position: "absolute", top: 10, right: 10 },
});
