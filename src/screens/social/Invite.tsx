import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Screen } from "../../components/Screen";
import { Button, Field, T } from "../../components/ui";
import { Chip } from "../../components/food/Controls";
import { ChoiceGroup } from "../../components/social/ProfileFields";
import { RemoteStatus } from "../../components/CommunityGate";
import { FieldLabel, ListGroup, ListItem } from "../../components/GroupedList";
import { useMinuteClock } from "../../components/food/Timers";
import { SocialGate, useSocialError } from "../../components/social/SocialState";
import { PlacePicker, PlaceRow } from "../../components/social/PlacePicker";
import { SlotPicker } from "../../components/social/SlotPicker";
import { Avatar } from "../../components/social/SocialPhoto";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { inviteDinner, person } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import { dinnerSlots } from "../../utils/social-time";
import { dinnerPays, type DinnerPay, type PersonPage, type SocialPlace } from "../../types/community";

const payKeys = { split: "paySplit", host: "payHost", own: "payOwn" } as const;
function InviteForm({ p }: { p: PersonPage }) {
  const t = useT("social"), { theme, setNotice } = usePreferences(), problem = useSocialError(), now = useMinuteClock(), slots = useMemo(() => dinnerSlots(now), [now]);
  const [starts, setStarts] = useState(""), [place, setPlace] = useState<SocialPlace | null>(null), [pay, setPay] = useState<DinnerPay>("split");
  const [message, setMessage] = useState(""), [picking, setPicking] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const send = async () => {
    if (!starts) { setError(t("chooseTimeFirst")); return; }
    if (!place) { setError(t("choosePlaceFirst")); return; }
    setBusy(true); setError("");
    try {
      await inviteDinner({ userId: p.id, placeId: place.id, starts, pay, message });
      setNotice({ text: t("inviteSent", { name: p.firstName }) }); invalidate("/api/social"); router.back();
    } catch (failure) { setError(problem(failure, p.firstName)); }
    finally { setBusy(false); }
  };
  return <>
    <ListGroup><ListItem title={p.firstName} subtitle={t("inviteWho")} leading={<Avatar uri={p.photos[0]?.thumb} name={p.firstName} size={44} />} /></ListGroup>
    <SlotPicker label={t("when")} slots={slots} value={starts} onChange={setStarts} />
    <FieldLabel>{t("whereLabel")}</FieldLabel>
    <PlaceRow place={place} onChange={() => setPicking(true)} />
    <ChoiceGroup label={t("invitePay")}>{dinnerPays.map(id => <Chip key={id} label={t(payKeys[id])} role="radio" selected={pay === id} onPress={() => setPay(id)} />)}</ChoiceGroup>
    <Field label={t("inviteMessage")} value={message} onChangeText={setMessage} placeholder={t("inviteMessageHint")} maxLength={300} multiline />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
    <Button label={t("sendInvite")} icon="send-outline" loading={busy} onPress={() => void send()} />
    <T variant="small" muted style={{ textAlign: "center" }}>{t("inviteOpenNote")}</T>
    <PlacePicker visible={picking} onClose={() => setPicking(false)} onPick={setPlace} selectedId={place?.id} />
  </>;
}
/** A 1-to-1 dinner invite to a friend: when, a catalogue place, who pays and an optional message. */
export function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("social"), remote = useRemote(id ? "/api/social/people/" + id : null, signal => person(id, signal));
  return <Screen title={t("inviteTitle")}><SocialGate returnTo={"/social/invite/" + id}>
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social/friends" missing={t("profileUnavailable")} />
    {remote.data && <InviteForm p={remote.data} />}
  </SocialGate></Screen>;
}
