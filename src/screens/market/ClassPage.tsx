import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, T, common } from "../../components/ui";
import { DateTile, Initial, ListGroup, ListItem, RowIcon, StatusPill } from "../../components/GroupedList";
import { DietLabels } from "../../components/food/DietLabels";
import { IconButton } from "../../components/food/Controls";
import { goBack } from "../../utils/navigation";
import { useMinuteClock } from "../../components/food/Timers";
import { Action, Confirm } from "../../components/Actions";
import { RemoteStatus, ensureMember, useMember } from "../../components/CommunityGate";
import { openMarket, refreshClasses } from "../../components/market/ClassParts";
import { money } from "../../utils/food-format";
import { useRemote } from "../../hooks/useRemote";
import { cancelClass, cookingClass, deleteClass, joinClass } from "../../services/classes-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { formatSgText, sgDateTile } from "../../utils/sg-datetime";
import type { CookingClass } from "../../types/community";

function ClassView({ c, refresh }: { c: CookingClass; refresh: () => void }) {
  const t = useT("market"), { setNotice } = usePreferences(), language = useLanguage(), tile = sgDateTile(c.starts, language), end = sgDateTile(c.ends, language)?.time;
  const now = useMinuteClock(), left = c.seats - c.taken, past = Date.parse(c.starts.replace(" ", "T") + ":00+08:00") < now, cancelled = c.status === "cancelled";
  const changed = () => { refreshClasses(); refresh(); };
  // Guests can read a class like any Market item; joining and asking the teacher need a member (sign in, then back here).
  const member = useMember(), signedIn = () => ensureMember(member, "/market/class/" + c.id);
  return <>
    <View style={[common.row, { gap: 12, alignItems: "center" }]}>
      {tile && <DateTile day={tile.day} month={tile.month} />}
      <View style={[common.flex, { gap: 4 }]}><T variant="title" style={common.bold}>{c.title}</T>
        <View style={[common.row, { gap: 6, flexWrap: "wrap" }]}><StatusPill label={t("classTag")} tone="accent" />
          {c.status === "draft" && <StatusPill label={t("classStatusDraft")} />}{cancelled && <StatusPill label={t("classStatusCancelled")} tone="warning" />}</View></View>
    </View>
    {c.diets.length > 0 && <View style={[common.row, { gap: 6, flexWrap: "wrap" }]}><DietLabels labels={c.diets} /><StatusPill label={t("sellerDeclared")} /></View>}
    {cancelled && <T style={common.bold}>{t("classCancelledNote")}</T>}
    <ListGroup>
      <ListItem title={formatSgText(c.starts, language) + (end ? " – " + end : "")} subtitle={t("when")} leading={<RowIcon name="time-outline" />} />
      <ListItem title={c.venue} subtitle={c.area || t("classVenue")} wrap leading={<RowIcon name="location-outline" />} />
      <ListItem title={c.priceCents ? money(c.priceCents / 100, language) : t("freeTag")} subtitle={c.priceCents ? t("payTeacher") : undefined} wrap leading={<RowIcon name="wallet-outline" />} />
      <ListItem title={left > 0 ? t("seatsOf", { left, seats: c.seats }) : t("classFull")} leading={<RowIcon name="people-outline" />} />
    </ListGroup>
    {!!c.makes && <ListGroup title={t("youllMake")}><ListItem title={c.makes} wrap /></ListGroup>}
    <ListGroup title={t("teacherLabel")}><ListItem title={c.teacher.name} subtitle={t("approvedTeacher") + (c.teacher.classes ? " · " + t("classesCount", { n: c.teacher.classes }) : "")}
      leading={<Initial name={c.teacher.name} size={44} />} /></ListGroup>
    {c.hosting ? <View style={{ gap: 8 }}>
      {!cancelled && !past && <Button label={t("editClass")} icon="create-outline" variant="secondary" onPress={() => openMarket("/class-edit?id=" + c.id)} />}
      {c.status !== "draft" && <Button label={t("classPeople")} icon="people-outline" variant="secondary" onPress={() => openMarket("/class-people/" + c.id)} />}
      {c.status === "draft" ? <Confirm link label={t("deleteDraft")} text={t("deleteDraftTitle")} action={t("deleteDraft")}
        run={async () => { await deleteClass(c.id); setNotice({ text: t("classDeleted") }); refreshClasses(); router.back(); return true; }} />
        : !cancelled && !past && <Confirm link label={t("cancelClass")} text={t("cancelClassText")} action={t("cancelClass")}
          run={async () => { await cancelClass(c.id); setNotice({ text: t("classCancelled") }); changed(); return true; }} />}
    </View> : !cancelled && !past && <View style={{ gap: 8 }}>
      {c.joined && <View style={{ alignSelf: "flex-start" }}><StatusPill label={t("classJoined")} tone="success" /></View>}
      <View style={[common.row, { gap: 8, flexWrap: "wrap" }]}>
        {!c.joined && <View style={{ flexGrow: 1, flexBasis: 140 }}><Action label={t("joinClass")} icon="add-circle-outline" disabled={left <= 0} run={async () => { if (signedIn()) { await joinClass(c.id, true); changed(); } }} /></View>}
        <View style={{ flexGrow: 1, flexBasis: 140 }}><Button label={t("askTeacher")} icon="chatbubble-outline" variant="secondary" onPress={() => { if (signedIn()) openMarket("/class-chat/" + c.id); }} /></View>
      </View>
      {c.joined && <Confirm link label={t("leaveClass")} text={t("leaveClassText")} action={t("leaveClass")} run={async () => { await joinClass(c.id, false); changed(); return true; }} />}
    </View>}
  </>;
}
/** A cooking class: when, where, price (paid to the teacher directly), seats, and Join Class. Guests can read it. */
export function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(), t = useT("market"), tc = useT("common"), remote = useRemote(id ? "/api/market/classes/" + id : null, signal => cookingClass(id, signal));
  return <Screen title={t("classTag")} header={<View style={common.row}><IconButton appearance="plain" label={tc("goBack")} icon="chevron-back" onPress={() => goBack("/cook?tab=events")} /></View>}>
    <RemoteStatus remote={remote} icon="school-outline" returnTo={"/market/class/" + id} missing={t("classUnavailable")} />
    {remote.data && <ClassView c={remote.data} refresh={remote.refresh} />}
  </Screen>;
}
