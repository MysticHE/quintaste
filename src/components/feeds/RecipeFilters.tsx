import { View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { FilterSection } from "../BrowseControls";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { CookSection } from "../recipes/CookLayout";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { recipeCategories } from "../../types/food";
import { nutritionChoices, type CookBrowse } from "../../types/recipe-workspace";
import { categoryName, selectedRecipeDiets, sortName } from "../../utils/recipe-browse";
import { nutritionChoiceName } from "../../utils/nutrition";
import { toggleFilter } from "../../utils/discovery-filters";

export function RecipeFilters({ value, change }: { value: CookBrowse; change: (patch: Partial<CookBrowse>) => void }) {
  const t = useT("explore"), tf = useT("feeds"), language = useLanguage(), dietText = useDietText(), { theme } = usePreferences();
  const diets = selectedRecipeDiets(value), times = [["Any", t("anyTime")], ["15", t("upTo15")], ["30", t("upTo30")]] as const;
  return <View style={{ gap: 20 }}>
    <FilterSection prominent title={t("category")} icon="grid-outline"><Chips label={t("recipeCategoryLabel")}>
      {(["All", ...recipeCategories] as const).map(category => <Chip key={category} label={categoryName(category, language)} role="radio" selected={value.category === category} onPress={() => change({ category })} />)}
    </Chips></FilterSection>
    <FilterSection prominent title={t("diet")} icon="leaf-outline"><Chips multiple label={t("recipeDiet")}>
      <Chip label={t("anyDiet")} selected={!diets.length} onPress={() => change({ labels: [] })} />
      {(["Vegetarian", "Vegan"] as const).map(diet => <Chip key={diet} label={dietText.line(diet)} role="checkbox" selected={diets.includes(diet)}
        leading={<DietIcon diet={diet} color={diets.includes(diet) ? theme.accent : theme.foreground} />}
        onPress={() => change({ labels: toggleFilter(diets, diet) })} />)}
    </Chips></FilterSection>
    <FilterSection prominent title={t("cookingTime")} icon="time-outline"><Chips label={t("time")}>
      {times.map(([time, label]) => <Chip key={time} label={label} role="radio" selected={value.time === time} onPress={() => change({ time })} />)}
    </Chips></FilterSection>
    <FilterSection prominent title={t("nutrition")} icon="nutrition-outline"><Chips multiple label={t("nutritionPerServing")}>
      {nutritionChoices.map(choice => <Chip key={choice} label={nutritionChoiceName(choice, language)} role="checkbox" selected={(value.nutrition ?? []).includes(choice)}
        onPress={() => change({ nutrition: toggleFilter(value.nutrition ?? [], choice) })} />)}
    </Chips></FilterSection>
    <CookSection title={tf("moreFilters")}>
      <FilterSection prominent title={t("sortBy")} icon="swap-vertical-outline"><Chips label={t("recipeSort")}>
        {(["Fit", "Time", "Recent"] as const).map(sort => <Chip key={sort} label={sortName(sort, language)} role="radio" selected={value.sort === sort} onPress={() => change({ sort })} />)}
      </Chips></FilterSection>
      <Chip label={t("onePot")} role="checkbox" selected={value.onePot} onPress={() => change({ onePot: !value.onePot })} />
    </CookSection>
  </View>;
}
