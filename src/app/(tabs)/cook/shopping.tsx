import { Redirect } from "expo-router";
/** The shopping list was removed (owner, 25 Oct 2026); older links open Feeds. */
export default function Previous() { return <Redirect href="/cook" />; }
