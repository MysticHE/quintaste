import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton, SearchField } from "../../components/food/Controls";
import { RecipeFilters } from "../../components/feeds/RecipeFilters";
import { EventSearchFilters, MarketSearchFilters } from "../../components/feeds/SearchFilters";
import { useRecipeSearchBox } from "../../components/recipes/RecipeSearchBox";
import { useRecentPlaceSearches } from "../../hooks/useRecentPlaceSearches";
import { useFood } from "../../state/Food";
import { useFeeds, defaultEventFilters, type FeedTab } from "../../state/Feeds";
import { usePreferences } from "../../state/Preferences";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { defaultShopFilter } from "../../types/community";
import { goBack } from "../../utils/navigation";
import { useT } from "../../i18n";
import type { RecipeCategory } from "../../types/food";

export function FeedSearchScreen() {
  const { tab: param } = useLocalSearchParams<{ tab?: string }>();
  const tab: FeedTab = param === "events" || param === "market" ? param : "recipes";
  return <FeedSearch key={tab} tab={tab} />;
}
function FeedSearch({ tab }: { tab: FeedTab }) {
  const food = useFood(), feeds = useFeeds(), { theme, setNotice } = usePreferences(), t = useT("feeds"), tc = useT("common"), tr = useT("cook");
  const [query, setQuery] = useState(tab === "recipes" ? food.cookSearch : feeds.queries[tab]);
  const [recipes, setRecipes] = useState(food.cookBrowse), [events, setEvents] = useState(feeds.events), [market, setMarket] = useState(feeds.market);
  const [submitting, setSubmitting] = useState(false), inFlight = useRef(false), focusRevision = useRef(0), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useFocusEffect(useCallback(() => { focusRevision.current++; return () => { focusRevision.current++; }; }, []));
  const recent = useRecentPlaceSearches(tab === "recipes" ? "recipe" : "feed-" + tab, 5);
  const placeholder = t(tab === "recipes" ? "searchRecipes" : tab === "events" ? "searchEvents" : "searchMarket");
  const finish = () => { Keyboard.dismiss(); goBack({ pathname: "/cook", params: { tab } }); };
  const submit = async (value = query) => {
    if (inFlight.current || !food.readable) return;
    if ((tab === "events" && events.when === "date" && !events.date) || (tab === "market" && market.collection === "date" && !market.date)) {
      setNotice({ text: t("dateRequired"), error: true }); return;
    }
    inFlight.current = true; setSubmitting(true);
    const startedAt = focusRevision.current;
    try {
      if (tab === "recipes") {
        const saved = await food.setCookBrowse(recipes);
        // A system Back or account switch can leave this screen while storage is pending.
        if (!saved || !mounted.current || startedAt !== focusRevision.current) return;
        food.setCookSearch(value.trim());
      } else { feeds.setQueries(current => ({ ...current, [tab]: value.trim() })); if (tab === "events") feeds.setEvents(events); else feeds.setMarket(market); }
      recent.remember(value); finish();
    } finally { inFlight.current = false; if (mounted.current) setSubmitting(false); }
  };
  const box = useRecipeSearchBox({ query, onChange: setQuery, placeholder, recent, hideRecent: true, onSubmit: () => void submit(),
    onRecipe: id => router.push(("/cook/recipe/" + id) as never),
    onCategory: category => setRecipes(current => ({ ...current, category: category as RecipeCategory })),
    onAi: dish => router.push({ pathname: "/cook/ai", params: { dish } }) });
  const reset = () => { setQuery(""); setRecipes({ ...defaultCookBrowse }); setEvents(defaultEventFilters()); setMarket(defaultShopFilter()); };
  return <Screen back={false} hideTimers header={<View testID="feed-search-toolbar" style={s.toolbar}>
    <IconButton appearance="plain" label={tc("goBack")} icon="arrow-back" disabled={submitting} onPress={finish} />
    <View style={s.input}>{tab === "recipes" ? box.field : <SearchField value={query} onChange={setQuery} placeholder={placeholder} onSubmit={() => void submit()} />}</View>
    <Button label={t("search")} variant="link" disabled={!food.readable || submitting} onPress={() => void submit()} />
  </View>}>
    {tab === "recipes" && !!query.trim() && box.below}
    {!query.trim() && recent.items.length > 0 && <View accessibilityLabel={t("recent")} style={[s.recent, { borderBottomColor: theme.divider }]}>
      {recent.items.map(item => <View key={item} style={common.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={item} disabled={!food.readable || submitting} style={s.history} onPress={() => void submit(item)}><Icon name="time-outline" /><T style={common.flex}>{item}</T></Pressable>
        <IconButton appearance="plain" label={t("removeRecent", { name: item })} icon="close-outline" onPress={() => recent.remove(item)} />
      </View>)}
    </View>}
    {tab === "recipes" ? <><RecipeFilters value={recipes} change={patch => setRecipes(current => ({ ...current, ...patch }))} />
      <Button label={tr("tabSaved")} variant="link" onPress={() => router.push("/cook?tab=saved")} />
      <Button label={t("myRecipes")} variant="link" onPress={() => router.push("/cook/my-recipes")} /></>
      : tab === "events" ? <EventSearchFilters value={events} change={patch => setEvents(current => ({ ...current, ...patch }))} />
      : <MarketSearchFilters value={market} change={patch => setMarket(current => ({ ...current, ...patch }))} />}
    <Button label={t("reset")} variant="link" onPress={reset} />
  </Screen>;
}
const s = StyleSheet.create({
  toolbar: { flexDirection: "row", alignItems: "center", gap: 0 }, input: { flex: 1, minWidth: 0 },
  recent: { borderBottomWidth: 1, paddingBottom: 12, gap: 4 },
  history: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4 },
});
