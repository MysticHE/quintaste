import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { EmptyState } from "./food/Controls";
import { Icon, T, common, type IconName } from "./ui";
import { useAuth } from "../state/Auth";
import { usePreferences } from "../state/Preferences";
import type { Remote } from "../hooks/useRemote";
import { goBack } from "../utils/navigation";
import { useT } from "../i18n";

export type Member = { enabled: boolean; pending: boolean; signedIn: boolean; member: boolean; userId: string | null };
/** Community features need a signed-in account that passed the date-of-birth check. */
export function useMember(): Member {
  const { enabled, user, pending } = useAuth();
  return { enabled, pending, signedIn: !!user, member: !!user?.adultConfirmed, userId: user?.id ?? null };
}
/** Opens sign-in, or the age check for a signed-in account, then returns to `returnTo`. True when already a member. */
export function ensureMember(state: Member, returnTo: string) {
  if (state.member) return true;
  if (state.enabled) router.push({ pathname: state.signedIn ? "/account-eligibility" : "/login", params: { returnTo } });
  return false;
}
export function MemberPrompt({ icon, returnTo }: { icon: IconName; returnTo: string }) {
  const state = useMember(), t = useT("common");
  if (!state.enabled) return <EmptyState title={t("unavailableInBuild")} text="" icon={icon} />;
  return <EmptyState title={state.signedIn ? t("confirmYourAge") : t("signInToJoin")} text="" icon={icon}
    primary={{ label: state.signedIn ? t("completeAccountSetup") : t("signIn"), onPress: () => ensureMember(state, returnTo) }} />;
}
/**
 * Loading, paused-service, sign-in and error states for remote data. Renders nothing once data is shown,
 * except a one-line retry when a background refresh fails. `placeholder` replaces the spinner during the first load
 * (loading shapes the size of the content; null when the caller draws one shared placeholder itself).
 */
export function RemoteStatus({ remote, icon, returnTo, missing, placeholder }: { remote: Remote<unknown>; icon: IconName; returnTo: string; missing?: string; placeholder?: ReactNode }) {
  const { theme } = usePreferences(), { error, loading, refresh } = remote, t = useT("common");
  const message = error?.code === "LOAD_FAILED" ? t("loadFailed") : error?.message ?? "";
  if (remote.data !== undefined) return error && error.code !== "SIGN_IN" ? <Pressable accessibilityRole="button" accessibilityLabel={t("retryNamed", { message })} onPress={refresh}
    style={[common.row, { minHeight: 48, gap: 8, justifyContent: "center" }]}>
    <Icon name="refresh" size={18} color={theme.error} /><T variant="small" color={theme.error}>{message}</T>
  </Pressable> : null;
  if (!error) return !loading ? null : placeholder !== undefined ? placeholder
    : <View style={{ paddingVertical: 24 }}><ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingLabel")} /></View>;
  if (error.code === "SERVICE_PAUSED") return <EmptyState title={t("comingSoon")} text="" icon={icon} />;
  if (error.code === "UNAVAILABLE") return <EmptyState title={t("unavailableInBuild")} text="" icon={icon} />;
  if (error.code === "SIGN_IN") return <MemberPrompt icon={icon} returnTo={returnTo} />;
  if (error.status === 404) return <EmptyState title={missing ?? t("unavailable")} text="" icon={icon} action={t("goBackAction")} onPress={() => goBack()} />;
  return <EmptyState title={message} text="" icon="cloud-offline-outline" action={t("tryAgain")} onPress={refresh} />;
}
