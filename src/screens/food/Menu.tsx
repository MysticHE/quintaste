import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { goBack } from "../../utils/navigation";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Screen } from "../../components/Screen";
import { MenuDishes } from "../../components/discovery/MenuDishes";
import { Button, Icon, T, common } from "../../components/ui";
import { EmptyState, IconButton } from "../../components/food/Controls";
import { MenuSourceLink } from "../../components/discovery/MenuSourceLink";
import { useMenus } from "../../state/Menus";
import { usePreferences } from "../../state/Preferences";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { ReportSheet } from "../../components/ReportSheet";
import { useCatalogueVenue } from "../../hooks/useCatalogueVenue";
import { menuDisplayItems } from "../../utils/menu-display";
import { isVegOptions } from "../../utils/venue-kitchen";

/** Vegetarian restaurants often name plant-based dishes after meat or seafood ("Assam Fish", "BLT"). */
const MEAT_NAMED = /\b(chicken|pork|beef|mutton|lamb|bacon|ham|duck|fish\w*|prawns?|shrimp|crab|squid|abalone|blt|steak|sausage|meat\w*)\b|[鸡鸭猪牛羊鱼虾蟹肉]/i;

export function MenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loaded, busy: indexBusy, error: indexError, now, load: loadIndex, offline } = useMenus();
  const { menu, busy: detailBusy, error, storageError, cached, load } = useMenuDetail(id);
  const busy = indexBusy || detailBusy;
  const { theme } = usePreferences(), member = useMember(), [reporting, setReporting] = useState(false);
  const { venue } = useCatalogueVenue(id);
  // Production menu updates file to the staff case queue; development keeps the local review service.
  const correct = () => {
    if (!menu) return;
    if (!__DEV__) { if (ensureMember(member, "/place/catalogue-" + menu.id)) setReporting(true); return; }
    router.push({ pathname: "/contribute", params: { placeId: menu.googlePlaceId ?? menu.id,
      target: menu.name + " · " + menu.branch, kind: "correction", topic: "Menu", menuId: menu.id } });
  };
  useFocusEffect(useCallback(() => { void loadIndex(); void load(); }, [loadIndex, load]));
  const retry = () => { void loadIndex(true); void load(true); };
  const details = () => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + id } } as never);
  // A veg options place lists only its venue-labelled dishes; a labelled dish also marks it when the place summary is unavailable.
  const options = !!venue && isVegOptions(venue) || !!menu?.sections.some(section => section.items.some(item => item.diet));
  const shown = options && menu ? menuDisplayItems(menu).length : 0;
  // Owner, 19 Oct: show only the vegetarian count; "3 of 38" read as 38 vegetarian dishes.
  const heading = !options ? "Menu" : shown + " vegetarian " + (shown === 1 ? "dish" : "dishes");
  const mockNamed = !options && !!menu?.sections.some(section => section.items.some(item => MEAT_NAMED.test(item.name)));
  const latestSource = menu?.sections.reduce<(typeof menu.sections)[number] | undefined>((latest, section) => !latest || Date.parse(section.checkedAt) > Date.parse(latest.checkedAt) ? section : latest, undefined);
  return <Screen title={menu?.name ?? "Menu"}
    headerAction={menu ? <IconButton label={__DEV__ ? "Suggest a menu correction" : "Report a menu problem"} icon={__DEV__ ? "create-outline" : "flag-outline"} onPress={correct} /> : undefined}>
    {busy && !menu && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading menu" />}
    {menu ? <>
      <View testID="menu-overview" style={{ gap: 8 }}>
        <View style={[common.row, { gap: 8 }]}><Icon name="location-outline" size={16} /><T variant="small" muted style={common.flex}>{menu.branch || menu.address}</T></View>
        <View style={[common.row, { borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 2 }]}>
          <View style={[common.row, common.flex, { gap: 6 }]}><Icon name="book-outline" size={18} color={theme.accent} /><T variant="small" style={[common.flex, common.bold]} accessibilityRole="header">{heading}</T></View>
          <Pressable accessibilityRole="button" accessibilityLabel="View place details and reviews" onPress={details}
            style={({ pressed }) => [common.row, { gap: 6, minHeight: 44, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="star-outline" size={18} color={theme.accent} /><T variant="small" color={theme.accent} style={common.bold}>Place & reviews</T>
          </Pressable>
        </View>
      </View>
      {mockNamed && <T variant="small" muted>Every dish here is vegetarian. Names like fish or chicken are plant-based versions.</T>}
      {cached && <View style={common.row}><T variant="caption" muted style={common.flex} accessibilityLiveRegion="polite">{offline ? "Offline · saved menu" : "Saved menu · may have changed"}</T>
        <Button label="Retry" variant="link" loading={busy} onPress={retry} /></View>}
      <MenuDishes key={menu.id} menu={menu} now={now} />
      {latestSource && <View testID="menu-latest-update">
        <MenuSourceLink url={latestSource.sourceUrl} publisher={latestSource.sourceLabel}
          label={"Last updated " + new Date(latestSource.checkedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" })} />
      </View>}
      {options && <T testID="veg-options-footnote" variant="caption" muted>Labelled vegetarian by the venue</T>}
      {storageError && <T variant="caption" muted>Offline copy could not be saved</T>}
    </> : !busy && (loaded && !error && !indexError
      // Loaded fine, nothing published: not an error, so no retry; point to what the member can do instead.
      ? <EmptyState icon="book-outline" title="No menu for this place yet" text="We haven't published a menu for this place." action="Back" onPress={() => goBack("/")} />
      : <EmptyState icon="cloud-offline-outline" title="Couldn't load the menu" text="Check your connection and try again." primary={{ label: "Try Again", onPress: retry }} />)}
    {menu && !__DEV__ && <ReportSheet kind="place" targetId={menu.id} name={menu.name} initialReason="Menu or prices"
      visible={reporting} onClose={() => setReporting(false)} />}
  </Screen>;
}
