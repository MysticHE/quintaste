import { Platform } from "react-native";
import { apiUrl } from "../utils/api-url";
import { sessionHeaders } from "./community-api";

type OwnedReadPath = "/api/catalogue" | "/api/menus" | `/api/menus?${string}` | "/api/location-search" | "/api/dish-search" | `/api/editorial/${string}`;
// Native fetch does not use BetterAuth's SecureStore cookies automatically.
// Resolve the current cookie per request; never cache a principal or attach it to photo/provider URLs.
export async function ownedApiRequest(path: OwnedReadPath, options: RequestInit = {}): Promise<Response> {
  if (options.signal?.aborted) throw new Error("Request cancelled.");
  const headers = new Headers(options.headers);
  const session = await sessionHeaders();
  if (options.signal?.aborted) throw new Error("Request cancelled.");
  for (const [name, value] of Object.entries(session)) headers.set(name, value);
  return fetch(apiUrl(path), { ...options, headers, credentials: Platform.OS === "web" ? "same-origin" : "omit" });
}
