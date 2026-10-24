import { Redirect } from "expo-router";
/** Market chats are now in Messages; older links open its Market filter. */
export default function MarketInbox() { return <Redirect href={{ pathname: "/messages", params: { kind: "market" } }} />; }
