import { Screen } from "../../components/Screen";
import { openSocial } from "../../components/social/Shared";
import { MemberGate } from "../../components/social/MeetUI";
import { ListGroup, ListItem, RowIcon } from "../../components/GroupedList";
import { useT } from "../../i18n";
export function MeetCreateScreen() {
  const t = useT("social");
  return <Screen title={t("create")} backTo="/social"><MemberGate><ListGroup>
    <ListItem title={t("gathering")} leading={<RowIcon name="people-outline" />} onPress={() => openSocial("/gathering/new")} />
    <ListItem title={t("cookingClass")} leading={<RowIcon name="school-outline" />} onPress={() => openSocial("/application/new?kind=class")} />
    <ListItem title={t("homeDining")} leading={<RowIcon name="home-outline" />} onPress={() => openSocial("/application/new?kind=home")} />
  </ListGroup></MemberGate></Screen>;
}
