/**
 * The reveal (AVATAR_LOTUS_PLAN §2 step 9): the Adult form first, a swipe to the Mini form, the lotus perks popping on
 * one by one, then Use Adult, Use Mini or Keep Lian. Both forms are already saved in the member's avatar library; choosing
 * only sets the account's avatar. Up to two free tries with a new selfie, and Report stays available.
 */
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Pill } from "../../screens/game/home/Controls";
import type { Tier } from "../../game/content/cosmetics";
import { useLotusForms } from "../../hooks/useLotusForms";
import type { LotusBreed } from "../../services/lotus-api";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { AvatarPortrait } from "../avatar/AvatarPortrait";
import { AvatarReport } from "../avatar/AvatarReport";
import { SegmentedTabs } from "../SegmentedTabs";
import { Button, T, common } from "../ui";
import { PerkLayers, perkLabel } from "./PerkLayers";

const FORMS = [{ key: "adult", name: "Adult" }, { key: "mini", name: "Mini" }] as const;
const FORM_TABS = FORMS.map(f => ({ id: f.key, label: f.name }));

export function BreedResult({ breed, tier, reveal, onAgain }: { breed: LotusBreed; tier: Tier; reveal: boolean; onAgain(): void }) {
  const { theme, reducedMotion, setNotice } = usePreferences(), { doc, avatarLibrary } = useFood();
  const forms = useLotusForms(breed.adultId, breed.miniId), [page, setPage] = useState(0), [width, setWidth] = useState(0);
  const [choosing, setChoosing] = useState(""), [error, setError] = useState("");
  const pager = useRef<ScrollView>(null);
  const show = (index: number) => { setPage(index); pager.current?.scrollTo({ x: index * width, animated: !reducedMotion }); };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => { if (width) setPage(Math.round(event.nativeEvent.contentOffset.x / width)); };
  const choose = async (id: string, text: string) => {
    if (choosing) return;
    setChoosing(id); setError("");
    const ok = await avatarLibrary.select(id);
    setChoosing("");
    if (ok) setNotice({ text }); else setError(avatarLibrary.error || "Your choice did not save. Try again.");
  };
  if (!forms.adult || !forms.mini) return <View style={s.stack}>
    {forms.error ? <><T color={theme.error} style={common.center}>{forms.error}</T><Button label="Retry" variant="link" onPress={forms.retry} /></>
      : <ActivityIndicator color={theme.accent} accessibilityLabel="Opening your forms" />}
  </View>;
  const current = doc.avatar?.id, selected = (id: string) => current === id;
  const size = Math.min(260, Math.max(200, width - 40));
  return <View style={s.stack}>
    <View style={[s.stage, { backgroundColor: theme.accentSoft }]} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {!!width && <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64}>
        {FORMS.map(f => <View key={f.key} style={[s.page, { width }]} accessible accessibilityRole="image"
          accessibilityLabel={`Your ${f.name} form ${perkLabel(tier)}`.trim()}>
          <PerkLayers tier={tier} size={size} reveal={reveal && f.key === "adult"}>
            <AvatarPortrait avatar={forms[f.key]} size={size * 0.86} animate label="" />
          </PerkLayers>
        </View>)}
      </ScrollView>}
    </View>
    <View style={s.tabs}><SegmentedTabs label="Form" options={FORM_TABS} value={FORMS[page].key} onChange={key => show(FORMS.findIndex(f => f.key === key))} /></View>
    <T variant="title" style={common.center}>Your avatar has bloomed</T>
    <View style={[common.row, s.wrap]}>
      <Pill icon={selected(breed.adultId!) ? "checkmark-circle" : "person-outline"} text="Use Adult" label="Use your Adult form" disabled={!!choosing}
        strong={selected(breed.adultId!)} onPress={() => void choose(breed.adultId!, "Adult form chosen")} />
      <Pill icon={selected(breed.miniId!) ? "checkmark-circle" : "happy-outline"} text="Use Mini" label="Use your Mini form" disabled={!!choosing}
        strong={selected(breed.miniId!)} onPress={() => void choose(breed.miniId!, "Mini form chosen")} />
      <Pill icon={!current ? "checkmark-circle" : "flower-outline"} text="Keep Lian" label="Keep Lian, the QuinTaste mascot" disabled={!!choosing}
        strong={!current} onPress={() => void choose("default", "Lian kept")} />
    </View>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    {breed.regenerationsLeft > 0 && <Button label={`Try Again With A New Selfie · ${breed.regenerationsLeft} Free`} variant="link" onPress={onAgain} />}
    <View style={s.report}><AvatarReport key={page} avatarId={page ? breed.miniId! : breed.adultId!} owner="profile" /></View>
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 12, alignItems: "center" },
  stage: { alignSelf: "stretch", borderRadius: 18, overflow: "hidden", minHeight: 280 },
  page: { alignItems: "center", justifyContent: "center", paddingVertical: 18 },
  wrap: { flexWrap: "wrap", justifyContent: "center", gap: 8 },
  report: { alignSelf: "stretch" },
  tabs: { width: 220 },
});
