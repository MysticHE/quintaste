import { Redirect } from "expo-router";
/** Kept so older links still open My shop. */
export default function Previous() { return <Redirect href="/market?tab=shop" />; }
