import { useMember } from "../components/CommunityGate";
import { useSocialMe } from "../components/social/SocialState";
import { friends as loadFriends } from "../services/social-api";
import { conversations } from "../services/market-api";
import { classConversations } from "../services/classes-api";
import { useRemote } from "./useRemote";

/** Each source keeps its own access gate, error and read state. A failed source
 * cannot hide conversations from the others. useRemote is account-epoch scoped. Friend chats are for every member. */
export function useMessages() {
  const { member } = useMember(), me = useSocialMe();
  const allowed = !!member;
  const friends = useRemote(member && allowed ? "/api/social/friends" : null, loadFriends, 30000);
  const market = useRemote(member ? "/api/market/conversations" : null, conversations, 30000);
  const classes = useRemote(member ? "/api/market/class-conversations" : null, classConversations, 30000);
  return { friends, market, classes, me, allowed };
}
