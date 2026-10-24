import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Chip, IconButton, SearchField } from "../food/Controls";
import { Button, T, common } from "../ui";
import { toggleFilter } from "../../utils/discovery-filters";
import type { PublishedMenu } from "../../types/menus";
import { menuDisplayItems } from "../../utils/menu-display";
import { MenuSection } from "./MenuSection";
import { useScreenScrollToTop } from "../Screen";
import { edgeScroll } from "../../theme/layout";
import { useT } from "../../i18n";

export function MenuDishes({ menu }: { menu: PublishedMenu; now: number }) {
  const [query, setQuery] = useState(""), [categoriesChosen, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0), scrollToTop = useScreenScrollToTop(), turned = useRef(false), t = useT("explore");
  const turn = (next: number) => { turned.current = true; setPage(next); };
  const active = useMemo(() => ({ ...menu.sections[0], items: menuDisplayItems(menu) }), [menu]);
  const categories = useMemo(() => [...new Set(active.items.map(item => item.category ?? "").filter(Boolean))], [active]);
  const selectedCategories = useMemo(() => categoriesChosen.filter(value => categories.includes(value)), [categoriesChosen, categories]);
  const count = active.items.length;
  const needle = query.trim().normalize("NFKC").toLocaleLowerCase();
  const matched = useMemo(() => active.items.filter(item => (!selectedCategories.length || selectedCategories.includes(item.category ?? ""))
    && (!needle || (item.name + " " + (item.category ?? "")).normalize("NFKC").toLocaleLowerCase().includes(needle))),
  [active, selectedCategories, needle]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matched.length / 20) - 1));
  // Scroll once the new page has rendered, so the height change cannot interrupt the scroll.
  useEffect(() => { if (turned.current) { turned.current = false; scrollToTop(); } }, [currentPage, scrollToTop]);
  const sections = matched.length ? [{ ...active, items: matched.slice(currentPage * 20, (currentPage + 1) * 20) }] : [];
  return <View testID="menu-dishes" style={{ gap: 12 }}>
    {(count > 12 || !!query) && <SearchField placeholder={t("searchDishes")} value={query}
      onChange={value => { setQuery(value); setPage(0); }} />}
    {categories.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={edgeScroll.row} contentContainerStyle={edgeScroll.content}>
      <View accessibilityLabel={t("menuCategoriesA11y")} style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
        <Chip label={t("allDishes")} selected={!selectedCategories.length} compact onPress={() => { setCategories([]); setPage(0); }} />
        {categories.map(value => <Chip key={value} label={value} role="checkbox" selected={selectedCategories.includes(value)} compact
          onPress={() => { setCategories(toggleFilter(selectedCategories, value)); setPage(0); }} />)}
      </View>
    </ScrollView>}
    <View style={common.spread}><T variant="caption" muted accessibilityLiveRegion="polite">{t("dishMatches", { n: matched.length, found: needle || selectedCategories.length ? 1 : 0 })}</T><T variant="caption" muted>{t("price")}</T></View>
    {sections.length ? sections.map(section => <MenuSection key={section.id} section={section} />) : <View style={common.stack}>
      <T muted>{t("noMatchingDishes")}</T><Button label={t("clearDishSearch")} variant="link" onPress={() => { setQuery(""); setCategories([]); setPage(0); }} />
    </View>}
    {matched.length > 20 && <View testID="menu-pagination" style={[common.row, { gap: 8 }]}>
      <T variant="caption" muted style={[common.flex, { minWidth: 0 }]} accessibilityLiveRegion="polite">{t("dishRange", { from: currentPage * 20 + 1, to: Math.min((currentPage + 1) * 20, matched.length), total: matched.length })}</T>
      <View style={[common.row, { gap: 8 }]}>
        <IconButton label={t("previousDishes")} icon="chevron-back" disabled={currentPage === 0} onPress={() => turn(currentPage - 1)} />
        <IconButton label={t("nextDishes")} icon="chevron-forward" disabled={(currentPage + 1) * 20 >= matched.length} onPress={() => turn(currentPage + 1)} />
      </View>
    </View>}
  </View>;
}
