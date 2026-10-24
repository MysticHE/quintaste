import { useState } from "react";
import { Linking, View } from "react-native";
import { Chip } from "../food/Controls";
import { Button, Card, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

/** The consent sheet for a breed (AVATAR_LOTUS_PLAN §2 step 7, §5 step 7): it names the processor and what happens to the selfie. */
export function BreedConsent({ agreed, onChange, disabled }: { agreed: boolean; onChange(): void; disabled: boolean }) {
  const { theme } = usePreferences(), [details, setDetails] = useState(false), [linkError, setLinkError] = useState(false), t = useT("game");
  return <Card style={common.stack}>
    <T variant="small">{t("lotusConsentProcessor")}</T>
    <Chip label={t("lotusConsentChip")} role="checkbox" selected={agreed} onPress={onChange} disabled={disabled} />
    <Button label={details ? t("lotusHidePrivacy") : t("lotusPhotoPrivacy")} variant="link" onPress={() => setDetails(v => !v)} />
    {details && <View style={common.stack}>
      <T variant="small">{t("lotusPrivacyUse")}</T>
      <T variant="small">{t("lotusPrivacyKeep")}</T>
      <Button label={t("lotusOpenAiPolicy")} variant="link" onPress={() => { void Linking.openURL("https://developers.openai.com/api/docs/guides/your-data").catch(() => setLinkError(true)); }} />
      {linkError && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{t("lotusPolicyFailed")}</T>}
    </View>}
  </Card>;
}
