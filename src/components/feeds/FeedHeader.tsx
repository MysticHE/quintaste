import { router } from "expo-router";
import { useT } from "../../i18n";
import { IconButton } from "../food/Controls";
import { TopBar, TopTabs } from "../TopTabs";
import { AddPostMenu } from "./AddPostMenu";
import type { FeedTab } from "../../state/Feeds";

export function FeedHeader({ tab, onChange, filtered }: { tab: FeedTab; onChange: (tab: FeedTab) => void; filtered: boolean }) {
  const t = useT("feeds");
  return <TopBar testID="feeds-toolbar" actions={<>
    <IconButton appearance="plain" icon="search-outline" label={t(tab === "recipes" ? "searchRecipes" : tab === "events" ? "searchEvents" : "searchMarket")}
      dot={filtered} onPress={() => router.push({ pathname: "/feed-search", params: { tab } })} />
    <AddPostMenu />
  </>}>
    <TopTabs label={t("sections")} value={tab} onChange={onChange} tabs={(["recipes", "events", "market"] as const).map(id => ({ id, label: t(id) }))} />
  </TopBar>;
}
