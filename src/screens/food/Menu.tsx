import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Screen } from "../../components/Screen";
import { MenuDishes } from "../../components/discovery/MenuDishes";
import { Button, Icon, T, common } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { MenuSourceLink } from "../../components/discovery/MenuSourceLink";
import { useMenus } from "../../state/Menus";
import { usePreferences } from "../../state/Preferences";
import { useMenuDetail } from "../../hooks/useMenuDetail";
import { ensureMember, useMember } from "../../components/CommunityGate";
import { ReportSheet } from "../../components/ReportSheet";

export function MenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loaded, busy: indexBusy, error: indexError, now, load: loadIndex, offline } = useMenus();
  const { menu, busy: detailBusy, error, storageError, cached, load } = useMenuDetail(id);
  const busy = indexBusy || detailBusy;
  const { theme } = usePreferences(), member = useMember(), [reporting, setReporting] = useState(false);
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
  const latestSource = menu?.sections.reduce<(typeof menu.sections)[number] | undefined>((latest, section) => !latest || Date.parse(section.checkedAt) > Date.parse(latest.checkedAt) ? section : latest, undefined);
  return <Screen title={menu?.name ?? "Menu"} contentStyle={{ paddingHorizontal: 16 }}
    headerAction={menu ? <IconButton label={__DEV__ ? "Suggest a menu correction" : "Report a menu problem"} icon={__DEV__ ? "create-outline" : "flag-outline"} onPress={correct} /> : undefined}>
    {busy && !menu && <ActivityIndicator color={theme.accent} accessibilityLabel="Loading menu" />}
    {menu ? <>
      <View testID="menu-overview" style={{ gap: 8 }}>
        <View style={[common.row, { gap: 8 }]}><Icon name="location-outline" size={16} /><T variant="small" muted style={common.flex}>{menu.branch || menu.address}</T></View>
        <View style={[common.row, { borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 2 }]}>
          <View style={[common.row, common.flex, { gap: 6 }]}><Icon name="book-outline" size={18} color={theme.accent} /><T variant="small" style={common.bold}>Menu</T></View>
          <Pressable accessibilityRole="button" accessibilityLabel="View place details and reviews" onPress={details}
            style={({ pressed }) => [common.row, { gap: 6, minHeight: 44, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="star-outline" size={18} color={theme.accent} /><T variant="small" color={theme.accent} style={common.bold}>Place & reviews</T>
          </Pressable>
        </View>
      </View>
      {cached && <View style={common.row}><T variant="caption" muted style={common.flex} accessibilityLiveRegion="polite">{offline ? "Offline · saved menu" : "Saved menu · may have changed"}</T>
        <Button label="Retry" variant="link" loading={busy} onPress={retry} /></View>}
      <MenuDishes key={menu.id} menu={menu} now={now} />
      {latestSource && <View testID="menu-latest-update">
        <MenuSourceLink url={latestSource.sourceUrl} publisher={latestSource.sourceLabel}
          label={"Last updated " + new Date(latestSource.checkedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" })} />
      </View>}
      {storageError && <T variant="caption" muted>Offline copy could not be saved</T>}
    </> : !busy && <View style={common.stack}>
      <T variant="subtitle" accessibilityRole="header">Menu Unavailable</T>
      <T muted>{error || indexError || (loaded ? "No published menu for this place." : "Connect to load this menu.")}</T>
      <Button label="Retry Menu" variant="secondary" onPress={retry} />
    </View>}
    {menu && !__DEV__ && <ReportSheet kind="place" targetId={menu.id} name={menu.name} initialReason="Menu or prices"
      visible={reporting} onClose={() => setReporting(false)} />}
  </Screen>;
}
