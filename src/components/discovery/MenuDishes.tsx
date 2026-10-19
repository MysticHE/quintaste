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

export function MenuDishes({ menu }: { menu: PublishedMenu; now: number }) {
  const [query, setQuery] = useState(""), [categoriesChosen, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0), scrollToTop = useScreenScrollToTop(), turned = useRef(false);
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
    {(count > 12 || !!query) && <SearchField placeholder="Search dishes" value={query}
      onChange={value => { setQuery(value); setPage(0); }} />}
    {categories.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={edgeScroll.row} contentContainerStyle={edgeScroll.content}>
      <View accessibilityLabel="Menu categories, choose any" style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
        <Chip label="All dishes" selected={!selectedCategories.length} compact onPress={() => { setCategories([]); setPage(0); }} />
        {categories.map(value => <Chip key={value} label={value} role="checkbox" selected={selectedCategories.includes(value)} compact
          onPress={() => { setCategories(toggleFilter(selectedCategories, value)); setPage(0); }} />)}
      </View>
    </ScrollView>}
    <View style={common.spread}><T variant="caption" muted accessibilityLiveRegion="polite">{matched.length} {matched.length === 1 ? "dish" : "dishes"}{needle || selectedCategories.length ? " found" : ""}</T><T variant="caption" muted>Price</T></View>
    {sections.length ? sections.map(section => <MenuSection key={section.id} section={section} />) : <View style={common.stack}>
      <T muted>No matching dishes</T><Button label="Clear dish search" variant="link" onPress={() => { setQuery(""); setCategories([]); setPage(0); }} />
    </View>}
    {matched.length > 20 && <View testID="menu-pagination" style={[common.row, { gap: 8 }]}>
      <T variant="caption" muted style={[common.flex, { minWidth: 0 }]} accessibilityLiveRegion="polite">{currentPage * 20 + 1}–{Math.min((currentPage + 1) * 20, matched.length)} of {matched.length} dishes</T>
      <View style={[common.row, { gap: 8 }]}>
        <IconButton label="Previous dishes" icon="chevron-back" disabled={currentPage === 0} onPress={() => turn(currentPage - 1)} />
        <IconButton label="Next dishes" icon="chevron-forward" disabled={(currentPage + 1) * 20 >= matched.length} onPress={() => turn(currentPage + 1)} />
      </View>
    </View>}
  </View>;
}
