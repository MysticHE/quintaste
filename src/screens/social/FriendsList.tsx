import { Screen } from "../../components/Screen";
import { T } from "../../components/ui";
import { IconButton } from "../../components/food/Controls";
import { FirstRunState } from "../../components/BrowseControls";
import { RemoteStatus, useMember } from "../../components/CommunityGate";
import { MemberGate } from "../../components/social/SocialState";
import { PersonRow } from "../../components/social/PersonRow";
import { openSocial } from "../../components/social/Shared";
import { useRemote } from "../../hooks/useRemote";
import { friends as loadFriends } from "../../services/social-api";
import { useT } from "../../i18n";
import type { Friend } from "../../types/community";

/** Your friends, opened from the Friends count on the profile. Chats with them are in Messages > Friends. */
export function FriendsListScreen() {
  const t = useT("profile"), { member } = useMember();
  const remote = useRemote(member ? "/api/social/friends" : null, loadFriends, 30000), list = remote.data?.friends ?? [];
  return <Screen title={t("friends")} backTo="/social"
    headerAction={<IconButton appearance="plain" icon="person-add-outline" label={t("addFriend")} onPress={() => openSocial("/add-friend")} />}>
    <MemberGate returnTo="/social/friends">
      <RemoteStatus remote={remote} icon="people-outline" returnTo="/social/friends" />
      {list.map(f => <FriendRow key={f.id} friend={f} />)}
      {remote.data && !list.length && <FirstRunState icon="people-outline" title={t("noFriends")} text={t("noFriendsText")}
        action={{ label: t("addFriend"), icon: "person-add-outline", onPress: () => openSocial("/add-friend") }} />}
    </MemberGate>
  </Screen>;
}
function FriendRow({ friend: f }: { friend: Friend }) {
  const t = useT("profile"), line = [f.handle ? "@" + f.handle : "", f.area].filter(Boolean).join(" · ");
  return <PersonRow id={f.id} name={f.firstName} photo={f.photo} verified={f.verified} spoken={line} border={f.border}
    line={!!line && <T variant="small" muted numberOfLines={1}>{line}</T>}
    trailing={<IconButton appearance="plain" icon="chatbubble-outline" label={t("chatWith", { name: f.firstName })} onPress={() => openSocial("/chat/" + f.id)} />} />;
}
