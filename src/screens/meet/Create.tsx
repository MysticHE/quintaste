import { Screen } from "../../components/Screen";
import { openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
export function MeetCreateScreen() {
  return <Screen title="Create" backTo="/social"><MemberGate><ListGroup>
    <ListItem title="Gathering" leading={<RowIcon name="people-outline" />} onPress={() => openSocial("/gathering/new")} />
    <ListItem title="Cooking Class" leading={<RowIcon name="school-outline" />} onPress={() => openSocial("/application/new?kind=class")} />
    <ListItem title="Home Dining" leading={<RowIcon name="home-outline" />} onPress={() => openSocial("/application/new?kind=home")} />
  </ListGroup></MemberGate></Screen>;
}
