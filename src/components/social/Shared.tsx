import { router, type Href } from "expo-router";
export { Action, ActionChip, Confirm } from "../Actions";
export const openSocial = (path = "") => router.push(("/social" + path) as Href);
export const goToPlans = () => router.replace({ pathname: "/social", params: { tab: "plans" } });
