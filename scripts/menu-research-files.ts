import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { MenuLead, MenuMatch } from "./menu-research-types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function researchCsvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return '"' + (/^[\t\r\n]|^[\s\uFEFF]*[=+\-@＝＋－＠]/u.test(text) ? "'" : "") + text.replace(/"/g, '""') + '"';
}
export const validPlaceId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(value);
export const validSourceUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 4096) return false;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
};
export type MenuLeadFile = { leads: MenuLead[]; sources: { id: string; url: string }[] };
export function readMenuLeads(value: unknown): MenuLeadFile {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.leads) || value.leads.length > 10000 || !Array.isArray(value.sources))
    throw new Error("Expected an independently sourced menu lead file.");
  const ids = new Set<string>(), sources = new Set<string>();
  for (const source of value.sources) {
    if (!isRecord(source) || typeof source.id !== "string" || !source.id || sources.has(source.id) || !validSourceUrl(source.url))
      throw new Error("Invalid or duplicate lead source.");
    sources.add(source.id);
  }
  for (const lead of value.leads) {
    if (!isRecord(lead) || typeof lead.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,160}$/.test(lead.id) || ids.has(lead.id)
      || typeof lead.name !== "string" || !lead.name.trim() || lead.name.length > 200 || /[\u0000-\u001f\u007f]/.test(lead.name)
      || (lead.address !== undefined && (typeof lead.address !== "string" || !lead.address.trim() || lead.address.length > 500 || /[\u0000-\u001f\u007f]/.test(lead.address)))
      || !["lead", "merchant-confirmed"].includes(String(lead.status)) || typeof lead.status !== "string"
      || !Array.isArray(lead.sourceIds) || !lead.sourceIds.length || lead.sourceIds.some(id => !sources.has(id))
      || (lead.placeId !== undefined && (!validPlaceId(lead.placeId) || !validSourceUrl(lead.placeIdEvidenceUrl))))
      throw new Error("Lead needs a unique ID, sourced name and valid address/reference fields.");
    ids.add(lead.id);
  }
  return value as unknown as MenuLeadFile;
}
export function menuLeadQuery(lead: MenuLead) { return (lead.name + " " + (lead.address ?? "")).trim(); }
export function readMenuMatches(value: unknown, directoryIds: Set<string>): MenuMatch[] {
  if (!isRecord(value) || value.version !== 1 || value.fieldMask !== "places.id,nextPageToken" || !Array.isArray(value.matches))
    throw new Error("Invalid ID-only match receipt file.");
  const seen = new Set<string>();
  for (const match of value.matches) {
    if (!isRecord(match) || typeof match.leadId !== "string" || typeof match.query !== "string" || !match.query.trim()
      || match.fieldMask !== value.fieldMask || typeof match.queriedAt !== "string" || !Number.isFinite(Date.parse(match.queriedAt))
      || !Array.isArray(match.resultIds) || match.resultIds.length > 20 || !match.resultIds.every(validPlaceId)
      || new Set(match.resultIds).size !== match.resultIds.length || !Array.isArray(match.directoryIds)
      || JSON.stringify(match.directoryIds) !== JSON.stringify(match.resultIds.filter(id => directoryIds.has(id)))
      || !["no-match", "candidate", "ambiguous"].includes(String(match.status)) || typeof match.status !== "string"
      || (match.status === "candidate" && (match.resultIds.length !== 1 || match.directoryIds.length !== 1))
      || (match.status === "no-match" && match.directoryIds.length !== 0)) throw new Error("Invalid ID-only match receipt.");
    const key = JSON.stringify([match.leadId, match.query]);
    if (seen.has(key)) throw new Error("Duplicate ID-only match receipt.");
    seen.add(key);
  }
  return value.matches as MenuMatch[];
}
export async function readResearchJson(path: string, optional = false): Promise<unknown> {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) {
    if (optional && (error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw new Error("Cannot read research JSON: " + path);
  }
}
export async function writeResearchFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, content, { flag: "wx" });
    for (let attempt = 0; ; attempt += 1) {
      try { await rename(temporary, path); break; }
      catch (error) {
        if (attempt >= 7 || !["EPERM", "EACCES", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
        await delay(Math.min(50 * 2 ** attempt, 1000));
      }
    }
  }
  finally { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
}
export function formatResearchRows(meta: Record<string, unknown>, key: string, rows: unknown[]) {
  if (Object.values(meta).some(value => value === undefined) || rows.some(row => row === undefined))
    throw new Error("Research output contains undefined values; existing files preserved.");
  return ["{", ...Object.entries(meta).map(([name, value]) => "  " + JSON.stringify(name) + ": " + JSON.stringify(value) + ","),
    "  " + JSON.stringify(key) + ": [",
    ...rows.map((row, index) => "    " + JSON.stringify(row) + (index < rows.length - 1 ? "," : "")), "  ]", "}", ""].join("\n");
}
