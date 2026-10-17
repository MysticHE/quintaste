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
const oscUrl = "https://onlinesafety.mlaw.gov.sg/getting-help/reporting-to-the-osc/";
const tips = ["Meet first in a busy public place", "Share your plan with someone you trust", "Leave any time; you never owe a reason",
  "Never send money or documents to people you have not met", "Keep chats in the app until you feel comfortable"];
export function MeetSafetyScreen() {
  const { setNotice } = usePreferences(), open = (url: string) => void Linking.openURL(url).catch(() => setNotice({ text: "Could not open that link on this device.", error: true }));
  return <Screen title="Safety & Help" backTo="/social">
    <ListGroup title="Meeting people">{tips.map(tip => <ListItem key={tip} title={tip} leading={<RowIcon name="checkmark" />} wrap />)}</ListGroup>
    <ListGroup title="Emergency">
      <ListItem title="Police" subtitle="999" leading={<RowIcon name="call-outline" tone="warning" />} onPress={() => open("tel:999")} />
      <ListItem title="Police non-emergency" subtitle="1800 255 0000" leading={<RowIcon name="call-outline" />} onPress={() => open("tel:18002550000")} />
    </ListGroup>
    <ListGroup title="Online harm">
      <ListItem title="Online Safety Commission" subtitle="If a platform does not act within 24 hours" wrap leading={<RowIcon name="open-outline" />} onPress={() => open(oscUrl)} />
    </ListGroup>
    <ListGroup><ListItem title="Blocked People" leading={<RowIcon name="ban-outline" tone="muted" />} onPress={() => openSocial("/blocked")} /></ListGroup>
  </Screen>;
}
/** People you blocked across Social and Market; unblocking never reopens closed groups. */
export function MeetBlockedScreen() {
  const { member } = useMember(), remote = useRemote(member ? "/api/community/blocks" : null, blocks);
  return <Screen title="Blocked People" backTo="/social"><MemberGate>
    <RemoteStatus remote={remote} icon="ban-outline" returnTo="/social" />
    {remote.data && (remote.data.items.length ? <ListGroup>{remote.data.items.map(person =>
      <ListItem key={person.id} title={person.name} leading={<Initial name={person.name} />}
        trailing={<ActionChip label="Unblock" icon="lock-open-outline" run={async () => { await unblock(person.id); remote.refresh(); invalidate("/api/social/", "/api/market/"); }} />} />)}</ListGroup>
      : <EmptyState title="No Blocked People" text="" icon="ban-outline" />)}
  </MemberGate></Screen>;
}
/** Reports are sent from the person's profile menu. */
export function MeetReportScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={("/social/person/" + id) as Href} />;
}
