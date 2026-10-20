import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { useMember } from "../CommunityGate";
import { useMinuteClock } from "../food/Timers";
import { useRemote } from "../../hooks/useRemote";
import { tables, tablesKey } from "../../services/social-api";
import { slotLabel } from "../../utils/social-match";
import { FaceStack } from "./Face";
import { openSocial } from "./Shared";

/** On a catalogue place: upcoming open tables there, then Start a table here. Members only; hidden when Social is off. */
export function PlaceTables({ placeId }: { placeId: string }) {
  const { member } = useMember(), now = useMinuteClock(), key = tablesKey("", { place: placeId });
  const remote = useRemote(member ? key : null, signal => tables(key, signal), 60000), items = remote.data?.items ?? [];
  if (!member || remote.error) return null;
  return <ListGroup title="Eat here with others">
    {items.slice(0, 3).map(t => <ListItem key={t.id} title={slotLabel(t.starts, now)} subtitle={t.held + " of " + t.size + " seats taken"}
      leading={<FaceStack people={t.seated} size={26} />} onPress={() => openSocial("/table/" + t.id)} />)}
    <ListItem title="Start A Table Here" leading={<RowIcon name="restaurant-outline" />} onPress={() => openSocial("/table/new?place=" + placeId)} />
  </ListGroup>;
}
