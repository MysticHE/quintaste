import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, T } from "../../components/ui";
import { Chip } from "../../components/food/Controls";
import { ChoiceGroup } from "../../components/social/ProfileFields";
import { RemoteStatus } from "../../components/CommunityGate";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { DietIcon } from "../../components/food/DietIcon";
import { useDietText } from "../../components/food/DietLabels";
import { MemberGate, SocialGate } from "../../components/social/SocialState";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { useMeet } from "../../hooks/useMeet";
import { blocks, unblock } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { ageBands, distanceOptions, hobbyOptions, languageOptions } from "../../config/social-profile";
import type { MeetFilters } from "../../types/meet";

const toggle = <T,>(list: readonly T[], item: T) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
/** People filters: age, diet, distance, languages and hobbies. Each choice saves straight away; Done returns. */
export function FiltersScreen() {
  const t = useT("social"), tc = useT("common"), { theme } = usePreferences(), diet = useDietText(), { network, commit } = useMeet(), f = network.filters;
  const set = (patch: Partial<MeetFilters>) => void commit({ type: "filters", filters: { ...f, ...patch } });
  return <Screen title={t("filtersTitle")} footer={<Button label={tc("done")} onPress={() => router.back()} />}><SocialGate returnTo="/social/filters">
    <ChoiceGroup label={t("ageFilter")} multiple>{ageBands.map(band => <Chip key={band} label={t("optAge", { value: band })} role="checkbox" selected={f.ages.includes(band)}
      onPress={() => set({ ages: toggle(f.ages, band) })} />)}</ChoiceGroup>
    <ChoiceGroup label={t("dietFilter")} multiple>{(["Vegan", "Vegetarian"] as const).map(label => <Chip key={label} label={diet.name(label)} role="checkbox" selected={f.diets.includes(label)}
      leading={<DietIcon diet={label} size={20} color={f.diets.includes(label) ? theme.accent : theme.mutedForeground} />} onPress={() => set({ diets: toggle(f.diets, label) })} />)}</ChoiceGroup>
    <ChoiceGroup label={t("distanceFilter")}>{distanceOptions.map(km => <Chip key={km} label={km ? t("withinKm", { km }) : t("anyDistance")} role="radio" selected={f.km === km}
      onPress={() => set({ km })} />)}</ChoiceGroup>
    <ChoiceGroup label={t("languagesFilter")} multiple>{languageOptions.map(value => <Chip key={value} label={t("optLanguage", { value })} role="checkbox" compact
      selected={f.languages.includes(value)} onPress={() => set({ languages: toggle(f.languages, value) })} />)}</ChoiceGroup>
    <ChoiceGroup label={t("hobbiesFilter")} multiple>{hobbyOptions.map(value => <Chip key={value} label={t("optHobby", { value })} role="checkbox" compact
      selected={f.hobbies.includes(value)} onPress={() => set({ hobbies: toggle(f.hobbies, value).slice(0, 12) })} />)}</ChoiceGroup>
  </SocialGate></Screen>;
}
/** People you blocked; unblocking never restores friendships or dinners. */
export function BlockedScreen() {
  const t = useT("social"), { setNotice } = usePreferences(), remote = useRemote("/api/community/blocks", blocks), items = remote.data?.items ?? [];
  const lift = async (id: string, name: string) => {
    try { await unblock(id); setNotice({ text: t("unblocked", { name }) }); remote.refresh(); invalidate("/api/social"); }
    catch { setNotice({ text: t("actionFailed"), error: true }); }
  };
  return <Screen title={t("blockedTitle")}><MemberGate returnTo="/social/blocked">
    <RemoteStatus remote={remote} icon="ban-outline" returnTo="/social/profile" />
    {remote.data && (items.length ? <ListGroup>{items.map(item => <ListItem key={item.id} title={item.name} leading={<RowIcon name="ban-outline" tone="muted" />}
      trailing={<Button label={t("unblock")} accessibilityLabel={t("unblockNamed", { name: item.name })} variant="link" onPress={() => void lift(item.id, item.name)} />} />)}</ListGroup>
      : <T muted style={{ textAlign: "center" }}>{t("blockedNone")}</T>)}
  </MemberGate></Screen>;
}
