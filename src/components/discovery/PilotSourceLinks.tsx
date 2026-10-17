import * as Linking from "expo-linking";
import { View } from "react-native";
import { Button, T, common } from "../ui";
import { usePreferences } from "../../state/Preferences";
import { pilotCheckedDate } from "../../utils/pilot-evidence";
import type { PilotSource } from "../../types/pilot-catalogue";

export function PilotSourceLinks({ sources }: { sources: PilotSource[] }) {
  const { setNotice } = usePreferences();
  const open = async (url: string) => {
    try { await Linking.openURL(url); }
    catch { setNotice({ text: "Source could not open. Try again.", error: true }); }
  };
  return <View style={common.stack}>{sources.map(source => <View key={source.id} style={{ gap: 6 }}>
    <T style={common.bold}>{source.title}</T>
    <T variant="caption" muted>{source.publisher} · {source.kind.replaceAll("-", " ")}</T>
    <T variant="caption" muted>Checked {pilotCheckedDate(source.checkedAt)} · {source.publishedAt ? "Published " + source.publishedAt : "Publication date unknown"}</T>
    {!!source.notes && <T variant="small" muted>{source.notes}</T>}
    <Button label="Open Source" accessibilityLabel={"Open source: " + source.title} variant="secondary" icon="open-outline" onPress={() => void open(source.url)} />
  </View>)}</View>;
}
