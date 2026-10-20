import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Field, Icon, T, common } from "../ui";
import { Chip, Chips, HorizontalChips } from "../food/Controls";
import { FieldLabel, ListGroup, ListItem, RowIcon } from "../GroupedList";
import { useMinuteClock } from "../food/Timers";
import { usePreferences } from "../../state/Preferences";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { invite, places, placesByIdKey } from "../../services/social-api";
import { introductions } from "../../data/meet";
import { payLabels, payOptions, type PayOption } from "../../types/meet";
import { planningAreaFor } from "../../utils/planning-area";
import { slotLabel, suggestedSlots } from "../../utils/social-match";
import type { Kaki, Person, SocialPlace, SocialProfile } from "../../types/community";
import { Action } from "./Shared";
import { KakiRow } from "./KakiPicker";
import { PlacePicker } from "./PlacePicker";
import { PlaceThumb } from "./Face";
import { SlotPicker } from "./SlotPicker";
import { Sheet } from "./Sheet";

/** Usual spots of both people first, as tappable photo cards; Search places finds any other. */
function SpotChoices({ ids, value, onChange }: { ids: string[]; value: SocialPlace | null; onChange: (place: SocialPlace) => void }) {
  const key = placesByIdKey(ids), remote = useRemote(key, signal => places(key!, signal)), [search, setSearch] = useState(false), { theme } = usePreferences();
  const list = [...(value && !remote.data?.items.some(p => p.id === value.id) ? [value] : []), ...(remote.data?.items ?? [])];
  const label = (place: SocialPlace) => list.filter(p => p.name === place.name).length > 1 && place.branch ? place.name + " \u00B7 " + place.branch : place.name;
  return <View style={{ gap: 6 }}>
    <FieldLabel>Where</FieldLabel>
    <HorizontalChips>
      {list.map(place => <Chip key={place.id} label={label(place)} a11y={label(place) + (place.hours ? ", " + place.hours : "")} role="radio" selected={value?.id === place.id}
        leading={<PlaceThumb place={place} size={26} radius={6} />} onPress={() => onChange(place)} />)}
      <Chip label="Search Places" icon="search" onPress={() => setSearch(true)} />
    </HorizontalChips>
    {value && <View style={[common.row, { gap: 6 }]}><Icon name="time-outline" size={14} color={theme.mutedForeground} /><T variant="small" muted numberOfLines={1}>{value.hours || value.address}</T></View>}
    <PlacePicker visible={search} onClose={() => setSearch(false)} onPick={onChange} />
  </View>;
}
/** Invite someone to a concrete meal: when, where, how many, who pays, and an answer to their opening question. */
/** `pickKaki` opens the kaki picker straight away (the Kaki button on a People card). */
export function InviteSheet({ person, me, visible, onClose, pickKaki = false }: { person: Person; me: SocialProfile; visible: boolean; onClose: () => void; pickKaki?: boolean }) {
  const now = useMinuteClock(), slots = useMemo(() => suggestedSlots(me.times, person.times, now), [me.times, person.times, now]);
  const [starts, setStarts] = useState(slots[0] ?? ""), [place, setPlace] = useState<SocialPlace | null>(null), [size, setSize] = useState<2 | 4 | 6>(4);
  const [kaki, setKaki] = useState<Kaki | null>(null), [pay, setPay] = useState<PayOption>("own"), [message, setMessage] = useState("");
  const unlocked = (me.tables ?? 0) > 0, spotIds = [...new Set([...person.spots, ...me.spots])];
  const send = async () => {
    if (!place) throw new Error("Choose where to eat.");
    if (!starts) throw new Error("Choose when to eat.");
    const areaCode = place.point ? planningAreaFor(place.point.latitude, place.point.longitude)?.code ?? null : null;
    const { id } = await invite(person.id, size, message, { placeId: place.id, starts, pay, areaCode }, size > 2 ? kaki?.id ?? null : null);
    invalidate("/api/social/groups", "/api/social/people/" + person.id);
    onClose();
    router.push(("/social/chat/" + id) as Href);
  };
  const preview = [starts ? slotLabel(starts, now) : "", place?.name ?? "", "Table of " + size].filter(Boolean).join(" · ");
  return <Sheet visible={visible} onClose={onClose} title={"Invite " + person.firstName}
    footer={<Action label="Send Invite" icon="send" disabled={!message.trim() || !place || !starts} run={send} />}>
    <ListGroup><ListItem title={person.firstName + " sees"} subtitle={preview} leading={<RowIcon name="eye-outline" />} wrap /></ListGroup>
    <SlotPicker slots={slots} value={starts} onChange={setStarts} />
    <SpotChoices ids={spotIds} value={place} onChange={setPlace} />
    <View style={{ gap: 6 }}>
      <FieldLabel>Table</FieldLabel>
      <Chips label="Table size">{([2, 4, 6] as const).map(n => <Chip key={n} label={n === 2 && !unlocked ? "2 · after your first table" : String(n)} role="radio"
        icon={n === 2 && !unlocked ? "lock-closed-outline" : "people-outline"} disabled={n === 2 && !unlocked} selected={size === n} onPress={() => setSize(n)} />)}</Chips>
    </View>
    <ListGroup>
      {size > 2 && <KakiRow value={kaki} onChange={setKaki} startOpen={pickKaki} />}
      <ListItem title="Who Pays" subtitle={payLabels[pay]} leading={<RowIcon name="wallet-outline" />} label={"Who pays, " + payLabels[pay] + ". Change"}
        onPress={() => setPay(payOptions[(payOptions.indexOf(pay) + 1) % payOptions.length])} />
    </ListGroup>
    <View style={{ gap: 6 }}>
      {!person.opening && <HorizontalChips>{introductions.map(text => <Chip key={text} label={text} compact selected={message === text} onPress={() => setMessage(text)} />)}</HorizontalChips>}
      <Field label={person.opening || "Message"} value={message} maxLength={300} multiline onChangeText={setMessage} />
    </View>
  </Sheet>;
}
