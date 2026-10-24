import * as Linking from "expo-linking";
import { useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import type { LivePlace } from "../../types/discovery";
import { googlePlaceUrl } from "../../utils/place-directory";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { Button, Card, Icon, T, common, type IconName } from "../ui";
import { directionsUrl } from "../../utils/directions";
import { useT } from "../../i18n";


export function LivePlaceActions({ place }: { place: LivePlace }) {
  const { isSaved, toggleSave } = useFood(), { theme, setNotice } = usePreferences(), t = useT("explore"), tc = useT("common");
  const [sharing, setSharing] = useState(false), [busy, setBusy] = useState(false);
  const id = "google-" + place.placeId, saved = isSaved("place", id);
  const publicLink = googlePlaceUrl(place.placeId, place.name);
  const shareText = place.name + "\n" + place.address + "\n" + publicLink;
  const open = async (url: string) => { try { await Linking.openURL(url); } catch { setNotice({ text: t("actionFailed"), error: true }); } };
  const save = async () => { setBusy(true); try { await toggleSave("place", id); } finally { setBusy(false); } };
  const actions: { label: string; icon: IconName; disabled?: boolean; press: () => void }[] = [
    { label: tc(saved ? "saved" : "save"), icon: saved ? "bookmark" : "bookmark-outline", disabled: busy, press: () => void save() },
    { label: t("directions"), icon: "navigate-outline", press: () => void open(directionsUrl(place.latitude + "," + place.longitude, place.placeId)) },
    { label: tc("share"), icon: "share-outline", press: () => setSharing(!sharing) },
    { label: t("call"), icon: "call-outline", disabled: !place.phone, press: () => void open("tel:" + place.phone!.replace(/[^+\d]/g, "")) },
  ];
  const share = async () => { try { await Share.share({ message: shareText }); } catch { setNotice({ text: t("shareUnavailableBelow"), error: true }); } };
  return <View style={common.stack}><View style={s.actions}>{actions.map(action => <Pressable key={action.label}
    accessibilityRole="button" accessibilityLabel={action.label + " " + place.name} accessibilityState={{ disabled: !!action.disabled }}
    disabled={action.disabled} onPress={action.press} style={[s.action, { backgroundColor: theme.accentSoft, opacity: action.disabled ? 0.5 : 1 }]}>
    <Icon name={action.icon} size={20} color={theme.accent} /><T variant="small" color={theme.accent}>{action.label}</T>
  </Pressable>)}</View>
    {sharing && <Card style={common.stack}><T variant="subtitle">{t("shareThisPlace")}</T>
      <T selectable variant="small">{shareText}</T><Button label={t("openSystemShare")} variant="secondary" onPress={() => void share()} />
      <Button label={t("cancelShare")} variant="link" onPress={() => setSharing(false)} />
    </Card>}
  </View>;
}
const s = StyleSheet.create({ actions: { flexDirection: "row", gap: 6 }, action: { flex: 1, minWidth: 58, minHeight: 60, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6 } });
