import { createContext, useContext, type PropsWithChildren } from "react";
import { useMember } from "../CommunityGate";
import { useRemote } from "../../hooks/useRemote";
import { unread } from "../../services/market-api";

type Counts = { count: number; messages: number; orders: number };
const Context = createContext<Counts | undefined>(undefined);
/** One poll of new Market orders and unread messages for the tab bar and the Market screen. */
export function MarketUnreadProvider({ children }: PropsWithChildren) {
  const { member } = useMember();
  return <Context.Provider value={useRemote(member ? "/api/market/unread" : null, unread, 30000).data}>{children}</Context.Provider>;
}
export const useMarketUnread = () => useContext(Context);
