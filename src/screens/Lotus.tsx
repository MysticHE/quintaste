/**
 * Your lotus (/lotus): the free first bloom, then the lotus that seals the member's own avatar (AVATAR_LOTUS_PLAN §2
 * steps 3–6): breed with earned café credits, or re-bloom for 150 with the same odds and pity. The server decides and
 * records every bloom before the animation starts; odds are on this screen, Skip is always available and reduced motion
 * swaps the spin for a fade. A re-bloom keeps the better lotus. No countdowns, offers or store prices.
 */
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { BloomAnimation, bloomDuration } from "../components/lotus/BloomAnimation";
import { LotusActions } from "../components/lotus/LotusActions";
import { LotusSeal } from "../components/lotus/LotusSeal";
import { OddsList, Perks } from "../components/lotus/LotusDetails";
import { PerkLayers, perkLabel } from "../components/lotus/PerkLayers";
import { AvatarPortrait } from "../components/avatar/AvatarPortrait";
import { Screen } from "../components/Screen";
import { Button, Card, T, common } from "../components/ui";
import { useLotus } from "../hooks/useLotus";
import { useLotusForms } from "../hooks/useLotusForms";
import { invalidate } from "../hooks/useRemote";
import { ApiError } from "../services/community-api";
import { bloomLotus, buyBreed, newRequestId, PUBLISHED_ODDS, rebloomLotus, type LotusState } from "../services/lotus-api";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";
import { LOTUS_TIER_KEYS } from "./game/home/bits";

type Phase = "idle" | "asking" | "playing";
/** Server refusals that start nothing: the next attempt gets a fresh request id. */
const definite = (problem: unknown) => problem instanceof ApiError && problem.status >= 400 && problem.status < 500;

/** The bred Adult form on the stage, wearing the perks of the account's current lotus. */
function BredStage({ state }: { state: LotusState }) {
  const forms = useLotusForms(state.breed?.adultId, state.breed?.miniId), tier = state.tier!, t = useT("game"), tc = useT("common");
  if (!forms.adult) return <View style={s.bred}>{forms.error ? <Button label={tc("retry")} variant="link" onPress={forms.retry} />
    : <ActivityIndicator accessibilityLabel={t("lotusLoadingAvatar")} />}</View>;
  return <View style={s.bred} accessible accessibilityRole="image" accessibilityLabel={t("lotusFormLabel", { form: t("lotusFormAdult"), perks: perkLabel(tier, t) }).trim()}>
    <PerkLayers tier={tier} size={240}><AvatarPortrait avatar={forms.adult} size={206} animate label="" /></PerkLayers>
  </View>;
}

export function LotusScreen() {
  const { member, remote, unavailable } = useLotus();
  const { theme, reducedMotion } = usePreferences(), t = useT("game"), tc = useT("common");
  const tierName = (tier: NonNullable<LotusState["tier"]>) => t(LOTUS_TIER_KEYS[tier]);
  // The latest answer to this screen's own request, shown until the next server refresh replaces `over`.
  const [phase, setPhase] = useState<Phase>("idle"), [result, setResult] = useState<{ value: LotusState; over: LotusState | undefined } | null>(null);
  const [error, setError] = useState(""), [showOdds, setShowOdds] = useState(false), [buying, setBuying] = useState(false);
  const [rolled, setRolled] = useState<{ tier: NonNullable<LotusState["tier"]>; kept: NonNullable<LotusState["tier"]>; was: LotusState["tier"] } | null>(null);
  const requests = useRef({ bloom: "", rebloom: "", breed: "" }), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = useCallback(() => { clearTimeout(timer.current); setPhase("idle"); invalidate("lotus:"); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!member) return <Screen title={t("lotusTitle")} backTo="/account">
    <T muted>{t("signInToBloom")}</T>
    <Button label={tc("signIn")} icon="log-in-outline" onPress={() => router.push({ pathname: "/login", params: { returnTo: "/lotus" } })} />
  </Screen>;
  if (unavailable) return <Screen title={t("lotusTitle")} backTo="/account"><T muted>{t("lotusNotAvailable")}</T></Screen>;

  const state = result && remote.data === result.over ? result.value : remote.data ?? result?.value;
  const playTier = rolled?.tier ?? state?.tier ?? null, playing = phase === "playing" && !!playTier;
  const tier = state?.tier ?? null, bloomed = !!tier && !playing, bred = state?.breed?.status === "bred" && !!state.breed.adultId;
  const canBloom = !!state?.freeBloom && phase === "idle";
  /** Repeating the same request id after a dropped connection returns the bloom the server already recorded. */
  const roll = async (kind: "bloom" | "rebloom") => {
    if (phase !== "idle") return;
    const was = state?.tier ?? null;
    requests.current[kind] ||= newRequestId(kind);
    setPhase("asking"); setError(""); setRolled(null);
    try {
      const next = await (kind === "bloom" ? bloomLotus : rebloomLotus)(requests.current[kind]);
      requests.current[kind] = "";
      setResult({ value: next, over: remote.data }); setRolled(next.bloom && next.tier ? { tier: next.bloom.tier, kept: next.tier, was } : null); setPhase("playing");
      timer.current = setTimeout(finish, bloomDuration(reducedMotion));
    } catch (problem) {
      setPhase("idle");
      if (definite(problem)) requests.current[kind] = "";
      if (problem instanceof ApiError && problem.code === "BLOOMED") { invalidate("lotus:"); return; }
      setError(problem instanceof Error ? problem.message : t("lotusBloomFailed"));
    }
  };
  const buy = async () => {
    if (buying) return false;
    requests.current.breed ||= newRequestId("breed");
    setBuying(true); setError("");
    try { setResult({ value: await buyBreed(requests.current.breed), over: remote.data }); requests.current.breed = ""; invalidate("lotus:"); return true; }
    catch (problem) {
      if (definite(problem)) requests.current.breed = "";
      setError(problem instanceof Error ? problem.message : t("lotusBreedFailed")); return false;
    } finally { setBuying(false); }
  };
  const outcome = rolled && rolled.was && !playing ? (rolled.kept !== rolled.was ? t("lotusGrewTo", { tier: tierName(rolled.kept) })
    : t("lotusBloomedKept", { rolled: tierName(rolled.tier), kept: tierName(rolled.kept) })) : "";
  const headline = playing ? t("lotusBlooming") : outcome || (tier ? (bred ? t("lotusYourTier", { tier: tierName(tier) }) : t("lotusWaiting", { tier: tierName(tier) })) : t("lotusTapToBloom"));
  return <Screen title={t("lotusTitle")} backTo="/account">
    <View testID="lotus-stage" style={[s.stage, { backgroundColor: theme.accentSoft }]}>
      {playing ? <View accessible accessibilityLabel={t("lotusBloomingA11y")}><BloomAnimation key={state?.bloom?.id} tier={playTier} size={170} /></View>
        : bred && state ? <BredStage state={state} />
        : <Pressable disabled={!canBloom} onPress={() => void roll("bloom")} accessibilityRole="button" accessible={canBloom} aria-hidden={!canBloom}
          accessibilityLabel={t("lotusBloomA11y")} style={s.seal}><LotusSeal tier={bloomed ? tier : null} height={300} /></Pressable>}
      {playing && <View style={s.skip}><Button label={t("lotusSkip")} variant="secondary" testID="lotus-skip" onPress={finish} /></View>}
    </View>
    {!state && !remote.error ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("lotusLoading")} />
      : <T variant="title" style={common.center} testID="lotus-headline" accessibilityLiveRegion="polite">{state ? headline : t("lotusLoadFailed")}</T>}
    {!state && !!remote.error && <Button label={tc("retry")} variant="link" onPress={remote.refresh} />}
    {!!state?.freeBloom && !playing && <>
      <Button label={t("lotusBloomMine")} testID="lotus-bloom" loading={phase === "asking"} disabled={!canBloom} onPress={() => void roll("bloom")} />
      <T variant="small" muted style={common.center}>{t("lotusFreeOnce")}</T>
    </>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite" style={common.center}>{error}</T>}
    {bloomed && state && <LotusActions state={state} busy={buying || phase !== "idle"} onBuy={buy} onRebloom={() => void roll("rebloom")} />}
    {bloomed && <Bloomed tier={tier} bred={bred} />}
    {bloomed && <Button label={showOdds ? t("lotusHideOdds") : t("lotusOdds")} variant="link" onPress={() => setShowOdds(v => !v)} />}
    {(!bloomed || showOdds) && <Card>
      <T variant="subtitle" accessibilityRole="header">{t("lotusOdds")}</T>
      <OddsList odds={state?.odds ?? PUBLISHED_ODDS} />
    </Card>}
  </Screen>;
}

function Bloomed({ tier, bred }: { tier: NonNullable<LotusState["tier"]>; bred: boolean }) {
  const t = useT("game");
  return <View style={common.stack}>
    {tier === "pink" ? <T muted style={common.center}>{t("avatarStyles")}</T> : <>
      <T variant="subtitle" accessibilityRole="header">{t("lotusBrings")}</T>
      <Perks tier={tier} bred={bred} />
    </>}
    <Button label={t("lotusVisitCafe")} variant="secondary" icon="storefront-outline" onPress={() => router.push("/game/cafe")} />
  </View>;
}

const s = StyleSheet.create({
  stage: { borderRadius: 18, minHeight: 300, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  seal: { alignSelf: "stretch" },
  skip: { position: "absolute", top: 10, right: 10 },
  bred: { minHeight: 300, alignItems: "center", justifyContent: "center", paddingVertical: 20 },
});
