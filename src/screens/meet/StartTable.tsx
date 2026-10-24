import { useMemo, useState } from "react";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Field, T, common } from "../../components/ui";
import { Chip, Chips } from "../../components/food/Controls";
import { useMinuteClock } from "../../components/food/Timers";
import { Action } from "../../components/social/Shared";
import { DietChoices, MemberGate, useSocialMe } from "../../components/social/MeetUI";
import { PlacePicker, PlaceRow } from "../../components/social/PlacePicker";
import { SlotPicker } from "../../components/social/SlotPicker";
import { KakiRow } from "../../components/social/KakiPicker";
import { FaceStack } from "../../components/social/Face";
import { FieldLabel, FormSection, ListGroup, ListItem, RowIcon, ThemedSwitch } from "../../components/GroupedList";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { places, placesByIdKey, repeat, startTable } from "../../services/social-api";
import { payOptions, type PayOption } from "../../types/meet";
import { useT } from "../../i18n";
import { planningAreaFor } from "../../utils/planning-area";
import { suggestedSlots } from "../../utils/social-match";
import type { DietLabel } from "../../config/diet-labels";
import type { Kaki, SocialPlace, SocialProfile } from "../../types/community";

export function StartTableScreen() {
  const me = useSocialMe().data?.profile, t = useT("social");
  return <Screen title={t("startTable")} backTo="/social"><MemberGate returnTo="/social/table/new">{me && <StartTable me={me} />}</MemberGate></Screen>;
}
const mealTimes = { lunch: ["Weekday lunch"], brunch: ["Weekends"] } as const;
/** Place, time and table first; then who pays, a kaki, balance and a short note. Repeat opens it with the people to invite. */
function StartTable({ me }: { me: SocialProfile }) {
  const params = useLocalSearchParams<{ meal?: string; invite?: string; place?: string }>(), now = useMinuteClock(), t = useT("social");
  const times = params.meal === "lunch" || params.meal === "brunch" ? mealTimes[params.meal] : me.times;
  const slots = useMemo(() => suggestedSlots([...times], [...times], now), [times, now]);
  const inviteIds = (params.invite ?? "").split(",").filter(Boolean).slice(0, 5), friends = useRemote(inviteIds.length ? "/api/social/repeat" : null, repeat);
  const invitees = (friends.data?.items ?? []).filter(k => inviteIds.includes(k.id));
  const preset = placesByIdKey(params.place ? [params.place] : me.spots.slice(0, 1)), presetPlaces = useRemote(preset, signal => places(preset!, signal));
  const [chosen, setChosen] = useState<SocialPlace | null>(null), place = chosen ?? presetPlaces.data?.items[0] ?? null, [picking, setPicking] = useState(false);
  const [starts, setStarts] = useState(slots[0] ?? ""), [size, setSize] = useState<4 | 6>(4), [diets, setDiets] = useState<DietLabel[]>(me.diets);
  const [pay, setPay] = useState<PayOption>("own"), [kaki, setKaki] = useState<Kaki | null>(null), [sameGender, setSameGender] = useState(false);
  const [alcoholFree, setAlcoholFree] = useState(true), [listed, setListed] = useState(!inviteIds.length), [note, setNote] = useState("");
  const post = async () => {
    if (!place) throw new Error(t("choosePlaceError"));
    if (!starts) throw new Error(t("chooseTime"));
    const areaCode = place.point ? planningAreaFor(place.point.latitude, place.point.longitude)?.code ?? null : null;
    const { id } = await startTable({ placeId: place.id, starts, size, diets, pay, sameGender, alcoholFree, note, areaCode, listed,
      kakiId: inviteIds.length ? null : kaki?.id ?? null, invite: inviteIds });
    invalidate("/api/social/tables", "/api/social/groups", "/api/social/nearby");
    router.replace(((listed ? "/social/table/" : "/social/chat/") + id) as Href);
  };
  return <>
    <FormSection title={t("whereAndWhen")}>
      <PlaceRow place={place} onChange={() => setPicking(true)} />
      <SlotPicker slots={slots} value={starts} onChange={setStarts} />
    </FormSection>
    <FormSection title={t("tableSection")}>
      <Chips label={t("seats")}>{([4, 6] as const).map(n => <Chip key={n} label={t("seatsCount", { n })} role="radio" selected={size === n} onPress={() => setSize(n)} />)}</Chips>
      <View style={{ gap: 6 }}><FieldLabel>{t("dietKept")}</FieldLabel><DietChoices value={diets} onChange={setDiets} /></View>
      {!!invitees.length && <ListGroup><ListItem title={t("inviting", { names: invitees.map(k => k.firstName).join(t("listSep")) })}
        leading={<FaceStack people={invitees.map(k => ({ id: k.id, name: k.firstName, hasFace: k.hasFace }))} size={28} />} /></ListGroup>}
      <ListGroup>
        <ListItem title={t("whoPays")} subtitle={t("optPay", { value: pay })} leading={<RowIcon name="wallet-outline" />} label={t("whoPaysA11y", { pay: t("optPay", { value: pay }) })}
          onPress={() => setPay(payOptions[(payOptions.indexOf(pay) + 1) % payOptions.length])} />
        {!inviteIds.length && <KakiRow value={kaki} onChange={setKaki} />}
        <ListItem title={t("anyoneCanJoinTitle")} leading={<RowIcon name="earth-outline" />} trailing={<ThemedSwitch label={t("anyoneCanJoin")} value={listed} onChange={setListed} />} />
        <ListItem title={t("sameGenderTitle")} leading={<RowIcon name="people-outline" />} trailing={<ThemedSwitch label={t("sameGender")} value={sameGender} onChange={setSameGender} />} />
        <ListItem title={t("alcoholFreeTitle")} leading={<RowIcon name="wine-outline" />} trailing={<ThemedSwitch label={t("alcoholFree")} value={alcoholFree} onChange={setAlcoholFree} />} />
      </ListGroup>
    </FormSection>
    <FormSection title={t("note")}>
      <Field label={t("note")} showLabel={false} value={note} maxLength={120} placeholder={t("noteHint")} onChangeText={setNote} />
      <T variant="small" muted style={{ alignSelf: "flex-end" }}>{note.length + " / 120"}</T>
    </FormSection>
    <View style={common.stack}><Action label={t("postTable")} disabled={!place || !starts || !diets.length} run={post} /></View>
    <PlacePicker visible={picking} onClose={() => setPicking(false)} onPick={setChosen} selectedId={place?.id} />
  </>;
}
