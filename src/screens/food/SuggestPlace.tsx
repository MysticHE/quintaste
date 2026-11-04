import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, Field, T, common } from "../../components/ui";
import { Chip } from "../../components/food/Controls";
import { FieldLabel, ListGroup, ListItem, RowIcon, SwitchRow } from "../../components/GroupedList";
import { LocationSearchField } from "../../components/discovery/LocationSearchField";
import { ListingPhotos, photoBudgets } from "../../components/market/ListingPhotos";
import { MemberGate } from "../../components/social/SocialState";
import { usePreferences } from "../../state/Preferences";
import { useAuth } from "../../state/Auth";
import { useRemote, invalidate } from "../../hooks/useRemote";
import { useContributionDraft } from "../../hooks/useContributionDraft";
import { useDebounced } from "../../hooks/useDebounced";
import { ApiError } from "../../services/community-api";
import { listedMatches, suggestPlace } from "../../services/explore-work-api";
import { contributionKey, contributionWords } from "../../config/explore-work";
import type { LocationSuggestion } from "../../types/location-search";
import type { MarketPhotos } from "../../types/market";
import { useLanguage, useT } from "../../i18n";

type Draft = { name: string; address: string; postalCode: string; point: { latitude: number; longitude: number } | null; unit: string;
  kitchen: "veg" | "mixed" | ""; dishes: string; sourceUrl: string; worksHere: boolean; coverConsent: boolean; photos: MarketPhotos };
const empty: Draft = { name: "", address: "", postalCode: "", point: null, unit: "", kitchen: "", dishes: "", sourceUrl: "", worksHere: false, coverConsent: false, photos: {} };

/**
 * Tell QuinTaste about a vegetarian place Explore does not list. The address comes from the OneMap list (its postal code and map
 * point); while the member types, places already listed at that address show first so they can open one instead.
 */
export function SuggestPlaceScreen() {
  const t = useT("explore");
  return <Screen title={t("suggestPlace")}><MemberGate returnTo="/suggest-place"><SuggestPlaceForm /></MemberGate></Screen>;
}
function SuggestPlaceForm() {
  const t = useT("explore"), words = contributionWords(useLanguage()), { theme, setNotice } = usePreferences(), { user } = useAuth();
  const [draft, setDraft] = useState<Draft>(empty), [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false), [error, setError] = useState("");
  const submission = useRef({ key: contributionKey(), input: "" });
  const saved = useContributionDraft(user?.id ? "qt.explore-draft:" + user.id + ":suggestion" : null, draft, setDraft, submission);
  const set = (patch: Partial<Draft>) => setDraft(current => ({ ...current, ...patch }));
  const choose = (item: LocationSuggestion) => {
    if (item.kind !== "address" || !item.postalCode) { setError(t("chooseFromList")); return; }
    setError(""); set({ address: item.address, postalCode: item.postalCode, point: { latitude: item.latitude, longitude: item.longitude } });
  };
  const typed = useDebounced(JSON.stringify({ name: draft.name.trim(), unit: draft.unit.trim(), postalCode: draft.postalCode }), 500);
  const matches = useRemote(draft.postalCode && user?.id ? "explore-match:" + user.id + ":" + typed : null,
    signal => listedMatches(JSON.parse(typed), signal), { keepPrevious: true });
  const found = draft.postalCode ? matches.data?.items ?? [] : [];
  const ready = saved.ready && draft.name.trim().length >= 2 && !!draft.point && !!draft.kitchen && !photoBusy;
  const send = async () => {
    if (!draft.point || !draft.kitchen) return;
    setBusy(true); setError("");
    try {
      const body = { name: draft.name.trim(), address: draft.address, unit: draft.unit.trim(), postalCode: draft.postalCode, point: draft.point, kitchen: draft.kitchen,
        dishes: draft.dishes.trim(), sourceUrl: draft.sourceUrl.trim(), worksHere: draft.worksHere, coverConsent: !!draft.photos.item && draft.coverConsent,
        photos: draft.photos.item ? [draft.photos.item] : [] };
      const input = JSON.stringify(body);
      if (submission.current.input && submission.current.input !== input) submission.current.key = contributionKey();
      submission.current.input = input;
      await suggestPlace({ ...body, submissionKey: submission.current.key });
      await saved.clear(); invalidate("explore-contributions:");
      setNotice({ text: t("suggestSent") }); router.replace("/explore-contributions");
    } catch (problem) { setError(problem instanceof ApiError ? problem.message : words.load); }
    finally { setBusy(false); }
  };
  return <View style={{ gap: 14 }}>
    <Field label={t("suggestName")} value={draft.name} onChangeText={name => set({ name })} maxLength={200} editable={!busy} />
    <View style={{ gap: 6 }}><FieldLabel>{t("suggestAddress")}</FieldLabel>
      <LocationSearchField value={draft.address} addressesOnly suggestionsInFlow disabled={busy} placeholder={t("suggestAddress")}
        onChange={address => set({ address, postalCode: "", point: null })} onChoose={choose} /></View>
    <Field label={t("suggestUnit")} value={draft.unit} onChangeText={unit => set({ unit })} maxLength={20} editable={!busy} autoCapitalize="characters" />
    {!!found.length && <ListGroup title={t("suggestAlready")}>{found.map(place => <ListItem key={place.id} title={place.name}
      subtitle={[place.branch, place.address].filter(Boolean).join(" · ")} wrap leading={<RowIcon name="storefront-outline" />}
      onPress={() => router.push(("/place/catalogue-" + place.id) as never)} />)}</ListGroup>}
    <View style={{ gap: 6 }}><FieldLabel>{t("suggestServes")}</FieldLabel>
      <View accessibilityRole="radiogroup" style={[common.row, { flexWrap: "wrap", gap: 6 }]}>
        {(["veg", "mixed"] as const).map(kitchen => <Chip key={kitchen} label={t(kitchen === "veg" ? "suggestAllVeg" : "suggestSomeVeg")} role="radio" compact
          selected={draft.kitchen === kitchen} disabled={busy} onPress={() => set({ kitchen })} />)}</View></View>
    <Field label={t("suggestDishes")} value={draft.dishes} onChangeText={dishes => set({ dishes })} maxLength={1000} multiline editable={!busy} />
    <Field label={t("suggestLink")} value={draft.sourceUrl} onChangeText={sourceUrl => set({ sourceUrl })} maxLength={1000} editable={!busy}
      autoCapitalize="none" keyboardType="url" />
    <ListingPhotos value={draft.photos} onChange={photos => set({ photos })} slots={["item"]} labels={{ item: t("suggestPhoto") }}
      onBusy={setPhotoBusy} disabled={busy || photoBusy} budget={photoBudgets.upload} />
    {!!draft.photos.item && <SwitchRow label={t("suggestCover")} value={draft.coverConsent} onChange={coverConsent => set({ coverConsent })} disabled={busy} />}
    <SwitchRow label={t("suggestWorksHere")} value={draft.worksHere} onChange={worksHere => set({ worksHere })} disabled={busy} />
    <T variant="caption" muted>{words.privacy}</T>
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t("suggestSend")} icon="send-outline" loading={busy} disabled={!ready} onPress={() => void send()} />
  </View>;
}
