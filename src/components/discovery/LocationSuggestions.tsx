import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import type { LocationSuggestion } from "../../types/location-search";
import { SuggestionList } from "./SuggestionList";
import { Icon, T, common } from "../ui";
import { useT } from "../../i18n";

type Props = { id: string; suggestions: LocationSuggestion[]; busy: boolean; error: string; index: number;
  choose: (item: LocationSuggestion) => void; keepOpen: () => void; retry: () => void; inFlow?: boolean };
export function LocationSuggestions({ id, suggestions, busy, error, index, choose, keepOpen, retry, inFlow = false }: Props) {
  const { theme } = usePreferences(), [hover, setHover] = useState(-1), t = useT("explore"), tc = useT("common");
  const scroll = useRef<ScrollView>(null), rows = useRef(new Map<string, number>());
  useEffect(() => {
    const selected = suggestions[index], y = selected ? rows.current.get(selected.id) : undefined;
    if (y !== undefined) scroll.current?.scrollTo({ y, animated: false });
  }, [index, suggestions]);
  return <View testID="location-suggestions" style={[s.panel, !inFlow && s.dropdown,
    { backgroundColor: theme.card, borderColor: theme.border }]}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled"
      nestedScrollEnabled style={s.scroll} showsVerticalScrollIndicator={false}>
      {busy && <View style={s.status}><ActivityIndicator size="small" color={theme.accent} accessibilityLabel={t("findingLocations")} />
        <T variant="small" muted accessibilityLiveRegion="polite">{t("findingLocationsNow")}</T></View>}
      <SuggestionList id={id} label={t("matchingLocations")}>{suggestions.map((item, position) => <Pressable key={item.id} nativeID={id + "-" + position} role="option"
        accessibilityLabel={item.name + " " + item.address} accessibilityState={{ selected: position === index }}
        {...(Platform.OS === "web" ? { "aria-selected": position === index } : {})}
        onLayout={event => {
          const y = event.nativeEvent.layout.y; rows.current.set(item.id, y);
          if (position === index) scroll.current?.scrollTo({ y, animated: false });
        }}
        onPressIn={keepOpen} onPress={() => choose(item)}
        onHoverIn={() => setHover(position)} onHoverOut={() => setHover(-1)}
        onFocus={() => { keepOpen(); setHover(position); }} onBlur={() => setHover(-1)}
        style={({ pressed }) => [s.option, { backgroundColor: pressed || position === hover || position === index
          ? theme.accentSoft : theme.card }]}>
        <Icon name={item.kind === "area" ? "map-outline" : "location-outline"} size={18} />
        <View style={common.flex}><T variant="small" style={common.bold}>{item.name}{" "}</T>
          <T variant="caption" muted>{item.address}</T></View>
      </Pressable>)}</SuggestionList>
      {!busy && !suggestions.length && !error && <T variant="small" muted style={s.status} accessibilityLiveRegion="polite">
        {t("noMatchingLocations")}</T>}
      {!!error && <View style={s.feedback}><T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={t("retryLocationSuggestions")} onPressIn={keepOpen} onPress={retry}
          style={s.retry}><T variant="small" color={theme.accent} style={common.bold}>{tc("retry")}</T></Pressable></View>}
    </ScrollView>
    {suggestions.some(item => item.kind === "address") && <T variant="caption" muted style={s.source}>{t("addressesSource")}</T>}
  </View>;
}
const s = StyleSheet.create({
  panel: { marginTop: 6, borderWidth: 1, borderRadius: 16, paddingVertical: 4, overflow: "hidden", zIndex: 50 },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0 },
  scroll: { maxHeight: 260 }, option: { minHeight: 56, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  status: { padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  feedback: { paddingHorizontal: 12, paddingTop: 8 }, retry: { minHeight: 48, justifyContent: "center" },
  source: { paddingHorizontal: 12, paddingVertical: 8 },
});
