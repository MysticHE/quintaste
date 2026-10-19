import { useState } from "react";
import { Linking, View } from "react-native";
import { Chip } from "../food/Controls";
import { Button, Card, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";

/** The consent sheet for a breed (AVATAR_LOTUS_PLAN §2 step 7, §5 step 7): it names the processor and what happens to the selfie. */
export function BreedConsent({ agreed, onChange, disabled }: { agreed: boolean; onChange(): void; disabled: boolean }) {
  const { theme } = usePreferences(), [details, setDetails] = useState(false), [linkError, setLinkError] = useState(false);
  return <Card style={common.stack}>
    <T variant="small">OpenAI makes your Adult and Mini forms from this selfie. It is sent securely through Cloudflare.</T>
    <Chip label="I Consent To Use My Own Adult Photo" role="checkbox" selected={agreed} onPress={onChange} disabled={disabled} />
    <Button label={details ? "Hide Privacy Details" : "Photo Privacy & Usage"} variant="link" onPress={() => setDetails(v => !v)} />
    {details && <View style={common.stack}>
      <T variant="small">QuinTaste removes location data and encrypts your selfie on its server. It is used once, to make your Adult form, then deleted. OpenAI makes six images: an Adult and a Mini form, each with a blink and a talking frame.</T>
      <T variant="small">Both forms are saved encrypted in your account&apos;s avatar library until you delete them. Cloudflare logging and caching are off for these requests; OpenAI applies its own data-retention policy. Your photo and forms are never used for marketing.</T>
      <Button label="OpenAI Data Policy" variant="link" onPress={() => { void Linking.openURL("https://developers.openai.com/api/docs/guides/your-data").catch(() => setLinkError(true)); }} />
      {linkError && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">The policy could not be opened. Try again when connected.</T>}
    </View>}
  </Card>;
}
