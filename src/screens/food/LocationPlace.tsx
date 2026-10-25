import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, Icon, T, common } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { Confirm } from "../../components/Actions";
import { FieldLabel, ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { LocationSearchField } from "../../components/discovery/LocationSearchField";
import { findPlace, placeTitle, usePrivatePlaceEditor, type PlaceTarget } from "../../hooks/usePrivatePlaceEditor";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import type { PrivatePlaceKind } from "../../types/food";
import { goBack } from "../../utils/navigation";
import { AreaParticipationRow } from "../../components/areas/AreaParticipationRow";
import { useT } from "../../i18n";

function usePlaceNames() {
  const t = useT("explore");
  return { t, names: { home: t("home"), work: t("work") } };
}

export function LocationPlaceScreen() {
  const { owner, ready, doc } = useFood(), { theme } = usePreferences(), params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const kind: PrivatePlaceKind = params.kind === "home" || params.kind === "work" ? params.kind : "custom";
  const target: PlaceTarget = { id: params.id, kind }, place = findPlace(doc.privatePlaces, target), { t, names } = usePlaceNames();
  return <Screen title={placeTitle(kind, place?.label, names) || t("newPlace")} backTo="/private-places">
    {!ready ? <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingPlace")} />
      : params.id && !place ? <EmptyState title={t("placeUnavailable")} text="" icon="location-outline" />
      : <PlaceEditor key={owner + (params.id ?? kind)} target={target} />}
  </Screen>;
}
function SaveState({ editor }: { editor: ReturnType<typeof usePrivatePlaceEditor> }) {
  const { theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  if (editor.error) return <View style={[common.row, { gap: 6 }]} accessibilityLiveRegion="polite">
    <T variant="small" color={theme.error} style={common.flex}>{editor.error}</T><Button label={tc("retry")} variant="link" onPress={editor.retry} /></View>;
  if (editor.busy) return <T variant="small" muted accessibilityLiveRegion="polite">{t("saving")}</T>;
  if (editor.address && !editor.point) return <T variant="small" muted>{t("chooseFromList")}</T>;
  if (editor.kind === "custom" && editor.point && !editor.label.trim()) return <T variant="small" muted>{t("addNameToSave")}</T>;
  if (!editor.saved) return null;
  return <View style={[common.row, { gap: 6 }]} accessibilityLiveRegion="polite"><Icon name="checkmark-circle" size={16} color={theme.success} /><T variant="small" muted>{t("savedChanges")}</T></View>;
}
function PlaceEditor({ target }: { target: PlaceTarget }) {
  const editor = usePrivatePlaceEditor(target), saved = editor.saved, { t, names } = usePlaceNames(), tc = useT("common");
  const savedName = saved ? placeTitle(editor.kind, saved.label, names) : "";
  return <>
    {editor.kind === "custom" && <Field label={t("name")} value={editor.label} maxLength={40} editable={editor.readable} placeholder={t("namePlaceholder")} onChangeText={editor.setLabel} />}
    <View style={{ gap: 6, zIndex: 50 }}><FieldLabel>{t("address")}</FieldLabel>
      <LocationSearchField value={editor.address} onChange={editor.changeAddress} onChoose={editor.choose} addressesOnly suggestionsInFlow
        disabled={!editor.readable} placeholder={t("addressPlaceholder")} /></View>
    <Field label={t("unitOptional")} value={editor.details} maxLength={100} editable={editor.readable} placeholder="#05-12" onChangeText={editor.setDetails} />
    {/* One fixed line, so switching between Saving, Saved, a hint and nothing never moves the switch below. */}
    <View style={{ minHeight: 24, justifyContent: "center" }}><SaveState editor={editor} /></View>
    {saved && <ListGroup><ListItem title={t("defaultLocation")} leading={<RowIcon name="navigate-outline" />}
      trailing={<ThemedSwitch label={t("defaultLocationSwitch")} value={saved.isDefault} disabled={saved.isDefault || editor.busy} onChange={on => { if (on) void editor.makeDefault(); }} />} /></ListGroup>}
    {saved && (editor.kind === "home" || editor.kind === "work") && <AreaParticipationRow layer={editor.kind} point={saved.point} />}
    <Button label={tc("done")} onPress={() => goBack("/private-places")} />
    {saved && <View style={{ alignItems: "center" }}><Confirm link label={t("removeName", { name: savedName })} action={tc("remove")} text={t("removeQuestion", { name: savedName })}
      run={async () => { const okay = await editor.remove(); if (okay) goBack("/private-places"); return okay; }} /></View>}
  </>;
}
