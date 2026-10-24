import { Redirect } from "expo-router";

/** Keep saved /filters links working; search now lives outside the tab dock. */
export default function ExploreFiltersRoute() {
  return <Redirect href="/explore-search" />;
}
