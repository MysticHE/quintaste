import { SavedPlaceLabel } from "../../components/discovery/SavedPlaceLabel";
import { SavedPlaceCard } from "../../components/discovery/SavedPlaceCard";
import { SavedCatalogueVenue } from "../../components/discovery/CatalogueVenueCard";
import { recalledPlace, savedGoogleId } from "../../utils/live-place-cache";
import { FilterButton } from "../../components/BrowseControls";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { Chip, Chips, EmptyState, IconButton, InfoBox, SearchField } from "../../components/food/Controls";
import { FoodCard } from "../../components/food/FoodCard";
import { useMinuteClock } from "../../components/food/Timers";
import { dishById } from "../../data/dishes";
import { venueById } from "../../data/venues";
import { cookingRecipeById } from "../../utils/private-recipes";
import type { RecipeWorkspace } from "../../types/recipe-workspace";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { goBack } from "../../utils/navigation";
import { itemPath } from "../../utils/catalog";
import type { SavedKind } from "../../types/food";
import { recalledCatalogueVenueName } from "../../services/catalogue-summaries";
import { usePlaceReviewSummaries } from "../../hooks/usePlaceReviewSummaries";
import { useReactions } from "../../hooks/useReactions";
import { useT } from "../../i18n";

type Translate = ReturnType<typeof useT<"explore">>;
function itemName(kind: SavedKind, id: string, now: number, workspace: RecipeWorkspace, labels: Record<string, string>, t: Translate) {
  if (kind === "place" && id.startsWith("catalogue-")) return labels[id] || recalledCatalogueVenueName(id.slice("catalogue-".length)) || t("savedPlace");
  const googleId = kind === "place" ? savedGoogleId(id) : null;
  if (googleId) return recalledPlace(googleId, now)?.name ?? t("savedGooglePlace");
  if (kind === "recipe") {
    const recipe = cookingRecipeById(id, workspace);
    return recipe ? recipe.name || t("untitledRecipe") : t("unavailableItem");
  }
  return (kind === "place" ? venueById(id) : dishById(id))?.name ?? t("unavailableItem");
}
export function SavedScreen() {
  const { doc, undo, undoRemove, dismissUndo, patchDocument, ready, error, savedSelection, savedSearch: query, setSavedSearch: setQuery } = useFood();
  const { preview } = usePreferences();
  const now = useMinuteClock(), t = useT("explore");
  const { category } = savedSelection;
  const list = category === "Notes" ? "" : savedSelection.list;
  const [editing, setEditing] = useState("");
  // One ratings request for every saved catalogue place, rather than one per card.
  useReactions("place", doc.saves.filter(item => item.kind === "place" && item.id.startsWith("catalogue-")).map(item => item.id.slice(10)));
  const reviews = usePlaceReviewSummaries(doc.saves.filter(item => item.kind === "place" && item.id.startsWith("catalogue-")).map(item => item.id.slice(10)), ready);
  const visible = doc.saves.filter(item => (category === "All" || ({ Places: "place", Dishes: "dish", Recipes: "recipe" } as Record<string, string>)[category] === item.kind) &&
    (!list || item.list === list) && (itemName(item.kind, item.id, now, doc.recipes, doc.exploreLocal.labels, t) + " " + (doc.exploreLocal.labels[item.id] ?? "") + " " + (doc.notes[item.kind + ":" + item.id] ?? "")).toLowerCase().includes(query.toLowerCase()));
  const notes = Object.entries(doc.notes).filter(([, text]) => !!text && text.toLowerCase().includes(query.toLowerCase()));
  const open = (kind: SavedKind, id: string) => {
    if (kind === "place" && id.startsWith("catalogue-")) {
      router.push({ pathname: "/place/[id]", params: { id, from: "saved" } } as never); return;
    }
    const googleId = kind === "place" ? savedGoogleId(id) : null;
    if (googleId) { router.push({ pathname: "/place/[id]", params: { id, from: "saved" } } as never); return; }
    if (kind === "recipe" && cookingRecipeById(id, doc.recipes)?.private) {
      router.push({ pathname: "/private-recipe/[id]", params: { id, from: "saved" } }); return;
    }
    router.push({ pathname: itemPath(kind, id), params: { from: "saved" } } as never);
  };
  return <Screen header={<View style={common.row}>
    <IconButton label={t("goBack")} icon="chevron-back" onPress={() => goBack("/account")} />
    <View style={common.flex}><SearchField value={query} onChange={setQuery} placeholder={t("searchSaved")}
      trailing={<FilterButton label={t("savedFilters")} count={category !== "All" || !!list ? 1 : 0} onPress={() => router.push("/saved/filters")} />} /></View>
  </View>}>
    {(category !== "All" || !!list) && <T variant="small" muted>{[category !== "All" ? t("savedCategory", { name: category }) : "", list].filter(Boolean).join(" · ")}</T>}
    {undo && <InfoBox title={t("itemRemoved")} text={itemName(undo.kind, undo.id, now, doc.recipes, doc.exploreLocal.labels, t)}>
      <Chips><Chip label={t("undo")} icon="arrow-undo-outline" onPress={() => void undoRemove()} /><Chip label={t("dismiss")} onPress={dismissUndo} /></Chips>
    </InfoBox>}
    {error?.kind === "load" ? <T muted>{t("collectionUnavailable")}</T> : category === "Notes" ? <>
      {!notes.length && <EmptyState title={t("noNotesYet")} text={t("notesHint")} icon="document-text-outline" />}
      {notes.map(([key, text]) => {
        const [kind, id] = key.split(":") as [SavedKind, string];
        return <Card key={key} style={common.stack}><T variant="subtitle">{itemName(kind, id, now, doc.recipes, doc.exploreLocal.labels, t)}</T><T selectable>{text}</T>
          <Button label={t("openItem")} variant="secondary" onPress={() => open(kind, id)} /></Card>;
      })}
    </> : <>
      {ready && !visible.length && <EmptyState title={t(doc.saves.length ? "noMatchingSaves" : "findFavourite")}
        text={t(doc.saves.length ? "tryAnotherFilter" : "saveToKeep")}
        action={t(doc.saves.length ? "editFilters" : "exploreFood")} icon="bookmark-outline"
        onPress={() => router.navigate(doc.saves.length ? "/saved/filters" : "/")} />}
      {[...visible].sort((a, b) => b.savedAt - a.savedAt).map(item => <View key={item.kind + ":" + item.id} style={common.stack}>
        {item.kind === "place" && item.id.startsWith("catalogue-")
          ? <SavedCatalogueVenue id={item.id.slice(10)} review={reviews.data?.items.find(summary => summary.id === item.id.slice(10))} more={() => setEditing(editing === "place:" + item.id ? "" : "place:" + item.id)} />
          : item.kind === "place" && savedGoogleId(item.id) ? <SavedPlaceCard placeId={savedGoogleId(item.id)!} now={now} more={() => setEditing(editing === "place:" + item.id ? "" : "place:" + item.id)} /> : <FoodCard kind={item.kind} id={item.id} now={now} onOpen={() => open(item.kind, item.id)} onMore={() => setEditing(editing === item.kind + ":" + item.id ? "" : item.kind + ":" + item.id)} />}
        {editing === item.kind + ":" + item.id && <Card style={common.stack}><T style={common.bold}>{t("moveToList")}</T><Chips>
          {["", ...doc.lists].map(name => <Chip key={name} label={name || t("noList")} selected={item.list === name} onPress={() => void patchDocument({
            saves: doc.saves.map(saved => saved.kind === item.kind && saved.id === item.id ? { ...saved, list: name } : saved),
          }).then(okay => { if (okay) setEditing(""); })} />)}</Chips>
          {item.kind === "place" && savedGoogleId(item.id) && <SavedPlaceLabel key={item.id} id={item.id} />}
          <Button label={t("manageLists")} variant="link" onPress={() => router.push("/saved/filters")} />
        </Card>}
      </View>)}
    </>}
    {!preview && <Button label={t("profileOptions")} variant="link" onPress={() => router.push({ pathname: "/login", params: { returnTo: "/saved" } })} />}
  </Screen>;
}
