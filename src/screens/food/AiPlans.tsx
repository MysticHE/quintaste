import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { CookLayout } from "../../components/recipes/CookLayout";
import { AiShowcase, Rise } from "../../components/recipes/AiShowcase";
import { Button, Icon, T, common, type IconName } from "../../components/ui";
import { MarketModal } from "../../components/market/MarketChrome";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { usePreferences } from "../../state/Preferences";
import { aiPlan, aiPlans, aiRecipeFeatures, bestValue, cancelWhere, paymentChannel, paymentsLive, planName, planPrice, termsUrl, type AiPlan, type AiPlanId } from "../../config/ai-plans";
import { useDietText } from "../../components/food/DietLabels";
import { badgeName } from "../../utils/nutrition";
import { sgDay } from "../../utils/sg-datetime";
import { useLanguage, useT, type Language } from "../../i18n";

const MOCHI = require("../../../assets/mochi/mochi-happy.webp");

/**
 * AI Recipes plans: a showcase hero, three words of value, two plan tiles side by side and one action. Owner direction
 * (21 Oct 2026): clean, as few words as possible, no platform names, no per-recipe figures. Until payments are connected the
 * flow ends in a notice and nothing is charged (src/config/ai-plans.ts).
 */
export function AiPlansScreen() {
  const member = useMember(), { theme } = usePreferences(), t = useT("cook"), language = useLanguage(), dietText = useDietText();
  const [chosen, setChosen] = useState<AiPlanId>("ai-cook"), plan = aiPlan(chosen) ?? aiPlans[0];
  const featureVars = { badge: badgeName("High in fibre", language), vegan: dietText.name("Vegan"), vegetarian: dietText.name("Vegetarian") };
  const next = () => { if (ensureMember(member, "/cook/ai-plans")) router.push({ pathname: "/cook/ai-checkout" as never, params: { plan: chosen } }); };
  return <CookLayout title={t("aiTitle")} backTo="/cook/ai"
    footer={<Rise delay={420} style={s.footer}>
      <Button label={t("continueWith", { name: planName(plan, language) })} onPress={next} />
      <T variant="caption" muted style={s.center}>{t("cancelAnytime")}</T>
      <Legal />
    </Rise>}>
    <AiShowcase height={196} />
    <Rise delay={120} style={s.hero}>
      <T variant="title" accessibilityRole="header" style={s.center}>{t("plansHero")}</T>
    </Rise>
    <Rise delay={200}>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("choosePlanLower")} style={s.tiles}>
        {aiPlans.map(item => <PlanTile key={item.id} plan={item} selected={item.id === chosen} onPress={() => setChosen(item.id)} />)}
      </View>
    </Rise>
    <Rise delay={280} style={s.features}>
      <T style={common.bold} accessibilityRole="header">{t("whatYouGet")}</T>
      <View style={s.grid}>
        {aiRecipeFeatures.map(item => <View key={item.label} style={[s.feature, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[s.featureIcon, { backgroundColor: theme.accentSoft }]}><Icon name={item.icon as IconName} size={18} color={theme.accent} /></View>
          <T variant="small" style={common.bold} numberOfLines={1}>{t(item.label)}</T>
          <T variant="caption" muted numberOfLines={2}>{t(item.detail, featureVars)}</T>
        </View>)}
      </View>
    </Rise>
  </CookLayout>;
}

/** A plan tile: name, the price large, how many recipes. The chosen tile lifts slightly and shows a check. */
function PlanTile({ plan, selected, onPress }: { plan: AiPlan; selected: boolean; onPress: () => void }) {
  const { theme, reducedMotion } = usePreferences(), { focused, focusProps } = useKeyboardFocus(), best = plan.id === bestValue;
  const t = useT("cook"), name = planName(plan, useLanguage());
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => { lift.value = reducedMotion ? (selected ? 1 : 0) : withSpring(selected ? 1 : 0, { damping: 13, stiffness: 180 }); }, [selected, reducedMotion, lift]);
  const moved = useAnimatedStyle(() => ({ transform: [{ scale: 1 + lift.value * 0.03 }, { translateY: -lift.value * 3 }] }));
  const onAccent = theme.dark ? theme.background : theme.actionForeground;
  return <Animated.View style={[s.tileWrap, moved]}>
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} {...focusProps}
      accessibilityLabel={t(best ? "planTileLabelBest" : "planTileLabel", { name, price: planPrice(plan), n: plan.recipesPerMonth })}
      style={({ pressed }) => [s.tile, { backgroundColor: selected ? theme.accentSoft : pressed ? theme.muted : theme.card,
        borderColor: selected || focused ? theme.accent : theme.border, shadowColor: theme.shadow, shadowOpacity: selected ? 0.18 : 0 }]}>
      <View style={common.spread}>
        <T variant="small" style={common.bold} numberOfLines={1}>{name}</T>
        <Icon name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? theme.accent : theme.border} />
      </View>
      <T variant="title" style={s.price}>{planPrice(plan)}</T>
      <T variant="caption" muted>{t("aMonth")}</T>
      <View style={[s.count, { backgroundColor: selected ? theme.card : theme.accentSoft }]}>
        <T variant="small" style={common.bold}>{t("aiRecipesCount", { n: plan.recipesPerMonth })}</T>
      </View>
    </Pressable>
    {best && <View style={[s.ribbon, { backgroundColor: theme.accent }]}><T variant="caption" color={onAccent} style={common.bold}>{t("bestValue")}</T></View>}
  </Animated.View>;
}

/** Terms (where they exist) and privacy, as the stores require on a subscription screen. */
function Legal() {
  const { theme } = usePreferences(), terms = termsUrl, t = useT("cook");
  return <View style={[common.row, s.legal]}>
    {terms && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(terms)} hitSlop={12} style={s.link}>
      <T variant="caption" color={theme.accent}>{t("termsOfUse")}</T></Pressable>}
    <Pressable accessibilityRole="link" onPress={() => router.push("/privacy")} hitSlop={12} style={s.link}>
      <T variant="caption" color={theme.accent}>{t("privacy")}</T></Pressable>
  </View>;
}

const renewal = new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", year: "numeric" });
/** The same day next month, when a monthly plan started today would renew: "24 Nov 2026", Chinese "2026年11月24日". */
function nextRenewal(language: Language, now = new Date()) {
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);
  if (language !== "zh") return renewal.format(next);
  const [year, month, day] = sgDay(next.getTime()).split("-");
  return year + "年" + Number(month) + "月" + Number(day) + "日";
}

/** Checkout as a ticket: the billed amount is the largest element (App Store rule), then how it is paid, renewal and cancelling. */
export function AiCheckoutScreen() {
  const { plan: id } = useLocalSearchParams<{ plan?: string }>(), plan = aiPlan(id) ?? aiPlans[0];
  const member = useMember(), { theme } = usePreferences(), [notice, setNotice] = useState(false);
  const t = useT("cook"), tc = useT("common"), language = useLanguage(), price = planPrice(plan);
  const subscribe = () => { if (!ensureMember(member, "/cook/ai-checkout?plan=" + plan.id)) return; if (!paymentsLive) setNotice(true); };
  return <CookLayout title={t("reviewPlan")} backTo="/cook/ai-plans"
    footer={<Rise delay={260} style={s.footer}>
      <Button label={t("subscribeFor", { price })} onPress={subscribe} />
      <T variant="caption" muted style={s.center}>{t("renewsMonthly", { where: cancelWhere(language) })}</T>
      <Legal />
    </Rise>}>
    <Rise style={[s.ticket, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
      <LinearGradient colors={[...theme.gradient] as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ticketTop}>
        <View style={common.flex}>
          <T style={common.bold}>{t("aiPlanTicket", { name: planName(plan, language) })}</T>
          <T variant="display" accessibilityLabel={t("priceAMonth", { price })}>{price}<T muted>{t("perMonth")}</T></T>
          <T variant="small" muted>{t("aiRecipesAMonth", { n: plan.recipesPerMonth })}</T>
        </View>
        <Image source={MOCHI} style={s.ticketMochi} accessibilityIgnoresInvertColors />
      </LinearGradient>
      <View style={s.ticketBody}>
        <Line icon="card-outline" label={t("payWith")} value={paymentChannel(language)} />
        <Line icon="calendar-outline" label={t("renews")} value={nextRenewal(language)} />
        <Line icon="close-circle-outline" label={tc("cancel")} value={t("anytime")} />
      </View>
    </Rise>
    <Rise delay={160}><Button label={t("changePlan")} variant="link" onPress={() => router.back()} /></Rise>
    <MarketModal visible={notice} onClose={() => setNotice(false)} label={t("paymentsNotOpen")}>
      <T>{t("nothingCharged")}</T>
      <Button label={t("backToAi")} onPress={() => { setNotice(false); router.dismissTo("/cook/ai" as never); }} />
    </MarketModal>
  </CookLayout>;
}
function Line({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={[common.row, s.line]}><Icon name={icon} size={18} /><T muted style={common.flex}>{label}</T><T style={common.bold}>{value}</T></View>;
}
const s = StyleSheet.create({
  hero: { paddingTop: 6 },
  center: { textAlign: "center" },
  features: { gap: 10, paddingTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: { flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  tiles: { flexDirection: "row", gap: 12, paddingTop: 12 },
  tileWrap: { flex: 1 },
  tile: { borderWidth: 2, borderRadius: 20, padding: 14, gap: 2, minHeight: 156, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 0 },
  price: { marginTop: 8 },
  count: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  ribbon: { position: "absolute", top: -11, alignSelf: "center", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  footer: { gap: 8 },
  legal: { gap: 24, justifyContent: "center" },
  link: { minHeight: 32, justifyContent: "center" },
  ticket: { borderWidth: 1, borderRadius: 24, overflow: "hidden", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 4 },
  ticketTop: { flexDirection: "row", alignItems: "center", padding: 18, gap: 12 },
  ticketMochi: { width: 72, height: 72, resizeMode: "contain" },
  ticketBody: { paddingHorizontal: 18, paddingVertical: 6 },
  line: { gap: 10, minHeight: 48 },
});
