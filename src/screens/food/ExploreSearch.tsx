import { router } from "expo-router";
import { useId, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { Chip, Chips, IconButton, SearchField } from "../../components/food/Controls";
import { FilterSection } from "../../components/BrowseControls";
import { ThemedSwitch } from "../../components/GroupedList";
import { DiscoveryFilterOptions } from "../../components/discovery/DiscoveryFilterOptions";
import { LocationSuggestions } from "../../components/discovery/LocationSuggestions";
import { useFood } from "../../state/Food";
import { useDiscovery } from "../../state/Discovery";
import { usePreferences } from "../../state/Preferences";
import { useDiscoveryInput } from "../../hooks/useDiscoveryInput";
import { useLocationSearchControl } from "../../hooks/useLocationSearchControl";
import { useRecentPlaceSearches } from "../../hooks/useRecentPlaceSearches";
import { useMinuteClock } from "../../components/food/Timers";
import { discoveryLabels, withLocationMode, type LocationMode } from "../../utils/discovery-filters";
import { privateOrigin } from "../../utils/private-places";
import { locationQuery } from "../../utils/location-search";
import { discoveryRadii } from "../../config/discovery";
import { goBack } from "../../utils/navigation";
import { useT } from "../../i18n";

export function ExploreSearchScreen() {
  const { filters, setFilters, doc, search, setSearch, discoveryQuery, readable } = useFood();
  const { radius, setRadius, selection, location } = useDiscovery();
  const { draft: preferences, theme } = usePreferences(), t = useT("explore"), tc = useT("common");
  const { choose, searchPlaces, privateKind, followingCustom } = useDiscoveryInput(useMinuteClock());
  const [value, setValue] = useState(search), [edited, setEdited] = useState(false);
  const recent = useRecentPlaceSearches();
  const id = "explore-search-" + useId();
  const finish = () => { Keyboard.dismiss(); goBack("/"); };
  const control = useLocationSearchControl(value, item => {
    recent.remember(item.name); choose(item); finish();
  }, query => { recent.remember(query); searchPlaces(query, true); finish(); });
  const expanded = control.open && (!!locationQuery(control.displayValue) || !!control.error);
  const submit = () => {
    if (!readable) return;
    // Applying only filters must not reinterpret the existing search and reset Home/Work/GPS.
    if (!edited) finish(); else void control.submit();
  };
  const selectLocation = (mode: LocationMode) => {
    if (edited) setValue(control.displayValue);
    control.changed();
    const text = mode === "selected" && selection ? selection.name : discoveryQuery;
    if (!edited) { setValue(text); setSearch(text); }
    void setFilters(current => withLocationMode(current, mode));
    if ((mode === "home" || mode === "work") && !privateOrigin(doc.privatePlaces, mode))
      router.push({ pathname: "/location-place", params: { kind: mode } });
  };
  return <Screen back={false} hideTimers header={<View testID="explore-search-toolbar" style={s.toolbar}>
    <IconButton appearance="plain" label={tc("goBack")} icon="arrow-back" onPress={finish} />
    <View style={s.input}><SearchField value={control.displayValue} placeholder={t("placeOrPostal")} onSubmit={submit}
      onChange={next => { control.changed(); setValue(next); setEdited(true); }}
      input={{ editable: readable, role: "combobox", "aria-expanded": expanded,
        accessibilityLabel: t("searchByA11y"), accessibilityState: { expanded, busy: control.busy },
        ...(Platform.OS === "web" ? { "aria-controls": id, "aria-activedescendant": expanded && control.suggestions[control.index] ? id + "-" + control.index : undefined } : {}),
        onFocus: control.focus, onBlur: control.blur,
        onKeyPress: event => { if (control.key(event.nativeEvent.key)) event.preventDefault(); } }} /></View>
    <Button label={t("submitPlaceSearch")} variant="link" disabled={!readable || control.busy} onPress={submit} />
  </View>}>
    {expanded ? <LocationSuggestions id={id} suggestions={control.suggestions} busy={control.busy} error={control.error}
      index={control.index} choose={control.choose} keepOpen={control.keepOpen} retry={control.retry} inFlow />
      : recent.items.length > 0 && <View accessibilityLabel={t("recentPlaceSearches")} testID="explore-recent-searches" style={[s.recent, { borderBottomColor: theme.divider }]}>
        {recent.items.map(item => <View key={item} style={common.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={item} disabled={!readable} style={s.history}
            onPress={() => { setEdited(true); void control.submit(item); }}>
            <Icon name="time-outline" /><T style={common.flex}>{item}</T>
          </Pressable>
          <IconButton appearance="plain" label={t("removeRecentPlaceSearch", { name: item })} icon="close-outline" onPress={() => recent.remove(item)} />
        </View>)}
      </View>}
    <DiscoveryFilterOptions filters={privateKind ? { ...filters, home: privateKind === "home", work: privateKind === "work", near: false } : filters}
      change={change => { void setFilters(change); }} labels={discoveryLabels(filters, preferences.diets)} disabled={!readable}
      selected={!!selection || !!location} followingCustom={followingCustom} selectLocation={selectLocation} searchLayout />
    <FilterSection prominent title={t("distance")} icon="navigate-outline">
      <Chips label={t("distance")}>{discoveryRadii.map(distance => <Chip key={distance} role="radio"
        label={tc("kilometres", { km: distance / 1000 })} selected={radius === distance} disabled={!readable}
        onPress={() => { void setRadius(distance); }} />)}</Chips>
    </FilterSection>
    <View style={[common.spread, { minHeight: 48 }]}>
      <T style={[common.bold, common.flex]}>{t("savedPlacesOnly")}</T>
      <ThemedSwitch label={t("savedPlacesOnly")} value={filters.savedOnly} disabled={!readable}
        onChange={savedOnly => { void setFilters({ savedOnly }); }} />
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: 4 },
  input: { flex: 1, minWidth: 0 },
  recent: { borderBottomWidth: 1, paddingBottom: 12, gap: 4 },
  history: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4 },
});
