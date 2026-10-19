import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { TIER_NAMES } from "../../game/content/lotus";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useLotus } from "../../hooks/useLotus";
import { usePreferences } from "../../state/Preferences";
import { Button, Card, Icon, T, common } from "../ui";
import { LotusSeal } from "./LotusSeal";

/** Me → the "Your own avatar" slot, sealed by the member's lotus. Signed-in, age-checked members only. */
export function LotusSlot() {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const { member, remote, unavailable } = useLotus();
  if (!member || unavailable) return null;
  const state = remote.data, tier = state?.tier ?? null;
  const breed = state?.breed, name = tier ? TIER_NAMES[tier] : "";
  const status = !state ? (remote.error ? "Your lotus did not load." : " ") : !tier ? "Tap to bloom your lotus"
    : breed?.status === "breeding" ? "Breeding your avatar…" : state.breeds?.available ? "Your breed is ready"
    : breed?.status === "bred" ? `Your ${name} Lotus avatar` : `Your ${name} Lotus is waiting`;
  return <Card style={[s.card, { borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable testID="lotus-slot" accessibilityRole="button" accessibilityLabel={"Your own avatar. " + status} disabled={!state}
      onPress={() => router.push("/lotus")} {...focusProps} style={({ pressed }) => [s.press, { opacity: pressed ? 0.8 : 1 }]}>
      <LotusSeal tier={tier} height={150} />
      <View style={common.spread}>
        <View style={common.flex}>
          <T variant="subtitle">Your own avatar</T>
          <T variant="small" muted accessibilityLiveRegion="polite">{status}</T>
        </View>
        {!!state && <Icon name="chevron-forward" size={20} color={theme.mutedForeground} />}
      </View>
    </Pressable>
    {!state && !!remote.error && <Button label="Retry" variant="link" onPress={remote.refresh} />}
  </Card>;
}
const s = StyleSheet.create({ card: { padding: 12 }, press: { gap: 10 } });
