import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Field, Icon, T, common } from "../../components/ui";
import { SwitchRow } from "../../components/GroupedList";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { DietChoice, PhotoNotice, PickTiles, usePickPhoto, useSnapChoices, useSnapFailure } from "../../components/recipes/SnapParts";
import { useAskForAlerts } from "../../hooks/useAskForAlerts";
import { invalidate } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { snapDish, startPhotoJob, type SnapGuess } from "../../services/ai-recipes";
import { useLanguage, useT } from "../../i18n";

type Snapped = { photo: string; snap: string; guesses: SnapGuess[] };

/**
 * Snap a dish (docs/AI_FOOD_LIBRARY_PLAN.md §6, screen 2), one screen: the photo, the AI's dish name with "Not this? Change", the
 * diet (remembered), whether to share the recipe, and Create recipe. Before the first photo, one line says where it goes.
 */
export function SnapDishScreen() {
  const member = useMember(), { theme, setNotice } = usePreferences(), t = useT("cook"), language = useLanguage();
  const askForAlerts = useAskForAlerts(), alive = useRef(true), pickPhoto = usePickPhoto();
  const { consent, agree, revoke, diet, chooseDiet } = useSnapChoices(member.userId), failed = useSnapFailure(revoke);
  const [share, setShare] = useState(false);
  const [snapped, setSnapped] = useState<Snapped | null>(null), [naming, setNaming] = useState<string | null>(null);
  const [choice, setChoice] = useState(0), [changing, setChanging] = useState(false), [typed, setTyped] = useState(""), [useTyped, setUseTyped] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);
  // Snap a dish is for signed-in members: anyone else goes to sign in (or the age check) and comes back here.
  const needsSignIn = member.enabled && !member.pending && !member.member;
  useEffect(() => { if (needsSignIn) ensureMember(member, "/cook/snap"); }, [needsSignIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = async (camera: boolean) => {
    if (!ensureMember(member, "/cook/snap") || busy) return;
    const photo = await pickPhoto(camera);
    if (!photo || !alive.current) return;
    setSnapped(null); setNaming(photo); setChoice(0); setChanging(false); setTyped(""); setUseTyped(false);
    try {
      const seen = await snapDish(photo);
      if (alive.current) setSnapped({ photo, ...seen });
    } catch (error) { if (alive.current) failed(error, t("snapFailed")); }
    finally { if (alive.current) setNaming(null); }
  };
  const create = async () => {
    if (!snapped || busy) return;
    setBusy(true);
    try {
      await startPhotoJob({ snap: snapped.snap, ...(useTyped ? { dish: typed.trim() } : { choice }), diet, private: !share });
      invalidate("ai-recipes:mine"); invalidate("ai-recipes:status");
      setNotice({ text: t("aiAdded") });
      askForAlerts("recipe");
      router.dismissTo("/cook/ai" as never);
    } catch (error) { failed(error, t("aiStartFailed")); }
    finally { if (alive.current) setBusy(false); }
  };
  const name = (guess: SnapGuess) => guess.name[language] || guess.name.en;
  const dishName = useTyped ? typed.trim() : snapped ? name(snapped.guesses[choice]) : "";
  const photo = snapped?.photo ?? naming;

  return <CookLayout title={t("snapTitle")} backTo="/cook/ai">
    {consent === false && <PhotoNotice onAgree={agree} />}
    {consent && !photo && <PickTiles onPick={camera => void pick(camera)} />}
    {consent && photo && <View style={s.stack}>
      <Image source={{ uri: photo }} contentFit="cover" style={[s.photo, { backgroundColor: theme.muted }]} accessibilityIgnoresInvertColors accessible={false} />
      {naming && <View style={[common.row, s.naming]}><ActivityIndicator color={theme.accent} /><T muted>{t("snapNaming")}</T></View>}
      {snapped && <>
        <View style={s.name}>
          <T variant="title" accessibilityRole="header">{dishName || t("snapTypeDish")}</T>
          {!changing && <Pressable accessibilityRole="button" onPress={() => setChanging(true)} hitSlop={{ top: 14, bottom: 14 }} style={s.link}>
            <T variant="small" color={theme.accent} style={common.bold}>{t("snapNotThis")}</T></Pressable>}
        </View>
        {changing && <View style={s.stack}>
          {snapped.guesses.map((guess, index) => index === choice && !useTyped ? null : <Pressable key={guess.card ?? guess.name.en} accessibilityRole="button"
            onPress={() => { setChoice(index); setUseTyped(false); setChanging(false); }}
            style={({ pressed }) => [common.row, s.guess, { borderColor: theme.border, backgroundColor: pressed ? theme.accentSoft : theme.card }]}>
            <T style={common.flex}>{name(guess)}</T><Icon name="chevron-forward" size={16} color={theme.mutedForeground} />
          </Pressable>)}
          <Field label={t("snapTypeDish")} showLabel={false} placeholder={t("snapTypeDish")} value={typed} maxLength={80} returnKeyType="done"
            onChangeText={setTyped} onSubmitEditing={() => { if (typed.trim().length >= 2) { setUseTyped(true); setChanging(false); } }}
            trailing={<Pressable accessibilityRole="button" accessibilityLabel={t("snapUseName")} disabled={typed.trim().length < 2} hitSlop={12}
              onPress={() => { setUseTyped(true); setChanging(false); }}><Icon name="arrow-forward" size={20} color={typed.trim().length >= 2 ? theme.accent : theme.mutedForeground} /></Pressable>} />
        </View>}
        <DietChoice value={diet} onChange={chooseDiet} />
        <SwitchRow label={t("snapShare")} value={share} onChange={setShare} />
        <Button label={t("snapCreate")} icon="sparkles" loading={busy} disabled={busy || !dishName} onPress={() => void create()} />
      </>}
      {!naming && <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSnapped(null); setNaming(null); }} hitSlop={{ top: 14, bottom: 14 }} style={s.link}>
        <T variant="small" color={theme.accent} style={common.bold}>{t("snapRetake")}</T></Pressable>}
    </View>}
  </CookLayout>;
}
const s = StyleSheet.create({
  stack: { gap: 12 },
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 20 },
  naming: { gap: 10, justifyContent: "center" },
  name: { gap: 2 },
  link: { alignSelf: "flex-start" },
  guess: { minHeight: 48, gap: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14 },
});
