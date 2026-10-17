import { router, type Href } from "expo-router";

/** Allowed in-app return paths; server/google/flows.mjs uses the same pattern, so keep both in sync. */
export function safeReturn(value: string | string[] | undefined): Href {
  const path = Array.isArray(value) ? value[0] : value;
  return path && /^\/(?:account|avatar|profile|recovery-codes|saved|social(?:\/profile)?|game|market(?:\/my-shop|\/my-listings|\/(?:listing|shop)\/[A-Za-z0-9_-]+)?|cook(?:\/recipe\/[a-z0-9-]+)?|dish\/[a-z0-9-]+|place\/[a-z0-9-]+(?:\?review=1)?|cases|private-places)?$/.test(path)
    ? path as Href : "/account";
}
export function goBack(fallback: Href = "/") {
  if (router.canGoBack()) router.back(); else router.replace(fallback);
}
