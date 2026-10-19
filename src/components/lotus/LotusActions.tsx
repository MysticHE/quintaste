/**
 * What the member can do with a bloomed lotus (AVATAR_LOTUS_PLAN §2 steps 5–6): breed their avatar with 600 earned café
 * credits (a progress ring while saving), or re-bloom for 150. Credits are earned in Rush Hour only and never sold; no
 * store prices are shown until store billing exists (L1). Spending always asks first, and the re-bloom confirmation shows
 * the odds again. No countdowns, streaks or offers.
 */
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { MarketModal } from "../market/MarketChrome";
import { Button, T, common } from "../ui";
import { Pill, PlayButton } from "../../screens/game/home/Controls";
import { TIER_NAMES } from "../../game/content/lotus";
import type { LotusState } from "../../services/lotus-api";
import { usePreferences } from "../../state/Preferences";
import { LotusBud } from "./LotusSeal";
import { OddsList } from "./LotusDetails";

/** Saving towards a breed: the lotus inside a ring that fills with café credits. */
function GrowRing({ state, size = 92 }: { state: LotusState; size?: number }) {
  const { theme } = usePreferences(), price = state.prices!.breed, have = Math.min(state.credits ?? 0, price);
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return <View style={common.row} accessible accessibilityLabel={`Saving for your breed: ${have} of ${price} café credits`}>
    <View style={[s.centre, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.lotus[state.tier ?? "pink"]} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * have / price} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <LotusBud tier={state.tier} size={size * 0.42} sealed={false} />
    </View>
    <View style={[common.flex, s.tight]}>
      <T style={common.bold}>{have} / {price} credits</T>
      <T variant="small" muted>Every Rush Hour clear grows your lotus.</T>
    </View>
  </View>;
}

type Spend = "breed" | "rebloom";
export function LotusActions({ state, busy, onBuy, onRebloom }: { state: LotusState; busy: boolean; onBuy(): Promise<boolean>; onRebloom(): void }) {
  const [confirm, setConfirm] = useState<Spend | null>(null);
  if (!state.prices || !state.breeds) return null;
  const credits = state.credits ?? null, { breed: price, rebloom } = state.prices, breed = state.breed;
  const running = breed?.status === "breeding" || state.breeds.held > 0, ready = state.breeds.available > 0;
  const bred = breed?.status === "bred" && !!breed.adultId, golden = state.tier === "golden";
  // Saving: the ring shows the balance, so the credits pill is left out.
  const saving = !running && !ready && credits !== null && !(credits >= price && state.generation);
  const close = () => setConfirm(null);
  const buy = async () => { if (await onBuy()) { close(); router.push("/lotus-breed"); } };
  return <View style={s.stack}>
    {running ? <PlayButton icon="sparkles" title="Breeding Your Avatar" sub="See progress" onPlay={() => router.push("/lotus-breed")} />
      : ready ? <PlayButton icon="sparkles" title="Breed Your Avatar" sub="Your breed is ready" onPlay={() => router.push("/lotus-breed")} />
      : credits === null ? <T variant="small" muted style={common.center}>Café credits are unavailable right now.</T>
      : credits >= price && state.generation ? <PlayButton icon="sparkles" title={bred ? "Breed A New Avatar" : "Breed Your Avatar"} sub={price + " café credits"} onPlay={() => setConfirm("breed")} />
      : saving ? <GrowRing state={state} /> : null}
    {!running && !ready && credits !== null && credits >= price && !state.generation && <T variant="small" muted style={common.center}>Breeding is paused right now.</T>}
    <View style={[common.row, s.pills]}>
      {bred && <Pill icon="person-circle-outline" text="Your Forms" label="See your Adult and Mini forms" onPress={() => router.push("/lotus-breed")} />}
      {!golden && credits !== null && <Pill icon="refresh" text={"Re-bloom · " + rebloom} label={`Re-bloom for ${rebloom} café credits`}
        disabled={busy || credits < rebloom} onPress={() => setConfirm("rebloom")} />}
      {credits !== null && !saving && <Pill icon="sparkles" text={credits + " credits"} label={credits + " café credits"} />}
      {saving && <Pill icon="game-controller-outline" text="Play" label="Play Rush Hour to earn café credits" onPress={() => router.push("/game")} />}
    </View>
    {!golden && <Pity state={state} />}
    <MarketModal visible={confirm === "breed"} onClose={close} label="Breed Your Avatar?">
      <T>Spend {price} café credits to breed your avatar from your {TIER_NAMES[state.tier!]} Lotus. You take one selfie next and get both Adult and Mini forms.</T>
      <T variant="small" muted>If breeding fails, nothing is used up.</T>
      <Button label={"Spend " + price + " Credits"} loading={busy} onPress={() => void buy()} />
      <Button label="Not Now" variant="link" onPress={close} />
    </MarketModal>
    <MarketModal visible={confirm === "rebloom"} onClose={close} label="Re-bloom Your Lotus?">
      <T>Spend {rebloom} café credits for a new bloom. You keep the better of your {TIER_NAMES[state.tier!]} Lotus and the new one.</T>
      <OddsList odds={state.odds} />
      <Button label={"Re-bloom · " + rebloom + " Credits"} loading={busy} onPress={() => { close(); onRebloom(); }} />
      <Button label="Not Now" variant="link" onPress={close} />
    </MarketModal>
  </View>;
}

/** The pity counter: blooms left before Blue or better and before Golden are guaranteed. */
function Pity({ state }: { state: LotusState }) {
  const blue = state.pity.blueWithin - state.pity.sinceBlue, gold = state.pity.goldenBy - state.pity.sinceGolden;
  // A Blue lotus is kept anyway, so only the Golden guarantee matters to it.
  return <T variant="small" muted style={common.center} testID="lotus-pity">
    {state.tier === "blue" ? "" : `Blue or better within ${blue} ${blue === 1 ? "bloom" : "blooms"} · `}Golden within {gold} {gold === 1 ? "bloom" : "blooms"}
  </T>;
}

const s = StyleSheet.create({
  stack: { gap: 12, alignItems: "center" },
  pills: { flexWrap: "wrap", justifyContent: "center", gap: 8 },
  centre: { alignItems: "center", justifyContent: "center" },
  tight: { gap: 2 },
});
