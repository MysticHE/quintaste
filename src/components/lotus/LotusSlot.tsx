import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { LOTUS_TIER_KEYS } from "../../screens/game/home/bits";
import { useT } from "../../i18n";
import { useKeyboardFocus } from "../../hooks/useKeyboardFocus";
import { useLotus } from "../../hooks/useLotus";
import { usePreferences } from "../../state/Preferences";
import { Button, Card, Icon, T, common } from "../ui";
import { LotusSeal } from "./LotusSeal";

/** Me → the "Your own avatar" slot, sealed by the member's lotus. Signed-in, age-checked members only. */
export function LotusSlot() {
  const { theme } = usePreferences(), { focused, focusProps } = useKeyboardFocus();
  const { member, remote, unavailable } = useLotus(), t = useT("game"), tc = useT("common");
  if (!member || unavailable) return null;
  const state = remote.data, tier = state?.tier ?? null;
  const breed = state?.breed, name = tier ? t(LOTUS_TIER_KEYS[tier]) : "";
  const status = !state ? (remote.error ? t("lotusLoadFailed") : " ") : !tier ? t("lotusTapToBloom")
    : breed?.status === "breeding" ? t("lotusSlotBreeding") : state.breeds?.available ? t("lotusBreedReady")
    : breed?.status === "bred" ? t("lotusSlotAvatar", { tier: name }) : t("lotusWaiting", { tier: name });
  return <Card style={[s.card, { borderColor: focused ? theme.accent : theme.border }]}>
    <Pressable testID="lotus-slot" accessibilityRole="button" accessibilityLabel={t("lotusOwnAvatarA11y", { status })} disabled={!state}
      onPress={() => router.push("/lotus")} {...focusProps} style={({ pressed }) => [s.press, { opacity: pressed ? 0.8 : 1 }]}>
      <LotusSeal tier={tier} height={150} />
      <View style={common.spread}>
        <View style={common.flex}>
          <T variant="subtitle">{t("lotusOwnAvatar")}</T>
          <T variant="small" muted accessibilityLiveRegion="polite">{status}</T>
        </View>
        {!!state && <Icon name="chevron-forward" size={20} color={theme.mutedForeground} />}
      </View>
    </Pressable>
    {!state && !!remote.error && <Button label={tc("retry")} variant="link" onPress={remote.refresh} />}
  </Card>;
}
const s = StyleSheet.create({ card: { padding: 12 }, press: { gap: 10 } });
