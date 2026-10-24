import { useId, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { usePreferences } from "../../state/Preferences";
import { SearchField } from "../food/Controls";
import { FilterButton, type BrowseFilter } from "../BrowseControls";
import { SuggestionList } from "../discovery/SuggestionList";
import { Icon, T, common, type IconName } from "../ui";
import type { SearchSuggestion } from "../../services/cook-search";
import { useRecentSearches, useRecipeSuggestions } from "../../hooks/useRecipeSearch";
import { useSuggestionKeys } from "../../hooks/useSuggestionKeys";
import { useLanguage, useT } from "../../i18n";
import { categoryName } from "../../utils/recipe-browse";

type Row = { key: string; icon: IconName; text: string; aside?: string; label: string; run: () => void };
type Props = {
  query: string; onChange: (value: string) => void; placeholder: string; filter?: BrowseFilter;
  onRecipe: (id: string) => void; onCategory: (category: string) => void; onAi: (dish: string) => void;
};

/**
 * Cook's search box with a suggestion list under it: recent searches while empty, then recipes, searches and categories
 * from the recipes we have, and "Get … as an AI recipe" when nothing matches. The list sits in the page flow (not floating), so
 * every row stays tappable on Android. Returns the box and the list for BrowseHeader's `field` and `below`.
 */
export function useRecipeSearchBox({ query, onChange, placeholder, filter, onRecipe, onCategory, onAi }: Props): { field: ReactNode; below: ReactNode; remember: (term: string) => void } {
  const { theme } = usePreferences(), id = "recipe-search-" + useId(), t = useT("cook"), tc = useT("common"), language = useLanguage();
  const [hover, setHover] = useState(-1), nav = useSuggestionKeys(), { open, setOpen, index, setIndex, keepOpen } = nav;
  const recent = useRecentSearches(), suggestions = useRecipeSuggestions(query, open), typed = query.trim();
  const close = () => { setOpen(false); setIndex(-1); };
  const pick = (item: SearchSuggestion) => {
    close();
    if (item.kind === "recipe") { recent.remember(typed || item.text); onRecipe(item.recipeId); }
    else if (item.kind === "category") { onChange(""); onCategory(item.text); }
    else { recent.remember(item.text); onChange(item.text); }
  };
  const rows: Row[] = typed.length < 2
    ? recent.items.map(text => ({ key: "recent:" + text, icon: "time-outline", text, label: t("searchTerm", { text }), run: () => { close(); onChange(text); } }))
    : [...suggestions.items.map((item): Row => {
        const text = item.kind === "category" ? categoryName(item.text, language) : item.text;
        return { key: item.kind + ":" + (item.kind === "recipe" ? item.recipeId : item.text), text,
          icon: item.kind === "recipe" ? "restaurant-outline" : item.kind === "category" ? "grid-outline" : "search-outline",
          aside: item.kind === "recipe" && item.minutes ? tc("minutes", { n: item.minutes }) : undefined,
          label: t(item.kind === "recipe" ? "openRecipeNamed" : item.kind === "category" ? "browseCategory" : "searchTerm", { text }), run: () => pick(item) };
      }),
      // Only when nothing matched at all: a category or ingredient match ("noodl", "tofu") means recipes exist.
      ...(!suggestions.busy && suggestions.settled && !suggestions.items.length
        ? [{ key: "ai", icon: "sparkles-outline" as IconName, text: t("getAsAi", { text: typed.slice(0, 40) }), label: t("getAsAiSpoken", { text: typed }), run: () => { close(); onAi(typed); } }] : [])];
  const expanded = open && (rows.length > 0 || suggestions.busy);
  const field = <SearchField value={query} placeholder={placeholder}
    onChange={value => { setIndex(-1); setOpen(true); onChange(value); }}
    onSubmit={() => { if (rows[index]) rows[index].run(); else { recent.remember(typed); close(); } }}
    trailing={filter ? <FilterButton {...filter} /> : undefined}
    input={{ role: "combobox", "aria-expanded": expanded, accessibilityState: { expanded },
      ...(Platform.OS === "web" ? { "aria-controls": id, "aria-activedescendant": expanded && rows[index] ? id + "-" + index : undefined } : {}),
      onFocus: nav.focus, onBlur: nav.blur,
      onKeyPress: event => { if (nav.key(event.nativeEvent.key, rows.length)) event.preventDefault(); } }} />;
  const below = expanded ? <View testID="recipe-suggestions" style={[s.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
    {typed.length < 2 && <View style={[common.spread, s.heading]}><T variant="small" muted>{t("recent")}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={t("clearRecent")} onPressIn={keepOpen} onPress={() => { recent.clear(); close(); }} style={s.clear}>
        <T variant="small" color={theme.accent} style={common.bold}>{tc("clear")}</T></Pressable></View>}
    <SuggestionList id={id} label={t("recipeSuggestions")}>{rows.map((row, position) => <Pressable key={row.key} nativeID={id + "-" + position} role="option"
      accessibilityLabel={row.label} accessibilityState={{ selected: position === index }} {...(Platform.OS === "web" ? { "aria-selected": position === index } : {})}
      onPressIn={keepOpen} onPress={row.run} onHoverIn={() => setHover(position)} onHoverOut={() => setHover(-1)}
      style={({ pressed }) => [s.option, { backgroundColor: pressed || position === hover || position === index ? theme.accentSoft : theme.card }]}>
      <Icon name={row.icon} size={18} color={row.key === "ai" ? theme.accent : undefined} />
      <T variant="small" style={[common.flex, row.key === "ai" && common.bold]} numberOfLines={1}>{row.text}</T>
      {!!row.aside && <T variant="caption" muted>{row.aside}</T>}
    </Pressable>)}</SuggestionList>
    {suggestions.busy && !rows.length && <View style={s.status}><ActivityIndicator size="small" color={theme.accent} accessibilityLabel={t("findingRecipes")} /></View>}
  </View> : null;
  return { field, below, remember: recent.remember };
}
const s = StyleSheet.create({
  panel: { marginTop: 6, borderWidth: 1, borderRadius: 16, paddingVertical: 4, overflow: "hidden" },
  heading: { paddingLeft: 12, paddingRight: 4 }, clear: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  option: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  status: { padding: 12, alignItems: "center" },
});
