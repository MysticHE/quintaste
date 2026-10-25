import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Icon, T, common } from "../ui";
import { ProfilePicture } from "./ProfilePicture";
import { usePostCount } from "./ProfileGrid";
import { useDietText } from "../food/DietLabels";
import { useRemote } from "../../hooks/useRemote";
import { dinners as loadDinners, friends as loadFriends } from "../../services/social-api";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";
import type { SocialMe } from "../../types/community";

export type Stat = { label: string; n: number | null; onPress?: () => void };
/** Picture on the left; counts, then the area and diet line, beside it. Shared by the member's own profile and other members' pages. */
export function SummaryLayout({ picture, stats, children }: { picture: ReactNode; stats: Stat[]; children?: ReactNode }) {
  return <View style={[common.row, { gap: 18, paddingTop: 4 }]}>
    {picture}
    <View style={[common.flex, { gap: 8, minWidth: 0 }]}>
      <View style={[common.row, { gap: 18, flexWrap: "wrap" }]}>{stats.map(s => <StatButton key={s.label} stat={s} />)}</View>
      {children}
    </View>
  </View>;
}
/** Location pin, then the parts given (area, distance), then the diet labels in green, wrapping as one line of text. Nothing when every part is empty. */
export function AreaLine({ parts, diets }: { parts: string[]; diets: string }) {
  const { theme } = usePreferences(), shown = parts.filter(Boolean).join(" · ");
  if (!shown && !diets) return null;
  return <View style={[common.row, { gap: 4, alignItems: "flex-start" }]}>
    <View style={{ marginTop: 2 }}><Icon name="location-outline" size={14} color={theme.mutedForeground} /></View>
    <T variant="small" muted style={[common.flex, { minWidth: 0 }]}>{shown}{!!shown && !!diets && " ·\u00a0"}
      {!!diets && <T variant="small" color={theme.success} style={common.bold}>{diets}</T>}</T>
  </View>;
}
/** Photo with the pencil, Friends · Posts · Dinners beside it, area and diet under the counts, then bio and hobbies. */
export function ProfileSummary({ data, onEdit, onPosts }: { data: SocialMe | undefined; onEdit: () => void; onPosts: () => void }) {
  const t = useT("profile"), diet = useDietText(), canMeet = !!data?.standing.canMeet;
  const friends = useRemote(data ? "/api/social/friends" : null, loadFriends, 30000).data;
  const dinners = useRemote(canMeet ? "/api/social/dinners" : null, loadDinners, 30000).data, posts = usePostCount();
  // Everyone has friends and posts; Dinners only for members who can use Dining (21 to 45, photo checked).
  const stats: Stat[] = [
    { label: t("friends"), n: friends?.friends.length ?? null, onPress: () => router.push("/social/friends") },
    { label: t("statPosts"), n: posts, onPress: onPosts },
    ...(canMeet ? [{ label: t("statDinners"), n: dinners?.met ?? null, onPress: () => router.push("/social/community?tab=dinners") }] : []),
  ];
  const area = data?.profile.area ?? "", diets = area ? (data?.profile.diets ?? []).map(diet.name).join(" · ") : "";
  return <>
    <SummaryLayout stats={stats} picture={<View><ProfilePicture data={data} size={88} /><EditBadge label={t("edit")} onPress={onEdit} /></View>}>
      {!!area && <AreaLine parts={[area]} diets={diets} />}
    </SummaryLayout>
    <AboutRow data={data} onEdit={onEdit} />
  </>;
}
/** A count over its label; it opens its list when it has one (another member's counts only inform). */
function StatButton({ stat: s }: { stat: Stat }) {
  const t = useT("profile"), { theme } = usePreferences(), label = s.n === null ? s.label : t("statLine", { n: s.n, label: s.label });
  const body = <><T variant="subtitle" style={common.bold}>{s.n === null ? "–" : s.n}</T><T variant="small" color={theme.mutedForeground}>{s.label}</T></>;
  if (!s.onPress) return <View accessible accessibilityLabel={label} style={{ minHeight: 44, justifyContent: "center" }}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={s.onPress} hitSlop={8}
    style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>{body}</Pressable>;
}
/** Bio and hobbies when filled; otherwise one tap target: "Add bio · My hobbies are…". Both open About me. */
function AboutRow({ data, onEdit }: { data: SocialMe | undefined; onEdit: () => void }) {
  const t = useT("profile"), ts = useT("social"), { theme } = usePreferences();
  const bio = data?.profile.about || "", hobbies = (data?.profile.hobbies ?? []).map(value => ts("optHobby", { value }));
  // Every member can edit About me (owner, 25 Oct 2026); before the profile has loaded the pencil's screen is the fallback.
  const open = () => data ? router.push("/social/edit?section=about") : onEdit();
  if (bio || hobbies.length) return <Pressable accessibilityRole="button" accessibilityLabel={[bio, hobbies.join(", ")].filter(Boolean).join(". ")} onPress={open}
    style={({ pressed }) => ({ gap: 4, paddingVertical: 4, opacity: pressed ? 0.7 : 1 })}>
    {!!bio && <T variant="small" numberOfLines={3}>{bio}</T>}
    {!!hobbies.length && <View style={[common.row, { gap: 4 }]}><Icon name="heart-outline" size={14} color={theme.accent} /><T variant="small" muted numberOfLines={1} style={common.flex}>{hobbies.join(" · ")}</T></View>}
  </Pressable>;
  return <Pressable accessibilityRole="button" accessibilityLabel={t("addBio") + ", " + t("myHobbies")} onPress={open}
    style={({ pressed }) => [common.row, { alignSelf: "flex-start", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? theme.accentSoft : theme.muted }]}>
    <Icon name="add" size={16} color={theme.foreground} /><T variant="small" style={common.bold}>{t("addBio")}</T>
    <T variant="small" muted>·</T><Icon name="heart-outline" size={14} color={theme.accent} /><T variant="small" muted>{t("myHobbies")}</T>
  </Pressable>;
}
/** The small round pencil on the photo's lower right edge; the hit area stays 48 points. */
function EditBadge({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme } = usePreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10}
    style={({ pressed }) => [{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, borderWidth: 2,
      alignItems: "center", justifyContent: "center", backgroundColor: theme.card, borderColor: theme.background, opacity: pressed ? 0.75 : 1 }]}>
    <Icon name="pencil" size={15} color={theme.foreground} />
  </Pressable>;
}
