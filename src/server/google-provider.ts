export const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export const placeIdValid = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(value);
export function placesKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key || !/^AIza[A-Za-z0-9_-]{30,60}$/.test(key)) throw new Error("Missing private Places configuration.");
  return key;
}
export function safeHttps(value: unknown) {
  if (typeof value !== "string" || value.length > 3000) return;
  try { const url = new URL(value.startsWith("//") ? "https:" + value : value); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return; }
}
