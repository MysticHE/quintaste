import { useState } from "react";
import { Linking } from "react-native";
import { Screen } from "../components/Screen";
import { ListGroup, ListItem } from "../components/GroupedList";
import { T } from "../components/ui";
import { foodDataSources } from "../data/food-data-sources";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";

/** The food composition datasets behind nutrition figures, each with the credit line its licence asks for, shown as written;
 * a row opens the licence, as the licences ask, and one line states the figures are adapted and not endorsed. */
export function DataSourcesScreen() {
  const t = useT("me"), tc = useT("common"), { theme } = usePreferences(), [failed, setFailed] = useState(false);
  const open = (url: string) => {
    setFailed(false);
    Linking.openURL(url).catch(() => setFailed(true));
  };
  return <Screen title={t("dataSources")}>
    <ListGroup>
      {foodDataSources.map(source => <ListItem key={source.id} title={source.credit} subtitle={source.licence} wrap onPress={() => open(source.licenceUrl || source.url)} />)}
    </ListGroup>
    <T variant="small" muted>{t("dataSourcesNote")}</T>
    {failed && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{tc("actionFailed")}</T>}
  </Screen>;
}
