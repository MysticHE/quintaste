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
import { menuAvailabilityNote, menuDisplayItems } from "../../utils/menu-display";
import { dishCount, menuKind } from "../../utils/venue-kitchen";
import { zhDate } from "../../utils/food-format";
import { useLanguage, useT } from "../../i18n";

/** Meat-free restaurants often name mock-meat dishes after meat or seafood ("Assam Fish", "BLT"). */
const MEAT_NAMED = /\b(chicken|pork|beef|mutton|lamb|bacon|ham|duck|fish\w*|prawns?|shrimp|crab|squid|abalone|blt|steak|sausage|meat\w*)\b|[鸡鸭猪牛羊鱼虾蟹肉]/i;

export function MenuScreen() {
  const { id, q } = useLocalSearchParams<{ id: string; q?: string }>();
  const { loaded, busy: indexBusy, error: indexError, now, load: loadIndex, offline } = useMenus();
  const { menu, busy: detailBusy, error, storageError, cached, load } = useMenuDetail(id);
  const { venue, busy: venueBusy, retry: retryVenue } = useCatalogueVenue(id);
  // The kitchen decides how the menu reads, so hold the menu back until the place has answered (a failed lookup still shows it, unstyled).
  const venuePending = venueBusy && !venue, busy = indexBusy || detailBusy || venuePending, ready = !!menu && !venuePending;
  const { theme } = usePreferences(), member = useMember(), [reporting, setReporting] = useState(false);
  const t = useT("explore"), tc = useT("common"), language = useLanguage();
  // Production menu updates file to the staff case queue; development keeps the local review service.
  const correct = () => {
    if (!menu) return;
    if (!__DEV__) { if (ensureMember(member, "/place/catalogue-" + menu.id)) setReporting(true); return; }
    router.push({ pathname: "/contribute", params: { placeId: menu.googlePlaceId ?? menu.id,
      target: menu.name + " · " + menu.branch, kind: "correction", topic: "Menu", menuId: menu.id } });
  };
  useFocusEffect(useCallback(() => { void loadIndex(); void load(); }, [loadIndex, load]));
  const retry = () => { void loadIndex(true); void load(true); if (!venue) retryVenue(); };
  const details = () => router.push({ pathname: "/place/[id]", params: { id: "catalogue-" + id } } as never);
  // A Mixed Kitchen lists only its venue-labelled meat-free dishes. The venue alone decides: staff can tag a dish of a meat-free kitchen.
  const kind = menuKind(venue), options = kind === "mixed";
  const shown = options && menu ? menuDisplayItems(menu).length : 0;
  // Owner, 19 Oct: show only the listed count; "3 of 38" read as 38 listed dishes. 20 Oct: no "vegetarian" (now no five pungent).
  const heading = !options ? t("menu") : dishCount(shown, language);
  const availabilityNote = menu ? menuAvailabilityNote(menu) : undefined;
  const mockNamed = kind === "vegetarian" && !!menu?.sections.some(section => section.items.some(item => MEAT_NAMED.test(item.name)));
  const latestSource = menu?.sections.reduce<(typeof menu.sections)[number] | undefined>((latest, section) => !latest || Date.parse(section.checkedAt) > Date.parse(latest.checkedAt) ? section : latest, undefined);
  const updated = latestSource && new Date(latestSource.checkedAt);
  return <Screen title={menu?.name ?? t("menu")}
    headerAction={menu ? <IconButton label={t(__DEV__ ? "suggestMenuCorrection" : "reportMenuProblem")} icon={__DEV__ ? "create-outline" : "flag-outline"} onPress={correct} /> : undefined}>
    {busy && !ready && <ActivityIndicator color={theme.accent} accessibilityLabel={t("loadingMenu")} />}
    {ready && menu ? <>
      <View testID="menu-overview" style={{ gap: 8 }}>
        <View style={[common.row, { gap: 8 }]}><Icon name="location-outline" size={16} /><T variant="small" muted style={common.flex}>{menu.branch || menu.address}</T></View>
        <View style={[common.row, { borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 2 }]}>
          <View style={[common.row, common.flex, { gap: 6 }]}><Icon name="book-outline" size={18} color={theme.accent} /><T variant="small" style={[common.flex, common.bold]} accessibilityRole="header">{heading}</T></View>
          <Pressable accessibilityRole="button" accessibilityLabel={t("viewPlaceAndReviews")} onPress={details}
            style={({ pressed }) => [common.row, { gap: 6, minHeight: 44, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="star-outline" size={18} color={theme.accent} /><T variant="small" color={theme.accent} style={common.bold}>{t("placeAndReviews")}</T>
          </Pressable>
        </View>
      </View>
      {mockNamed && <T variant="small" muted>{t("mockMeatNote")}</T>}
      {availabilityNote && <T testID="menu-availability-note" variant="small" muted>{availabilityNote}</T>}
      {cached && <View style={common.row}><T variant="caption" muted style={common.flex} accessibilityLiveRegion="polite">{t(offline ? "offlineSavedMenu" : "savedMenuMayChange")}</T>
        <Button label={tc("retry")} variant="link" loading={busy} onPress={retry} /></View>}
      <MenuDishes key={menu.id} menu={menu} now={now} search={typeof q === "string" ? q.trim().slice(0, 100) : ""} />
      {latestSource && updated && <View testID="menu-latest-update">
        <MenuSourceLink url={latestSource.sourceUrl} publisher={latestSource.sourceLabel}
          label={t("lastUpdated", { date: language === "zh" ? zhDate(updated) : updated.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }) })} />
      </View>}
      {options && <T testID="veg-options-footnote" variant="caption" muted>{t("labelledMeatFree")}</T>}
      {storageError && <T variant="caption" muted>{t("offlineCopyFailed")}</T>}
    </> : !busy && (loaded && !error && !indexError
      // Loaded fine, nothing published: not an error, so no retry; point to what the member can do instead.
      ? <EmptyState icon="book-outline" title={t("noMenuYet")} text={t("noMenuPublished")} action={tc("back")} onPress={() => goBack("/")} />
      : <EmptyState icon="cloud-offline-outline" title={t("couldntLoadMenu")} text={t("checkConnection")} primary={{ label: tc("tryAgain"), onPress: retry }} />)}
    {menu && !__DEV__ && <ReportSheet kind="place" targetId={menu.id} name={menu.name} initialReason="Menu or prices"
      visible={reporting} onClose={() => setReporting(false)} />}
  </Screen>;
}
