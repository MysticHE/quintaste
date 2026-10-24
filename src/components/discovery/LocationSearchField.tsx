import { useId, useRef, useState, type ReactNode } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { fontNames } from "../../theme/tokens";
import type { LocationSuggestion } from "../../types/location-search";
import { locationQuery } from "../../utils/location-search";
import { useLocationSearchControl } from "../../hooks/useLocationSearchControl";
import { Icon } from "../ui";
import { LocationSuggestions } from "./LocationSuggestions";
import { useT } from "../../i18n";

export function LocationSearchField({ value, onChange, onChoose, onSearch, addressesOnly = false, disabled = false,
  suggestionsInFlow = false, placeholder, trailing }: {
  value: string; onChange: (value: string) => void; onChoose: (item: LocationSuggestion) => void; onSearch?: (query: string) => void;
  addressesOnly?: boolean; placeholder?: string; disabled?: boolean; suggestionsInFlow?: boolean; trailing?: ReactNode;
}) {
  const { theme, textMultiplier } = usePreferences(), [focused, setFocused] = useState(false), t = useT("explore");
  const input = useRef<TextInput>(null), id = "location-" + useId();
  const dismiss = () => { input.current?.blur(); Keyboard.dismiss(); };
  const choose = (item: LocationSuggestion) => { if (!disabled) { onChoose(item); dismiss(); } };
  const control = useLocationSearchControl(value, choose, onSearch ? query => { onSearch(query); dismiss(); } : undefined, addressesOnly);
  const expanded = !disabled && control.open && (!!locationQuery(value) || !!control.error);
  return <View style={s.root}>
    <View testID="discovery-search" style={[s.field, { backgroundColor: theme.card, borderColor: focused ? theme.accent : theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("searchThisPlace")} disabled={disabled} accessibilityState={{ disabled }} onPress={() => void control.submit()}
        hitSlop={searchSlop} style={s.search}><Icon name="search-outline" /></Pressable>
      <TextInput ref={input} editable={!disabled} value={value} onChangeText={next => { control.changed(); onChange(next); }}
        placeholder={placeholder ?? t("placeOrPostal")} accessibilityLabel={t(addressesOnly ? "privateAddressA11y" : "searchByA11y")} role="combobox"
        aria-expanded={expanded} accessibilityState={{ expanded, busy: control.busy }}
        {...(Platform.OS === "web" ? { "aria-controls": id, "aria-activedescendant": expanded && control.suggestions[control.index] ? id + "-" + control.index : undefined } : {})}
        onFocus={() => { setFocused(true); control.focus(); }} onBlur={() => { setFocused(false); control.blur(); }}
        onKeyPress={event => { if (control.key(event.nativeEvent.key)) event.preventDefault(); }}
        underlineColorAndroid={theme.transparent} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
        onSubmitEditing={() => void control.submit()} maxLength={100}
        placeholderTextColor={theme.mutedForeground} selectionColor={theme.accent}
        style={[s.input, { color: theme.foreground, fontFamily: fontNames.regular, fontSize: 16 * textMultiplier }]} />
      {!!value && <Pressable accessibilityRole="button" accessibilityLabel={t("clearLocationSearch")} disabled={disabled} accessibilityState={{ disabled }}
        onPress={() => { control.changed(); onChange(""); onSearch?.(""); input.current?.focus(); }}
        style={s.action}><Icon name="close-circle-outline" /></Pressable>}
      {trailing}
    </View>
    {expanded && <LocationSuggestions id={id} suggestions={control.suggestions} busy={control.busy} inFlow={suggestionsInFlow}
      error={control.error} index={control.index} choose={control.choose} keepOpen={control.keepOpen} retry={control.retry} />}
  </View>;
}
/** Keeps the search icon a 48-point tap target without padding the box. */
const searchSlop = { left: 10, right: 8, top: 12, bottom: 12 };
const s = StyleSheet.create({
  root: { position: "relative", zIndex: 50 },
  // Same box as the shared SearchField on Cook, Social and Market.
  field: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingLeft: 10, minHeight: 48 },
  search: { alignItems: "center", justifyContent: "center" },
  action: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  input: { outlineStyle: "solid", outlineWidth: 0, flex: 1, minWidth: 0, paddingVertical: 10, paddingRight: 4 },
});
