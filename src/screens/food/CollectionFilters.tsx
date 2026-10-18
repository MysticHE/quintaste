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
import { fivePungentLabel } from "../../config/preferences";
import { defaultCookBrowse } from "../../state/recipe-workspace";
import { selectedRecipeDiets, sortLabels } from "../../utils/recipe-browse";
import { toggleFilter } from "../../utils/discovery-filters";

export function CookFiltersScreen() {
  const { cookBrowse: browse, setCookBrowse, readable } = useFood(), { theme } = usePreferences();
  const set = (patch: Partial<CookBrowse>) => void setCookBrowse(patch);
  const times = [["Any", "Any time"], ["15", "15 min or less"], ["30", "30 min or less"]] as const;
  const diets = selectedRecipeDiets(browse);
  // Order follows what decides a meal for this audience: diet (with the five pungent), time, then kind of dish.
  return <CookLayout title="Recipe filters" backTo="/cook" headerAction={<Button label="Done" variant="link" onPress={() => goBack("/cook")} />}
    footer={<Button label="Reset filters" variant="link" disabled={!readable} onPress={() => void setCookBrowse({ ...defaultCookBrowse })} />}>
    <FilterSection title="Diet" icon="leaf-outline">
      <Chips multiple label="Recipe diet"><Chip compact label="Any diet" selected={!diets.length} disabled={!readable} onPress={() => set({ diets: [], vegan: false })} />
        {(["Vegetarian", "Vegan"] as const).map(diet => <Chip compact key={diet} label={diet} role="checkbox" selected={diets.includes(diet)} disabled={!readable}
          leading={<DietIcon diet={diet} color={diets.includes(diet) ? theme.accent : theme.foreground} />}
          onPress={() => { const next = toggleFilter(diets, diet); set({ diets: next, vegan: next.length === 1 && next[0] === "Vegan" }); }} />)}
      </Chips>
      <Chips multiple label="Five pungent"><Chip compact label={fivePungentLabel} role="checkbox" selected={browse.alliumFree} disabled={!readable} onPress={() => set({ alliumFree: !browse.alliumFree })} /></Chips>
    </FilterSection>
    <FilterSection title="Cooking time" icon="time-outline">
      <Chips label="Time">{times.map(([value, label]) => <Chip compact key={value} label={label} role="radio" selected={browse.time === value} disabled={!readable} onPress={() => set({ time: value })} />)}</Chips>
    </FilterSection>
    <FilterSection title="Category" icon="grid-outline">
      <Chips label="Recipe category"><Chip compact label="All" role="radio" selected={browse.category === "All"} disabled={!readable} onPress={() => set({ category: "All" })} />
        {recipeCategories.map(category => <Chip compact key={category} label={category} role="radio"
          selected={browse.category === category} disabled={!readable} onPress={() => set({ category })} />)}</Chips>
    </FilterSection>
    <FilterSection title="Sort by" icon="swap-vertical-outline">
      <Chips label="Recipe sort">{(["Fit", "Time", "Recent"] as const).map(sort => <Chip compact key={sort} label={sortLabels[sort]} role="radio"
        selected={browse.sort === sort} disabled={!readable} onPress={() => set({ sort })} />)}</Chips>
    </FilterSection>
    <FilterSection title="More" icon="ellipsis-horizontal-circle-outline">
      <Chips multiple label="More recipe filters"><Chip compact label="One pot" role="checkbox" selected={browse.onePot} disabled={!readable} onPress={() => set({ onePot: !browse.onePot })} />
        <Chip compact label="Saved only" icon="bookmark-outline" role="checkbox" selected={browse.saved} disabled={!readable} onPress={() => set({ saved: !browse.saved })} /></Chips>
    </FilterSection>
  </CookLayout>;
}
export function SavedFiltersScreen() {
  const { doc, savedSelection, setSavedSelection, patchDocument, readable } = useFood();
  const { setNotice } = usePreferences();
  const [selection, setSelection] = useState<SavedSelection>(savedSelection), [adding, setAdding] = useState(false), [name, setName] = useState(""), [creating, setCreating] = useState(false);
  const selectionRevision = useRef(0);
  const changeSelection = (next: SavedSelection) => { selectionRevision.current += 1; setSelection(next); };
  const create = async () => {
    const label = name.trim();
    if (!label || doc.lists.includes(label)) { setNotice({ text: "Choose a new list name.", error: true }); return; }
    if (doc.lists.length >= 30) { setNotice({ text: "You can keep up to 30 lists.", error: true }); return; }
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
  return <Screen title="Saved Filters" backTo="/saved">
    <Card style={common.stack}><T style={common.bold}>Type</T>
      <Chips>{(["All", "Places", "Dishes", "Recipes", "Notes"] as const).map(category => <Chip key={category} label={category} role="radio" selected={selection.category === category} onPress={() => changeSelection({ ...selection, category, list: category === "Notes" ? "" : selection.list })} />)}</Chips>
    </Card>
    {selection.category !== "Notes" && <Card style={common.stack}><T style={common.bold}>List</T>
      <Chips>{["", ...doc.lists].map(list => <Chip key={list} label={list || "All lists"} selected={selection.list === list} onPress={() => changeSelection({ ...selection, list })} />)}</Chips>
      <Button label="New List" icon="add-outline" variant="link" onPress={() => setAdding(!adding)} />
      {adding && <><Field label="List Name" maxLength={40} value={name} onChangeText={setName} placeholder="Weekday lunches" />
        <Button label="Create List" variant="secondary" loading={creating} disabled={!readable || creating} onPress={() => void create()} /></>}
    </Card>}
    <Button label="Apply" onPress={() => { setSavedSelection(selection); goBack("/saved"); }} />
    <Button label="Reset" variant="link" onPress={() => changeSelection({ category: "All", list: "" })} />
  </Screen>;
}
