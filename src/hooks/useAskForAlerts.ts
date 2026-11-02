import { useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { enablePush, pushState, pushSupport } from "../services/push";
import { useAuth } from "../state/Auth";
import { useLanguage, useT } from "../i18n";

/** Where the member is asked: each says what the alert will tell them. */
export type AlertAsk = "friend" | "dinner" | "order" | "shop" | "class" | "recipe";
const askedKey = (userId: string) => "@quintaste/push-asked/" + userId;
// After "Not now", the next moment that explains itself may ask again two weeks later.
const QUIET_MS = 14 * 86400000;

/**
 * Asks once, at a moment that explains itself (a friend request sent, an order placed, a dinner invite, a class joined, a
 * shop opened, a recipe sent), whether to turn on phone alerts; never while they are on, blocked in the phone's settings or
 * unsupported (the web, Expo Go). Settings › Phone alerts stays the place to change them. `after` runs once the member has
 * answered, or at once when nothing is asked (dinner reminders ask for the phone's permission there).
 */
export function useAskForAlerts() {
  const { user } = useAuth(), language = useLanguage(), t = useT("me"), userId = user?.id;
  return useCallback((reason: AlertAsk, after?: () => void) => {
    void (async () => {
      if (!userId || pushSupport() !== "ok" || (await pushState(userId)) !== "off") return after?.();
      const last = Number(await AsyncStorage.getItem(askedKey(userId)).catch(() => null)) || 0;
      if (Date.now() - last < QUIET_MS) return after?.();
      await AsyncStorage.setItem(askedKey(userId), String(Date.now())).catch(() => undefined);
      Alert.alert(t("pushAskTitle"), t(`pushAsk_${reason}`), [
        { text: t("pushAskLater"), style: "cancel" },
        { text: t("pushAskYes"), onPress: () => void enablePush(userId, language).catch(() => "failed").finally(() => after?.()) },
      ], { cancelable: true });
    })().catch(() => after?.());
  }, [userId, language, t]);
}
