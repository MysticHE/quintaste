import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Card, Icon, T, common } from "../../components/ui";
import { MarketModal } from "../../components/market/MarketChrome";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { aiRecipesStatus } from "../../services/ai-recipes";
import { aiPlan, aiPlanFeatures, aiPlans, cancelWhere, paymentChannel, paymentsLive, planPrice, type AiPlan, type AiPlanId } from "../../config/ai-plans";

/** Plans for the AI features on Cook. Until payments are connected the flow ends in a notice and nothing is charged. */
export function AiPlansScreen() {
  const member = useMember(), status = useRemote(member.member ? "ai-recipes:status" : null, aiRecipesStatus);
  const [chosen, setChosen] = useState<AiPlanId>("ai-cook"), used = status.data?.usedThisMonth ?? 0;
  const next = () => { if (ensureMember(member, "/cook/ai-plans")) router.push({ pathname: "/cook/ai-checkout" as never, params: { plan: chosen } }); };
  return <CookLayout title="AI Recipes Plans" backTo="/cook/ai"
    footer={<Button label="Continue" icon="arrow-forward-outline" onPress={next} />}>
    {!paymentsLive && <Card style={common.stack}>
      <View style={[common.row, { gap: 8 }]}><Icon name="gift-outline" /><T style={[common.flex, common.bold]}>Free For Now</T></View>
      <T variant="small" muted>{member.member ? `${used} AI ${used === 1 ? "recipe" : "recipes"} this month. ` : ""}Plans start when payments open.</T>
    </Card>}
    <View accessibilityRole="radiogroup" accessibilityLabel="AI Recipes plans" style={{ gap: 10 }}>
      {aiPlans.map(plan => <PlanCard key={plan.id} plan={plan} selected={plan.id === chosen} onPress={() => setChosen(plan.id)} />)}
    </View>
  </CookLayout>;
}

function PlanCard({ plan, selected, onPress }: { plan: AiPlan; selected: boolean; onPress: () => void }) {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} {...focusProps}
    accessibilityLabel={`${plan.name}, ${planPrice(plan)} a month, ${plan.recipesPerMonth} AI recipes a month`}
    style={({ pressed }) => [s.plan, { backgroundColor: selected ? theme.accentSoft : pressed ? theme.muted : theme.card,
      borderColor: selected || focused ? theme.accent : theme.border }]}>
    <View style={common.spread}>
      <T variant="subtitle" style={common.flex}>{plan.name}</T>
      <Icon name={selected ? "radio-button-on" : "radio-button-off"} color={selected ? theme.accent : theme.mutedForeground} />
    </View>
    <T><T variant="title">{planPrice(plan)}</T><T muted> / month</T></T>
    <T style={common.bold}>{plan.recipesPerMonth} AI recipes a month</T>
    {aiPlanFeatures.map(feature => <View key={feature} style={[common.row, { gap: 6 }]}>
      <Icon name="checkmark" size={16} color={theme.accent} /><T variant="small">{feature}</T></View>)}
  </Pressable>;
}

/** Order summary and the store or card that would take payment; Subscribe explains that payments are not open yet. */
export function AiCheckoutScreen() {
  const { plan: id } = useLocalSearchParams<{ plan?: string }>(), plan = aiPlan(id) ?? aiPlans[0];
  const member = useMember(), [notice, setNotice] = useState(false);
  const subscribe = () => { if (!ensureMember(member, "/cook/ai-checkout?plan=" + plan.id)) return; if (!paymentsLive) setNotice(true); };
  return <CookLayout title="Review Plan" backTo="/cook/ai-plans"
    footer={<><Button label={`Subscribe For ${planPrice(plan)} A Month`} onPress={subscribe} />
      <T variant="caption" muted>Renews every month until you cancel in {cancelWhere}. By subscribing you agree to the Terms of Use.</T></>}>
    <Card style={common.stack}>
      <Line label="Plan" value={plan.name} />
      <Line label="AI recipes" value={plan.recipesPerMonth + " a month"} />
      <Line label="Billed" value="Monthly" />
      <Line label="Pay with" value={paymentChannel} />
      <View style={[common.spread, s.total]}><T style={common.bold}>Today</T><T style={common.bold}>{planPrice(plan)}</T></View>
    </Card>
    <Button label="Change Plan" variant="link" onPress={() => router.back()} />
    <MarketModal visible={notice} onClose={() => setNotice(false)} label="Payments Aren't Open Yet">
      <T>Nothing was charged. AI recipes stay free while we set up payments.</T>
      <Button label="Keep Using AI Recipes" onPress={() => { setNotice(false); router.dismissTo("/cook/ai" as never); }} />
    </MarketModal>
  </CookLayout>;
}
const Line = ({ label, value }: { label: string; value: string }) =>
  <View style={common.spread}><T muted>{label}</T><T style={common.bold}>{value}</T></View>;
const s = StyleSheet.create({
  plan: { borderWidth: 2, borderRadius: 16, padding: 16, gap: 6, minHeight: 48 },
  total: { paddingTop: 8 },
});
