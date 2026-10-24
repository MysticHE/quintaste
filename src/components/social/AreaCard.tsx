import { router } from "expo-router";
import { View } from "react-native";
import { Button, Card, T, common } from "../ui";
import { ListItem, RowIcon, StatusPill } from "../GroupedList";
import { planningAreaByCode } from "../../utils/planning-area";
import type { NearbyArea, SocialPlace } from "../../types/community";
import { PlaceThumb } from "./Face";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { useT } from "../../i18n";
import { usePreferences } from "../../state/Preferences";
import { openSocial } from "./Shared";

/** Lunch near work, brunch near home: the meal the area card suggests starting. */
export const mealFor = (layer: NearbyArea["layer"]) => layer === "work" ? "lunch" : "brunch";
const startTable = (a: NearbyArea) => openSocial(`/table/new?area=${a.area}&meal=${mealFor(a.layer)}`);
const showTables = (a: NearbyArea) => router.setParams({ tab: "tables", area: a.area });
/** One of your areas: members there, the spots they usually eat at, and starting a table. */
export function AreaCard({ area: a, places }: { area: NearbyArea; places: Map<string, SocialPlace> }) {
  const { theme } = usePreferences(), t = useT("social"), text = useDietText();
  const name = planningAreaByCode.get(a.area)?.name ?? a.area, spots = a.spots.map(spot => ({ ...spot, place: places.get(spot.id) })).filter(spot => spot.place);
  return <Card style={{ gap: 12 }}>
    <View style={[common.row, { gap: 12 }]}>
      <RowIcon name={a.layer === "home" ? "home" : "briefcase"} />
      <View style={[common.flex, { minWidth: 0 }]}>
        <T variant="subtitle" accessibilityRole="header" numberOfLines={1}>{name}</T>
        <T variant="small" muted>{t(a.layer === "home" ? "home" : "work") + " · " + (a.band ? t("membersBand", { band: a.band }) : t("notEnoughYet"))}</T>
      </View>
      <StatusPill label={t(a.layer === "home" ? "yourHome" : "yourWork")} tone="accent" />
    </View>
    {!!a.diets.length && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{a.diets.map(d =>
      <View key={d.label} style={[common.row, { gap: 4, backgroundColor: theme.muted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }]}>
        <DietIcon diet={d.label} size={16} color={theme.mutedForeground} /><T variant="small" style={common.bold}>{text.name(d.label) + " " + d.band}</T></View>)}</View>}
    {!!spots.length && <View style={{ gap: 8 }}>
      <T variant="small" muted style={common.bold} accessibilityRole="header">{t("usualSpots")}</T>
      {spots.map(spot => <View key={spot.id} style={[common.row, { gap: 10 }]}>
        <PlaceThumb place={spot.place!} size={36} radius={8} />
        <View style={[common.flex, { minWidth: 0 }]}><T style={common.bold} numberOfLines={1}>{spot.place!.name}</T>
          {!!spot.place!.hours && <T variant="small" muted numberOfLines={1}>{spot.place!.hours}</T>}</View>
        {spot.band && <T variant="small" muted>{spot.band}</T>}
      </View>)}
    </View>}
    <View style={[common.row, { gap: 8 }]}>
      <View style={common.flex}><Button label={t(a.layer === "work" ? "lunchTable" : "brunchTable")} icon="add" onPress={() => startTable(a)} /></View>
      {a.tables > 0 && <Button label={t("tablesButton", { n: a.tables })} variant="secondary" onPress={() => showTables(a)} />}
    </View>
  </Card>;
}
/** The other area, folded to one row; tapping it brings that card first. */
export function AreaRow({ area: a, onPress }: { area: NearbyArea; onPress: () => void }) {
  const t = useT("social"), name = planningAreaByCode.get(a.area)?.name ?? a.area;
  return <ListItem title={name} subtitle={[t(a.layer === "home" ? "home" : "work"), a.band ? t("membersBand", { band: a.band }) : t("notEnoughYet"), a.tables ? t("tablesCount", { n: a.tables }) : ""].filter(Boolean).join(" · ")}
    leading={<RowIcon name={a.layer === "home" ? "home-outline" : "briefcase-outline"} />} onPress={onPress} />;
}
