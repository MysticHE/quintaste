import { useRef, useState } from "react";
import { Screen } from "../../components/Screen";
import { CookLayout } from "../../components/recipes/CookLayout";
import { Button, Card, Field, T, common } from "../../components/ui";
import { Chip, Chips } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { goBack } from "../../utils/navigation";
import type { SavedSelection } from "../../types/food";
import type { CookBrowse } from "../../types/recipe-workspace";
import { DietIcon } from "../../components/food/DietIcon";
import { FilterSection } from "../../components/BrowseControls";
import { recipeCategories } from "../../types/food";
import { nutritionChoices } from "../../types/recipe-workspace";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { categoryName, selectedRecipeDiets, sortName } from "../../utils/recipe-browse";
import { nutritionChoiceName } from "../../utils/nutrition";
import { toggleFilter } from "../../utils/discovery-filters";
import { useDietText } from "../../components/food/DietLabels";
import { useLanguage, useT } from "../../i18n";

export function CookFiltersScreen() {
  const { cookBrowse: browse, setCookBrowse, readable } = useFood(), { theme } = usePreferences();
  const t = useT("explore"), tc = useT("common"), language = useLanguage(), dietText = useDietText();
  const set = (patch: Partial<CookBrowse>) => void setCookBrowse(patch);
  const times = [["Any", t("anyTime")], ["15", t("upTo15")], ["30", t("upTo30")]] as const;
  const diets = selectedRecipeDiets(browse);
  // Order follows what decides a meal for this audience: diet labels, time, then kind of dish.
  return <CookLayout title={t("recipeFilters")} backTo="/cook" headerAction={<Button label={tc("done")} variant="link" onPress={() => goBack("/cook")} />}
    footer={<Button label={t("resetFilters")} variant="link" disabled={!readable} onPress={() => void setCookBrowse({ ...defaultCookBrowse })} />}>
    <FilterSection title={t("diet")} icon="leaf-outline">
      <Chips multiple label={t("recipeDiet")}><Chip compact label={t("anyDiet")} selected={!diets.length} disabled={!readable} onPress={() => set({ labels: [] })} />
        {(["Vegan", "Vegetarian"] as const).map(diet => <Chip compact key={diet} label={dietText.name(diet)} role="checkbox" selected={diets.includes(diet)} disabled={!readable}
          leading={<DietIcon diet={diet} color={diets.includes(diet) ? theme.accent : theme.foreground} />}
          onPress={() => set({ labels: toggleFilter(diets, diet) })} />)}
      </Chips>
    </FilterSection>
    <FilterSection title={t("cookingTime")} icon="time-outline">
      <Chips label={t("time")}>{times.map(([value, label]) => <Chip compact key={value} label={label} role="radio" selected={browse.time === value} disabled={!readable} onPress={() => set({ time: value })} />)}</Chips>
    </FilterSection>
    <FilterSection title={t("category")} icon="grid-outline">
      <Chips label={t("recipeCategoryLabel")}><Chip compact label={categoryName("All", language)} role="radio" selected={browse.category === "All"} disabled={!readable} onPress={() => set({ category: "All" })} />
        {recipeCategories.map(category => <Chip compact key={category} label={categoryName(category, language)} role="radio"
          selected={browse.category === category} disabled={!readable} onPress={() => set({ category })} />)}</Chips>
    </FilterSection>
    <FilterSection title={t("nutrition")} icon="nutrition-outline">
      <Chips multiple label={t("nutritionPerServing")}>{nutritionChoices.map(choice => <Chip compact key={choice} label={nutritionChoiceName(choice, language)} role="checkbox" selected={(browse.nutrition ?? []).includes(choice)} disabled={!readable}
        onPress={() => set({ nutrition: toggleFilter(browse.nutrition ?? [], choice) })} />)}</Chips>
    </FilterSection>
    <FilterSection title={t("sortBy")} icon="swap-vertical-outline">
      <Chips label={t("recipeSort")}>{(["Fit", "Time", "Recent"] as const).map(sort => <Chip compact key={sort} label={sortName(sort, language)} role="radio"
        selected={browse.sort === sort} disabled={!readable} onPress={() => set({ sort })} />)}</Chips>
    </FilterSection>
    <FilterSection title={tc("more")} icon="ellipsis-horizontal-circle-outline">
      <Chips multiple label={t("moreRecipeFilters")}><Chip compact label={t("onePot")} role="checkbox" selected={browse.onePot} disabled={!readable} onPress={() => set({ onePot: !browse.onePot })} /></Chips>
    </FilterSection>
  </CookLayout>;
}
export function SavedFiltersScreen() {
  const { doc, savedSelection, setSavedSelection, patchDocument, readable } = useFood();
  const { setNotice } = usePreferences(), t = useT("explore"), tc = useT("common");
  const [selection, setSelection] = useState<SavedSelection>(savedSelection), [adding, setAdding] = useState(false), [name, setName] = useState(""), [creating, setCreating] = useState(false);
  const selectionRevision = useRef(0);
  const changeSelection = (next: SavedSelection) => { selectionRevision.current += 1; setSelection(next); };
  const create = async () => {
    const label = name.trim();
    if (!label || doc.lists.includes(label)) { setNotice({ text: t("chooseNewListName"), error: true }); return; }
    if (doc.lists.length >= 30) { setNotice({ text: t("upTo30Lists"), error: true }); return; }
    const revision = selectionRevision.current;
    setCreating(true);
    try {
      if (await patchDocument({ lists: [...doc.lists, label] })) {
        if (selectionRevision.current === revision) setSelection(current => ({ ...current, list: label }));
        setName(current => current.trim() === label ? "" : current);
        setAdding(false);
      }
    } finally { setCreating(false); }
  };
  return <Screen title={t("savedFiltersTitle")} backTo="/saved">
    <Card style={common.stack}><T style={common.bold}>{t("type")}</T>
      <Chips>{(["All", "Places", "Dishes", "Recipes", "Notes"] as const).map(category => <Chip key={category} label={t("savedCategory", { name: category })} role="radio" selected={selection.category === category} onPress={() => changeSelection({ ...selection, category, list: category === "Notes" ? "" : selection.list })} />)}</Chips>
    </Card>
    {selection.category !== "Notes" && <Card style={common.stack}><T style={common.bold}>{t("list")}</T>
      <Chips>{["", ...doc.lists].map(list => <Chip key={list} label={list || t("allLists")} selected={selection.list === list} onPress={() => changeSelection({ ...selection, list })} />)}</Chips>
      <Button label={t("newList")} icon="add-outline" variant="link" onPress={() => setAdding(!adding)} />
      {adding && <><Field label={t("listName")} maxLength={40} value={name} onChangeText={setName} placeholder={t("listPlaceholder")} />
        <Button label={t("createList")} variant="secondary" loading={creating} disabled={!readable || creating} onPress={() => void create()} /></>}
    </Card>}
    <Button label={t("apply")} onPress={() => { setSavedSelection(selection); goBack("/saved"); }} />
    <Button label={tc("reset")} variant="link" onPress={() => changeSelection({ category: "All", list: "" })} />
  </Screen>;
}
