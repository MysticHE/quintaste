import { Redirect } from "expo-router";
/** Now a tab of Market; kept so older links still open it. */
export default function Previous() { return <Redirect href="/market?tab=shop" />; }
