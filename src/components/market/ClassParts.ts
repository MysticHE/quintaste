import { useCallback } from "react";
import { router, type Href } from "expo-router";
import { ApiError } from "../../services/community-api";
import { invalidate } from "../../hooks/useRemote";
import { useT } from "../../i18n";
import type { MarketKey } from "../../i18n/en/market";

/** Opens a Market screen, such as "/class/<id>" or "/teaching". */
export const openMarket = (path: string) => router.push(("/market" + path) as Href);
/** Reloads every class list and page shown (Events, a class, My Cooking Classes). */
export const refreshClasses = () => invalidate("/api/market/classes", "/api/market/me/classes", "/api/market/teaching");
/** A failed class or teaching request in the member's language when the server sent a known code, otherwise its own message. */
export function useClassError() {
  const t = useT("market");
  return useCallback((error: unknown) => error instanceof ApiError
    ? error.code === "SOCIAL_NOT_TEACHER" ? t("notTeacher") : error.message : t("classActionFailed"), [t]);
}
const classKeys: Record<string, [MarketKey, MarketKey]> = {
  joined: ["classJoinedMember", "classJoinedTeacher"], left: ["classLeftMember", "classLeftTeacher"], removed: ["classRemovedMember", "classRemovedTeacher"],
  cancelled: ["classCancelledMember", "classCancelledTeacher"], changed: ["classChangedMember", "classChangedTeacher"] };
/** Class chat event lines (stored as keys), worded for the member or for the teacher (`name` is the member). */
export function useClassLineText() {
  const t = useT("market");
  return (line: { kind: string; body: string }, teaching: boolean, name: string) => {
    if (line.kind === "text") return line.body;
    const keys = classKeys[line.body];
    return keys ? t(keys[teaching ? 1 : 0], { name }) : line.body;
  };
}
