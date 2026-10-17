import type { LocalOwner } from "../types/explore-local";
export const localSessionHeaders = async (_owner: LocalOwner): Promise<Record<string, string>> => ({});
export async function saveLocalSession(_owner: LocalOwner, _body: unknown) {}
export async function clearLocalSession(_owner: LocalOwner) {}
