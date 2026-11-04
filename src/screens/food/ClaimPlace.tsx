import { useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { Chip } from "../../components/food/Controls";
import { FieldLabel } from "../../components/GroupedList";
import { MemberGate } from "../../components/social/SocialState";
import { usePreferences } from "../../state/Preferences";
import { useAuth } from "../../state/Auth";
import { useRemote, invalidate } from "../../hooks/useRemote";
import { ApiError } from "../../services/community-api";
import { claimCode, sendClaim } from "../../services/explore-work-api";
import { contributionKey, contributionWords } from "../../config/explore-work";
import { useLanguage, useT } from "../../i18n";

type Role = "owner" | "manager" | "staff";
const roles: [Role, "claimOwner" | "claimManager" | "claimStaff"][] = [["owner", "claimOwner"], ["manager", "claimManager"], ["staff", "claimStaff"]];

/**
 * An owner, manager or staff member shows they run this place: they post their code on its own website or social page and paste
 * that page's link. Pandan opens it, the bridge confirms the code is there, and staff decide.
 */
export function ClaimPlaceScreen() {
  const t = useT("explore"), { id } = useLocalSearchParams<{ id: string }>();
  return <Screen title={t("claimPlace")}><MemberGate returnTo={"/claim-place/" + id}><ClaimForm placeId={String(id ?? "")} /></MemberGate></Screen>;
}
function ClaimForm({ placeId }: { placeId: string }) {
  const t = useT("explore"), words = contributionWords(useLanguage()), { theme, setNotice } = usePreferences(), { user } = useAuth();
  const code = useRemote(user?.id && placeId ? "explore-claim-code:" + user.id + ":" + placeId : null, signal => claimCode(placeId, signal));
  const [role, setRole] = useState<Role | "">(""), [pageUrl, setPageUrl] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const submission = useRef({ key: contributionKey(), input: "" });
  const send = async () => {
    if (!role) return;
    setBusy(true); setError("");
    try {
      const input = JSON.stringify({ role, pageUrl: pageUrl.trim() });
      if (submission.current.input && submission.current.input !== input) submission.current.key = contributionKey();
      submission.current.input = input;
      await sendClaim({ placeId, role, pageUrl: pageUrl.trim(), submissionKey: submission.current.key });
      invalidate("explore-contributions:"); setNotice({ text: words.claimSent }); router.replace("/explore-contributions");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : words.load); }
    finally { setBusy(false); }
  };
  if (code.error) return <View style={{ gap: 10 }}><T>{code.error instanceof ApiError ? code.error.message : words.load}</T><Button label={words.retry} onPress={code.refresh} /></View>;
  if (!code.data) return null;
  return <View style={{ gap: 14 }}>
    <T variant="subtitle" accessibilityRole="header">{[code.data.place.name, code.data.place.branch].filter(Boolean).join(" · ")}</T>
    <View style={{ gap: 6 }}><FieldLabel>{t("claimCode")}</FieldLabel>
      <T variant="subtitle" selectable style={common.bold} testID="claim-code">{code.data.code}</T>
      <T variant="caption" muted>{t("claimHow")}</T></View>
    <Field label={t("claimLink")} value={pageUrl} onChangeText={setPageUrl} maxLength={1000} editable={!busy} autoCapitalize="none" keyboardType="url" />
    <View style={{ gap: 6 }}><FieldLabel>{t("claimRole")}</FieldLabel>
      <View accessibilityRole="radiogroup" style={[common.row, { flexWrap: "wrap", gap: 6 }]}>
        {roles.map(([value, key]) => <Chip key={value} label={t(key)} role="radio" compact selected={role === value} disabled={busy} onPress={() => setRole(value)} />)}</View></View>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t("claimSend")} icon="send-outline" loading={busy} disabled={!role || !/^https:\/\/\S+\.\S+/.test(pageUrl.trim())} onPress={() => void send()} />
  </View>;
}
