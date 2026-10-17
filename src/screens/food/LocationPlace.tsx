import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, Icon, T, common } from "../../components/ui";
import { EmptyState } from "../../components/food/Controls";
import { Confirm } from "../../components/Actions";
import { FieldLabel, ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { LocationSearchField } from "../../components/discovery/LocationSearchField";
import { findPlace, placeKindName, usePrivatePlaceEditor, type PlaceTarget } from "../../hooks/usePrivatePlaceEditor";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import type { PrivatePlaceKind } from "../../types/food";
import { goBack } from "../../utils/navigation";
import { AreaParticipationRow } from "../../components/areas/AreaParticipationRow";

export function LocationPlaceScreen() {
  const { owner, ready, doc } = useFood(), { theme } = usePreferences(), params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const kind: PrivatePlaceKind = params.kind === "home" || params.kind === "work" ? params.kind : "custom";
  const target: PlaceTarget = { id: params.id, kind }, place = findPlace(doc.privatePlaces, target);
  return <Screen title={place?.label || placeKindName(kind) || "New Place"} backTo="/private-places">
    {!ready ? <ActivityIndicator color={theme.accent} accessibilityLabel="Loading place" />
      : params.id && !place ? <EmptyState title="Place Unavailable" text="" icon="location-outline" />
      : <PlaceEditor key={owner + (params.id ?? kind)} target={target} />}
  </Screen>;
}
function SaveState({ editor }: { editor: ReturnType<typeof usePrivatePlaceEditor> }) {
  const { theme } = usePreferences();
  if (editor.error) return <View style={[common.row, { gap: 6 }]} accessibilityLiveRegion="polite">
    <T variant="small" color={theme.error} style={common.flex}>{editor.error}</T><Button label="Retry" variant="link" onPress={editor.retry} /></View>;
  if (editor.busy) return <T variant="small" muted accessibilityLiveRegion="polite">Saving…</T>;
  if (editor.address && !editor.point) return <T variant="small" muted>Choose an address from the list</T>;
  if (editor.kind === "custom" && editor.point && !editor.label.trim()) return <T variant="small" muted>Add a name to save</T>;
  if (!editor.saved) return null;
  return <View style={[common.row, { gap: 6 }]} accessibilityLiveRegion="polite"><Icon name="checkmark-circle" size={16} color={theme.success} /><T variant="small" muted>Saved</T></View>;
}
function PlaceEditor({ target }: { target: PlaceTarget }) {
  const editor = usePrivatePlaceEditor(target), saved = editor.saved;
  return <>
    {editor.kind === "custom" && <Field label="Name" value={editor.label} maxLength={40} editable={editor.readable} placeholder="Gym, family home" onChangeText={editor.setLabel} />}
    <View style={{ gap: 6, zIndex: 50 }}><FieldLabel>Address</FieldLabel>
      <LocationSearchField value={editor.address} onChange={editor.changeAddress} onChoose={editor.choose} addressesOnly suggestionsInFlow
        disabled={!editor.readable} placeholder="Address or postal code" /></View>
    <Field label="Unit (Optional)" value={editor.details} maxLength={100} editable={editor.readable} placeholder="#05-12" onChangeText={editor.setDetails} />
    <SaveState editor={editor} />
    {saved && <ListGroup><ListItem title="Default Location" leading={<RowIcon name="navigate-outline" />}
      trailing={<ThemedSwitch label="Default location" value={saved.isDefault} disabled={saved.isDefault || editor.busy} onChange={on => { if (on) void editor.makeDefault(); }} />} /></ListGroup>}
    {saved && (editor.kind === "home" || editor.kind === "work") && <AreaParticipationRow layer={editor.kind} point={saved.point} />}
    <Button label="Done" onPress={() => goBack("/private-places")} />
    {saved && <View style={{ alignItems: "center" }}><Confirm link label={"Remove " + saved.label} action="Remove" text={"Remove " + saved.label + "?"}
      run={async () => { const okay = await editor.remove(); if (okay) goBack("/private-places"); return okay; }} /></View>}
  </>;
}
