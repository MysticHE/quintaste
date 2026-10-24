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
import { LOTUS_TIER_KEYS } from "../../screens/game/home/bits";
import { useT } from "../../i18n";
import type { LotusState } from "../../services/lotus-api";
import { usePreferences } from "../../state/Preferences";
import { LotusBud } from "./LotusSeal";
import { OddsList } from "./LotusDetails";

/** Saving towards a breed: the lotus inside a ring that fills with café credits. */
function GrowRing({ state, size = 92 }: { state: LotusState; size?: number }) {
  const { theme } = usePreferences(), price = state.prices!.breed, have = Math.min(state.credits ?? 0, price), t = useT("game");
  const r = size / 2 - 5, c = 2 * Math.PI * r;
  return <View style={common.row} accessible accessibilityLabel={t("lotusSavingA11y", { have, price })}>
    <View style={[s.centre, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.border} strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.lotus[state.tier ?? "pink"]} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * have / price} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <LotusBud tier={state.tier} size={size * 0.42} sealed={false} />
    </View>
    <View style={[common.flex, s.tight]}>
      <T style={common.bold}>{t("lotusCreditsOf", { have, price })}</T>
      <T variant="small" muted>{t("lotusEveryClear")}</T>
    </View>
  </View>;
}

type Spend = "breed" | "rebloom";
export function LotusActions({ state, busy, onBuy, onRebloom }: { state: LotusState; busy: boolean; onBuy(): Promise<boolean>; onRebloom(): void }) {
  const [confirm, setConfirm] = useState<Spend | null>(null), t = useT("game");
  if (!state.prices || !state.breeds) return null;
  const tierName = state.tier ? t(LOTUS_TIER_KEYS[state.tier]) : "";
  const credits = state.credits ?? null, { breed: price, rebloom } = state.prices, breed = state.breed;
  const running = breed?.status === "breeding" || state.breeds.held > 0, ready = state.breeds.available > 0;
  const bred = breed?.status === "bred" && !!breed.adultId, golden = state.tier === "golden";
  // Saving: the ring shows the balance, so the credits pill is left out.
  const saving = !running && !ready && credits !== null && !(credits >= price && state.generation);
  const close = () => setConfirm(null);
  const buy = async () => { if (await onBuy()) { close(); router.push("/lotus-breed"); } };
  return <View style={s.stack}>
    {running ? <PlayButton icon="sparkles" title={t("lotusBreedingAvatar")} sub={t("lotusSeeProgress")} onPlay={() => router.push("/lotus-breed")} />
      : ready ? <PlayButton icon="sparkles" title={t("lotusBreedTitle")} sub={t("lotusBreedReady")} onPlay={() => router.push("/lotus-breed")} />
      : credits === null ? <T variant="small" muted style={common.center}>{t("lotusCreditsUnavailable")}</T>
      : credits >= price && state.generation ? <PlayButton icon="sparkles" title={bred ? t("lotusBreedNew") : t("lotusBreedTitle")} sub={t("cafeCredits", { n: price })} onPlay={() => setConfirm("breed")} />
      : saving ? <GrowRing state={state} /> : null}
    {!running && !ready && credits !== null && credits >= price && !state.generation && <T variant="small" muted style={common.center}>{t("lotusBreedPaused")}</T>}
    <View style={[common.row, s.pills]}>
      {bred && <Pill icon="person-circle-outline" text={t("lotusYourForms")} label={t("lotusSeeForms")} onPress={() => router.push("/lotus-breed")} />}
      {!golden && credits !== null && <Pill icon="refresh" text={t("lotusRebloomPill", { n: rebloom })} label={t("lotusRebloomA11y", { n: rebloom })}
        disabled={busy || credits < rebloom} onPress={() => setConfirm("rebloom")} />}
      {credits !== null && !saving && <Pill icon="sparkles" text={t("credits", { n: credits })} label={t("cafeCredits", { n: credits })} />}
      {saving && <Pill icon="game-controller-outline" text={t("play")} label={t("lotusPlayToEarn")} onPress={() => router.push("/game")} />}
    </View>
    {!golden && <Pity state={state} />}
    <MarketModal visible={confirm === "breed"} onClose={close} label={t("lotusBreedConfirm")}>
      <T>{t("lotusBreedConfirmBody", { price, tier: tierName })}</T>
      <T variant="small" muted>{t("lotusBreedSafe")}</T>
      <Button label={t("lotusSpend", { n: price })} loading={busy} onPress={() => void buy()} />
      <Button label={t("lotusNotNow")} variant="link" onPress={close} />
    </MarketModal>
    <MarketModal visible={confirm === "rebloom"} onClose={close} label={t("lotusRebloomConfirm")}>
      <T>{t("lotusRebloomBody", { n: rebloom, tier: tierName })}</T>
      <OddsList odds={state.odds} />
      <Button label={t("lotusRebloomButton", { n: rebloom })} loading={busy} onPress={() => { close(); onRebloom(); }} />
      <Button label={t("lotusNotNow")} variant="link" onPress={close} />
    </MarketModal>
  </View>;
}

/** The pity counter: blooms left before Blue or better and before Golden are guaranteed. */
function Pity({ state }: { state: LotusState }) {
  const blue = state.pity.blueWithin - state.pity.sinceBlue, gold = state.pity.goldenBy - state.pity.sinceGolden, t = useT("game");
  // A Blue lotus is kept anyway, so only the Golden guarantee matters to it.
  return <T variant="small" muted style={common.center} testID="lotus-pity">
    {t("lotusPity", { blue, gold, skipBlue: state.tier === "blue" ? 1 : 0 })}
  </T>;
}

const s = StyleSheet.create({
  stack: { gap: 12, alignItems: "center" },
  pills: { flexWrap: "wrap", justifyContent: "center", gap: 8 },
  centre: { alignItems: "center", justifyContent: "center" },
  tight: { gap: 2 },
});
