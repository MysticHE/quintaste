import { ListGroup, ListItem, RowIcon } from "../GroupedList";
import { useMember } from "../CommunityGate";
import { useMinuteClock } from "../food/Timers";
import { useRemote } from "../../hooks/useRemote";
import { tables, tablesKey } from "../../services/social-api";
import { slotLabel } from "../../utils/social-match";
import { useLanguage, useT } from "../../i18n";
import { FaceStack } from "./Face";
import { openSocial } from "./Shared";

/** On a catalogue place: upcoming open tables there, then Start a table here. Members only; hidden when Social is off. */
export function PlaceTables({ placeId }: { placeId: string }) {
  const { member } = useMember(), now = useMinuteClock(), t = useT("social"), language = useLanguage(), key = tablesKey("", { place: placeId });
  const remote = useRemote(member ? key : null, signal => tables(key, signal), 60000), items = remote.data?.items ?? [];
  if (!member || remote.error) return null;
  return <ListGroup title={t("eatHere")}>
    {items.slice(0, 3).map(table => <ListItem key={table.id} title={slotLabel(table.starts, now, language)} subtitle={t("seatsTaken", { held: table.held, size: table.size })}
      leading={<FaceStack people={table.seated} size={26} />} onPress={() => openSocial("/table/" + table.id)} />)}
    <ListItem title={t("startTableHere")} leading={<RowIcon name="restaurant-outline" />} onPress={() => openSocial("/table/new?place=" + placeId)} />
  </ListGroup>;
}
