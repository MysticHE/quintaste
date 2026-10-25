import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Button, Icon, T, common } from "../ui";
import { EmptyState } from "../food/Controls";
import { RemoteStatus } from "../CommunityGate";
import { DateTile, StatusPill } from "../GroupedList";
import { Avatar } from "./SocialPhoto";
import { ProfileSection } from "./ProfileControls";
import { useDinnerStatus, usePayText } from "./DinnerParts";
import { useRemote } from "../../hooks/useRemote";
import { useReminderSync } from "../../hooks/useReminderSync";
import { dinners } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useLanguage, useT } from "../../i18n";
import { formatSgShort, sgDateTile } from "../../utils/sg-datetime";
import type { Dinner } from "../../types/community";

export function DinnerSummary({ dinner: d, compact = false }: { dinner: Dinner; compact?: boolean }) {
  const { theme } = usePreferences(), t = useT("profile"), language = useLanguage(), tile = sgDateTile(d.starts, language), [status, tone] = useDinnerStatus()(d), pay = usePayText()(d);
  return <Pressable accessibilityRole="button" accessibilityLabel={[t("dinnerWith", { name: d.withName }), formatSgShort(d.starts, language), d.placeName, status, pay].join(", ")}
    onPress={() => router.push({ pathname: "/social/dinner/[id]", params: { id: d.id } })} style={({ pressed }) => ({ backgroundColor: pressed ? theme.accentSoft : theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: compact ? 12 : 16, gap: 12 })}>
    <View style={[common.row, { gap: 12, alignItems: "flex-start" }]}>
      {!compact && tile && <DateTile day={tile.day} month={tile.month} />}
      <View style={[common.flex, { gap: 6 }]}><View style={[common.row, { gap: 8, flexWrap: "wrap" }]}><Avatar uri={d.photo} name={d.withName} size={30} /><T style={[common.bold, common.flex]}>{t("dinnerWith", { name: d.withName })}</T></View>
        <StatusPill label={status} tone={tone} /><T variant="small">{formatSgShort(d.starts, language)}</T>
        <View style={[common.row, { gap: 5 }]}><Icon name="location-outline" size={16} /><T variant="small" style={common.flex}>{d.placeName}</T></View>
        <T variant="small" muted>{pay}</T>
      </View>
    </View><View style={[common.row, { borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: 10, justifyContent: "space-between" }]}><T variant="button" color={theme.accent}>{t(d.status === "invited" && d.yourTurn ? "viewInvite" : "openDinner")}</T><Icon name="chevron-forward" size={18} color={theme.accent} /></View>
  </Pressable>;
}
export function DiningOverview() {
  const t = useT("profile"), remote = useRemote("/api/social/dinners", dinners, 30000), data = remote.data;
  useReminderSync(data ? [...data.upcoming, ...data.past] : undefined, true);
  const next = data?.upcoming.filter(d => d.status === "accepted" && !d.past).sort((a, b) => a.starts.localeCompare(b.starts))[0];
  const invitations = data?.upcoming.filter(d => d.status === "invited") ?? [];
  const all = () => router.push("/social/community?tab=dinners");
  return <>
    <View style={[common.row, { gap: 8 }]}><View style={common.flex}><Button label={t("findPeople")} icon="person-add-outline" variant="secondary" onPress={() => router.push("/social/community?tab=people")} /></View>
      <View style={common.flex}><Button label={t("friends")} icon="people-outline" variant="secondary" onPress={() => router.push("/social/friends")} /></View></View>
    <RemoteStatus remote={remote} icon="restaurant-outline" returnTo="/social?tab=dining" />
    <ProfileSection title={t("comingUp")} action={t("viewAll")} onPress={all} />
    {next ? <DinnerSummary dinner={next} /> : data && <EmptyState title={t("noDinner")} text={t("noDinnerText")} icon="restaurant-outline" />}
    <Button label={t("invite")} icon="person-add-outline" onPress={() => router.push("/social/friends")} />
    {!!invitations.length && <><ProfileSection title={t("invitations")} action={t("viewAll")} onPress={all} />{invitations.slice(0, 2).map(d => <DinnerSummary key={d.id} dinner={d} compact />)}</>}
    <Button label={t("past")} icon="time-outline" variant="secondary" onPress={all} />
  </>;
}
