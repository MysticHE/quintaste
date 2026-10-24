import { Linking } from "react-native";
import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/food/Controls";
import { ActionChip, openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { Initial, ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { blocks, unblock } from "../../services/social-api";
import { useT } from "../../i18n";
const oscUrl = "https://onlinesafety.mlaw.gov.sg/getting-help/reporting-to-the-osc/";
const tips = ["tipPublic", "tipShare", "tipLeave", "tipMoney", "tipApp"] as const;
export function MeetSafetyScreen() {
  const t = useT("social"), { setNotice } = usePreferences(), open = (url: string) => void Linking.openURL(url).catch(() => setNotice({ text: t("linkFailed"), error: true }));
  return <Screen title={t("safetyHelp")} backTo="/social">
    <ListGroup title={t("meetingPeople")}>{tips.map(tip => <ListItem key={tip} title={t(tip)} leading={<RowIcon name="checkmark" />} wrap />)}</ListGroup>
    <ListGroup title={t("emergency")}>
      <ListItem title={t("police")} subtitle="999" leading={<RowIcon name="call-outline" tone="warning" />} onPress={() => open("tel:999")} />
      <ListItem title={t("policeNonEmergency")} subtitle="1800 255 0000" leading={<RowIcon name="call-outline" />} onPress={() => open("tel:18002550000")} />
    </ListGroup>
    <ListGroup title={t("onlineHarm")}>
      <ListItem title={t("osc")} subtitle={t("oscNote")} wrap leading={<RowIcon name="open-outline" />} onPress={() => open(oscUrl)} />
    </ListGroup>
    <ListGroup><ListItem title={t("blockedPeople")} leading={<RowIcon name="ban-outline" tone="muted" />} onPress={() => openSocial("/blocked")} /></ListGroup>
  </Screen>;
}
/** People you blocked across Social and Market; unblocking never reopens closed groups. */
export function MeetBlockedScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/community/blocks" : null, blocks), t = useT("social");
  return <Screen title={t("blockedPeople")} backTo="/social"><MemberGate>
    <RemoteStatus remote={remote} icon="ban-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? <ListGroup>{remote.data.items.map(person =>
      <ListItem key={person.id} title={person.name} leading={<Initial name={person.name} />}
        trailing={<ActionChip label={t("unblock")} icon="lock-open-outline" run={async () => { await unblock(person.id); remote.refresh(); invalidate("/api/social/", "/api/market/"); }} />} />)}</ListGroup>
      : <EmptyState title={t("noBlocked")} text="" icon="ban-outline" />)}
  </MemberGate></Screen>;
}
/** Reports are sent from the person's profile menu. */
export function MeetReportScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={("/social/person/" + id) as Href} />;
}
