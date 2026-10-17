import { Redirect } from "expo-router";
import { ExploreCaseDetailScreen } from "../../screens/food/ExploreCaseDetail";

/** Local development case detail; unavailable in production builds. */
export default function ExploreCase() { return __DEV__ ? <ExploreCaseDetailScreen /> : <Redirect href="/" />; }
