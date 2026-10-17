import { useId, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import type { LocationSuggestion } from "../../types/location-search";
import { locationQuery } from "../../utils/location-search";
import { useLocationSearchControl } from "../../hooks/useLocationSearchControl";
import { Icon } from "../ui";
import { LocationSuggestions } from "./LocationSuggestions";

export function LocationSearchField({ value, onChange, onChoose, onSearch, addressesOnly = false, disabled = false,
  suggestionsInFlow = false, placeholder = "Place or postal code" }: {
  value: string; onChange: (value: string) => void; onChoose: (item: LocationSuggestion) => void; onSearch?: (query: string) => void;
  addressesOnly?: boolean; placeholder?: string; disabled?: boolean; suggestionsInFlow?: boolean;
}) {
  const { theme, textMultiplier } = usePreferences(), [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null), id = "location-" + useId();
  const dismiss = () => { input.current?.blur(); Keyboard.dismiss(); };
  const choose = (item: LocationSuggestion) => { if (!disabled) { onChoose(item); dismiss(); } };
  const control = useLocationSearchControl(value, choose, onSearch ? query => { onSearch(query); dismiss(); } : undefined, addressesOnly);
  const expanded = !disabled && control.open && (!!locationQuery(value) || !!control.error);
  return <View style={s.root}>
    <View testID="discovery-search" style={[s.field, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Search this place or postal code" disabled={disabled} accessibilityState={{ disabled }} onPress={() => void control.submit()}
        style={s.action}><Icon name="search-outline" /></Pressable>
      <TextInput ref={input} editable={!disabled} value={value} onChangeText={next => { control.changed(); onChange(next); }}
        placeholder={placeholder} accessibilityLabel={addressesOnly ? "Private address or postal code" : "Search by place name, address or postal code"} role="combobox"
        aria-expanded={expanded} accessibilityState={{ expanded, busy: control.busy }}
        {...(Platform.OS === "web" ? { "aria-controls": id, "aria-activedescendant": expanded && control.suggestions[control.index] ? id + "-" + control.index : undefined } : {})}
        onFocus={() => { setFocused(true); control.focus(); }} onBlur={() => { setFocused(false); control.blur(); }}
        onKeyPress={event => { if (control.key(event.nativeEvent.key)) event.preventDefault(); }}
        underlineColorAndroid={theme.transparent} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
        onSubmitEditing={() => void control.submit()} maxLength={100}
        placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent}
        style={[s.input, { color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier }]} />
      {!!value && <Pressable accessibilityRole="button" accessibilityLabel="Clear location search" disabled={disabled} accessibilityState={{ disabled }}
        onPress={() => { control.changed(); onChange(""); onSearch?.(""); input.current?.focus(); }}
        style={s.action}><Icon name="close-circle-outline" /></Pressable>}
    </View>
    {expanded && <LocationSuggestions id={id} suggestions={control.suggestions} busy={control.busy} inFlow={suggestionsInFlow}
      error={control.error} index={control.index} choose={control.choose} keepOpen={control.keepOpen} retry={control.retry} />}
  </View>;
}
const s = StyleSheet.create({
  root: { position: "relative", zIndex: 50 },
  field: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 18, minHeight: 54 },
  action: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  input: { outlineStyle: "solid", outlineWidth: 0, flex: 1, minWidth: 0, paddingVertical: 14, paddingRight: 4 },
});
