import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Chip, Chips } from "../food/Controls";
import { FilterSection } from "../BrowseControls";
import { T } from "../ui";
import { SwitchRow } from "../GroupedList";
import { DateField } from "../DateField";
import { AreaField } from "../market/AreaField";
import { MarketFilters } from "../market/MarketFilters";
import { DietIcon } from "../food/DietIcon";
import { useDietText } from "../food/DietLabels";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { nearbyPosition } from "../../utils/nearby-position";
import { planningAreaFor } from "../../utils/planning-area";
import { sgDateTimeText } from "../../utils/sg-datetime";
import { useMinuteClock } from "../food/Timers";
import { toggleFilter } from "../../utils/discovery-filters";
import type { DateChoice, EventFilters, NearPoint } from "../../state/Feeds";
import type { ShopFilter } from "../../types/community";

export function DateFilters({ collection = false, value, date, change }: { collection?: boolean; value: DateChoice; date: string; change: (value: DateChoice, date: string) => void }) {
  const t = useT("feeds"), now = useMinuteClock();
  return <FilterSection prominent title={t(collection ? "collection" : "date")} icon="calendar-outline">
    <Chips label={t(collection ? "collection" : "date")}>
      {(["any", "today", "weekend", "date"] as const).map(when => <Chip key={when} role="radio" selected={value === when}
        label={t(when === "any" ? collection ? "anyDay" : "anyDate" : when === "date" ? "chooseDate" : when)} onPress={() => change(when, date)} />)}
    </Chips>
    {value === "date" && <DateField label={t("chooseDate")} value={date} onChange={next => change("date", next)} minimum={sgDateTimeText(now).slice(0, 10)} />}
  </FilterSection>;
}
/** `near` (Events) passes where Near me found the member; `nearOn` keeps that choice selected after the page reopens. */
export function LocationFilter({ value, change, nearOn }: { value: string; change: (area: string, near: NearPoint | null) => void; nearOn?: boolean }) {
  const t = useT("feeds"), { theme } = usePreferences(), [busy, setBusy] = useState(false), [error, setError] = useState(false), [near, setNear] = useState("");
  const revision = useRef(0), mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; revision.current++; }, []);
  const set = (area: string) => { revision.current++; setBusy(false); setError(false); change(area, null); };
  const locate = async () => {
    const request = ++revision.current, current = () => mounted.current && revision.current === request;
    setBusy(true); setError(false);
    try {
      const point = await nearbyPosition(current);
      if (!current()) return;
      const area = point && planningAreaFor(point.coords.latitude, point.coords.longitude)?.name;
      if (!point || !area) throw new Error("AREA_UNAVAILABLE");
      setNear(area); change(area, { latitude: point.coords.latitude, longitude: point.coords.longitude, area });
    } catch { if (current()) setError(true); }
    finally { if (current()) setBusy(false); }
  };
  return <FilterSection prominent title={t("location")} icon="location-outline">
    <Chips label={t("location")}><Chip label={t("singapore")} icon="globe-outline" role="radio" selected={!value} onPress={() => set("")} />
      <Chip label={t("nearMe")} icon="locate-outline" role="radio" selected={nearOn ?? (!!near && value === near)} disabled={busy} onPress={() => void locate()} /></Chips>
    <AreaField label={t("area")} value={value} onChange={set} placeholder={t("anyArea")} near />
    {error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{t("locationFailed")}</T>}
  </FilterSection>;
}
export function EventSearchFilters({ value, change }: { value: EventFilters; change: (patch: Partial<EventFilters>) => void }) {
  const t = useT("feeds");
  return <View style={{ gap: 20 }}>
    <FilterSection prominent title={t("type")} icon="grid-outline"><Chips label={t("type")}>
      {(["all", "local", "classes"] as const).map(kind => <Chip key={kind} label={t(kind === "local" ? "localEvents" : kind)} role="radio" selected={value.kind === kind} onPress={() => change({ kind })} />)}
    </Chips></FilterSection>
    <DateFilters value={value.when} date={value.date} change={(when, date) => change({ when, date })} />
    <LocationFilter value={value.area} nearOn={!!value.near} change={(area, near) => change({ area, near })} />
    <FilterSection prominent title={t("price")} icon="pricetag-outline"><Chips label={t("price")}>
      {(["any", "free", "paid"] as const).map(price => <Chip key={price} label={t(price === "any" ? "anyPrice" : price)} role="radio" selected={value.price === price} onPress={() => change({ price })} />)}
    </Chips></FilterSection>
    <SwitchRow bold label={t("savedEvents")} value={value.savedOnly} onChange={savedOnly => change({ savedOnly })} />
  </View>;
}
export function MarketSearchFilters({ value, change }: { value: ShopFilter; change: (patch: Partial<ShopFilter>) => void }) {
  const t = useT("feeds"), tm = useT("market"), te = useT("explore"), diet = useDietText(), { theme } = usePreferences();
  const [more, setMore] = useState(false);
  return <View style={{ gap: 20 }}>
    <FilterSection prominent title={t("type")} icon="grid-outline"><Chips label={t("type")}>
      {(["Any", "made", "prepacked"] as const).map(kind => <Chip key={kind} label={kind === "Any" ? t("all") : tm(kind === "made" ? "kindMade" : "kindPrepacked")} role="radio" selected={value.kind === kind} onPress={() => change({ kind })} />)}
    </Chips></FilterSection>
    <FilterSection prominent title={te("diet")} icon="leaf-outline"><Chips label={te("diet")} multiple>
      <Chip label={te("anyDiet")} selected={!value.labels.length} onPress={() => change({ labels: [] })} />
      {(["Vegetarian", "Vegan"] as const).map(label => <Chip key={label} label={diet.name(label)} role="checkbox" selected={value.labels.includes(label)}
        leading={<DietIcon diet={label} color={value.labels.includes(label) ? theme.accent : theme.foreground} />} onPress={() => change({ labels: toggleFilter(value.labels, label) })} />)}
    </Chips></FilterSection>
    <DateFilters collection value={value.collection ?? "any"} date={value.date ?? ""} change={(collection, date) => change({ collection, date })} />
    <LocationFilter value={value.area} change={area => change({ area })} />
    <FilterSection prominent title={t("price")} icon="pricetag-outline"><Chips label={t("price")}>
      {(["any", "under10", "10to20", "over20"] as const).map(price => <Chip key={price} label={t(({ any: "anyPrice", under10: "underTen", "10to20": "tenToTwenty", over20: "overTwenty" } as const)[price])}
        role="radio" selected={(value.price ?? "any") === price} onPress={() => change({ price })} />)}
    </Chips></FilterSection>
    <SwitchRow bold label={t("available")} value={value.available} onChange={available => change({ available })} />
    <Chip label={t("moreFilters")} icon="options-outline" onPress={() => setMore(true)} />
    {more && <MarketFilters value={value} onApply={change} onClose={() => setMore(false)} />}
  </View>;
}
