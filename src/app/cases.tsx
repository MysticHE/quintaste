import { Redirect } from "expo-router";
import { CasesScreen } from "../screens/food/Contributions";

/** Local development case list; production reports go to the staff queue and have no member-facing list yet. */
export default function Cases() { return __DEV__ ? <CasesScreen /> : <Redirect href="/" />; }
