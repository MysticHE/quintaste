import { useState } from "react";
import { Linking, View } from "react-native";
import { Card, T, Button, common } from "../ui";
import { Chip } from "../food/Controls";
import { useT } from "../../i18n";
export function AvatarConsent({ agreed, onChange, disabled }: { agreed: boolean; onChange: () => void; disabled: boolean }) {
  const [linkError, setLinkError] = useState(false);
  const [details, setDetails] = useState(false), t = useT("me");
  return <Card style={common.stack}>
    <T variant="small">{t("consentIntro")}</T>
    <Chip label={t("consentChip")} role="checkbox" selected={agreed} onPress={onChange} disabled={disabled} />
    <Button label={details ? t("hidePrivacy") : t("photoPrivacy")} variant="link" onPress={() => setDetails(value => !value)} />
    {details && <View style={{ gap: 8 }}>
    <T variant="small">{t("privacyDetail")}</T>
    <T variant="small">{t("allowanceDetail")}</T>
    <Button label={t("openAiPolicy")} variant="link" onPress={() => { void Linking.openURL("https://developers.openai.com/api/docs/guides/your-data").catch(() => setLinkError(true)); }} />
    {linkError && <T accessibilityLiveRegion="polite">{t("policyOpenFailed")}</T>}
    </View>}
  </Card>;
}
