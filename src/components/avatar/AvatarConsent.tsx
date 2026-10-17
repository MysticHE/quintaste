import { useState } from "react";
import { Linking, View } from "react-native";
import { Card, T, Button, common } from "../ui";
import { Chip } from "../food/Controls";
export function AvatarConsent({ agreed, onChange, disabled }: { agreed: boolean; onChange: () => void; disabled: boolean }) {
  const [linkError, setLinkError] = useState(false);
  const [details, setDetails] = useState(false);
  return <Card style={common.stack}>
    <T variant="small">OpenAI creates your avatar from this photo, sent securely through Cloudflare.</T>
    <Chip label="I Consent To Use My Own Adult Photo" role="checkbox" selected={agreed} onPress={onChange} disabled={disabled} />
    <Button label={details ? 'Hide Privacy Details' : 'Photo Privacy & Usage'} variant="link" onPress={() => setDetails(value => !value)} />
    {details && <View style={{ gap: 8 }}>
    <T variant="small">Your photo is sent through Cloudflare to OpenAI to make one portrait and three expression frames. QuinTaste removes location metadata and temporarily encrypts the photo and preview on its server. The source photo is removed after the first frame; unsaved server previews expire within 15 minutes. Saving keeps only the generated portrait frames, encrypted in your account library until you delete them. Cloudflare request logging and caching are disabled for these requests. OpenAI applies its own data-retention policy.</T>
    <T variant="small">Generation uses the QuinTaste paid API allowance. A new attempt uses more allowance. Saving and animating the result does not call AI.</T>
    <Button label="OpenAI Data Policy" variant="link" onPress={() => { void Linking.openURL("https://developers.openai.com/api/docs/guides/your-data").catch(() => setLinkError(true)); }} />
    {linkError && <T accessibilityLiveRegion="polite">The policy could not be opened. Try again when connected.</T>}
    </View>}
  </Card>;
}
