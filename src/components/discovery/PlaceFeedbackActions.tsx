import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ensureMember, useMember } from "../CommunityGate";
import { ReportSheet } from "../ReportSheet";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { PlaceRow } from "./PlaceDetailParts";

/**
 * One "Report A Problem" row in every build, and "Run This Place?" for an owner to confirm it (staff decide). It files to the staff case queue (admin console > Cases) with a reason
 * (hours, location, menu, closed, not meat-free, other); signed-in members only.
 */
export function PlaceFeedbackActions({ name, menuId }: { name: string; menuId?: string }) {
  const member = useMember(), { setNotice } = usePreferences(), [open, setOpen] = useState(false), t = useT("explore"), tc = useT("common");
  if (!menuId) return null;
  return <View>
    <PlaceRow icon="flag-outline" text={t("reportProblem")} trailing="chevron-forward" accessibilityLabel={t("reportProblemWith", { name })}
      onPress={() => {
        // Without sign-in in this build the gate has nowhere to send a guest, so say so instead of doing nothing.
        if (!member.enabled) setNotice({ text: tc("unavailableInBuild"), error: true });
        else if (ensureMember(member, "/place/catalogue-" + menuId)) setOpen(true);
      }} />
    <ReportSheet kind="place" targetId={menuId} name={name} visible={open} onClose={() => setOpen(false)} />
    {member.enabled && <PlaceRow icon="storefront-outline" text={t("claimPlace")} trailing="chevron-forward"
      onPress={() => { if (ensureMember(member, "/claim-place/" + menuId)) router.push(("/claim-place/" + menuId) as never); }} />}
  </View>;
}
