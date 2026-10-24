import { Screen } from "../../../components/Screen";
import { MyRecipesContent } from "../../../screens/food/MyRecipes";
import { useT } from "../../../i18n";
export default function MyRecipes() { return <Screen title={useT("cook")("tabMine")} backTo="/cook"><MyRecipesContent query="" /></Screen>; }
