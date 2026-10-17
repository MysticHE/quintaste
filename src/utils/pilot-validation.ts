export function pilotObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid catalogue record");
  return value as Record<string, unknown>;
}
export function pilotText(value: unknown, maximum = 300, empty = false) {
  if (typeof value !== "string" || value.length > maximum || !empty && !value.trim()
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new Error("Invalid catalogue text");
  return value.trim();
}
export function pilotChoice<const T extends readonly string[]>(value: unknown, choices: T): T[number] {
  if (typeof value !== "string" || !choices.includes(value)) throw new Error("Invalid catalogue choice");
  return value as T[number];
}
export function pilotId(value: unknown) {
  const id = pilotText(value, 120); if (!/^[a-z0-9][a-z0-9-]{2,119}$/.test(id)) throw new Error("Invalid catalogue identity");
  return id;
}
export function pilotList<T>(value: unknown, read: (value: unknown) => T, maximum = 100) {
  if (!Array.isArray(value) || value.length > maximum) throw new Error("Invalid catalogue list");
  return value.map(read);
}
export function pilotIds(value: unknown) {
  const ids = pilotList(value, pilotId, 30);
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error("Invalid catalogue references");
  return ids;
}
export function pilotDate(value: unknown) {
  const text = pilotText(value, 40), time = Date.parse(text);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text) || !Number.isFinite(time)
    || new Date(time).toISOString().slice(0, 10) !== text.slice(0, 10) || time > Date.now() + 30000)
    throw new Error("Invalid catalogue date");
  return text;
}
export function pilotCalendarDate(value: unknown) {
  if (value === null) return null;
  const text = pilotText(value, 10), time = Date.parse(text);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== text
    || text > new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)) throw new Error("Invalid menu date");
  return text;
}
export function pilotUrl(value: unknown) {
  const url = new URL(pilotText(value, 2000)), host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || !host.includes(".") || host.includes(":")
    || /^\d+\./.test(host) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host))
    throw new Error("Invalid public source URL");
  return url.href;
}
export function pilotAmount(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10000) throw new Error("Invalid catalogue amount");
  return value;
}
export function pilotUnique<T extends { id: string }>(values: T[]) {
  if (new Set(values.map(item => item.id)).size !== values.length) throw new Error("Duplicate catalogue identity");
  return values;
}
