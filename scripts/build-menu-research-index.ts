import { readdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { formatResearchRows, isRecord, readResearchJson, researchCsvCell, validSourceUrl, writeResearchFile } from "./menu-research-files";
import { held } from "./menu-publication/normalize";

type Source = { id: string; url: string };
type Item = { id: string; sourceIds: string[]; publicationStatus?: string; sourceUnavailable?: boolean };
type Menu = { id: string; coverage: string; branchIds: string[]; sourceIds: string[]; items: Item[];
  notice?: string; publicationStatus?: string; validOn?: string; sourceDateNotice?: string };
type Branch = { id: string; name: string; address: string; menuIds: string[]; sourceIds: string[]; gaps: string[] };
type Packet = { file: string; checkedAt: string; sources: Source[]; branches: Branch[]; menus: Menu[] };
type Row = { dataset: string; branchId: string; name: string; address: string; checkedAt: string;
  coverage: string; foodRows: number; menuIds: string[]; menuCoverage: string[]; menuPublication: string[];
  sourceUrls: string[]; gaps: string[] };
const root = resolve("data/menu-research");

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) throw new Error("Invalid " + label);
  return value as string[];
}
function references(value: unknown, label: string): string[] {
  const ids = strings(value, label);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate " + label);
  return ids;
}
function required(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error("Invalid " + label);
  return value;
}
function optionalText(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : required(value, label);
}
function objects(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some(item => !isRecord(item))) throw new Error("Invalid " + label);
  return value as Record<string, unknown>[];
}
function unique<T extends { id: string }>(rows: T[], label: string): T[] {
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Duplicate " + label);
  return rows;
}
function sourcesIn(value: unknown): Source[] {
  return unique(objects(value, "sources").map(source => {
    if (!validSourceUrl(source.url)) throw new Error("Invalid source URL");
    return { id: required(source.id, "source ID"), url: source.url };
  }), "source ID");
}
function rawPacket(file: string, value: Record<string, unknown>): Packet {
  const sources = sourcesIn(value.sources);
  const branches = unique(objects(value.branches, "branches").map(branch => ({
    id: required(branch.id, "branch ID"), name: required(branch.name, "branch name"),
    address: required(branch.address, "branch address"), menuIds: references(branch.menuIds, "branch menu IDs"),
    sourceIds: strings(branch.sourceIds, "branch source IDs"),
    gaps: branch.gaps === undefined ? [] : strings(branch.gaps, "branch gaps"),
  })), "branch ID");
  const menus = unique(objects(value.menus, "menus").map(menu => ({
    id: required(menu.id, "menu ID"), coverage: required(menu.coverage, "menu coverage"),
    branchIds: references(menu.branchIds, "menu branch IDs"),
    sourceIds: strings(menu.sourceIds, "menu source IDs"),
    items: unique(objects(menu.items, "menu items").map(item => ({ id: required(item.id, "food ID"),
      sourceIds: strings(item.sourceIds, "food source IDs"),
      publicationStatus: optionalText(item.publicationStatus, "food publication status"),
      ...(typeof item.sourceUnavailable === "boolean" ? { sourceUnavailable: item.sourceUnavailable } : {}),
    })), "food ID"),
    ...(typeof menu.notice === "string" ? { notice: menu.notice } : {}),
    publicationStatus: optionalText(menu.publicationStatus, "menu publication status"),
    validOn: optionalText(menu.validOn, "menu valid date"),
    sourceDateNotice: optionalText(menu.sourceDateNotice, "menu source date notice"),
  })), "menu ID");
  const checkedAt = required(value.checkedAt, "checked date");
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("Invalid checked date");
  return { file, checkedAt, sources, branches, menus };
}
function publicationDetails(menu: Menu): string | undefined {
  const itemStates = new Map<string, number>();
  for (const item of menu.items) if (item.publicationStatus)
    itemStates.set(item.publicationStatus, (itemStates.get(item.publicationStatus) ?? 0) + 1);
  const unavailable = menu.items.filter(item => item.sourceUnavailable === true).length;
  const details = [
    menu.publicationStatus && "publication: " + menu.publicationStatus,
    menu.validOn && "valid only on: " + menu.validOn,
    menu.sourceDateNotice,
    ...[...itemStates].sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => "food publication " + status + ": " + count),
    unavailable ? "source-unavailable foods: " + unavailable + "/" + menu.items.length : undefined,
  ].filter((text): text is string => typeof text === "string" && text.length > 0);
  return details.length ? menu.id + ": " + details.join("; ") : undefined;
}
function pilotPacket(value: unknown): Packet {
  if (!isRecord(value)) throw new Error("Invalid pilot catalogue");
  const dishes = objects(value.dishes, "pilot dishes");
  const menus = objects(value.menus, "pilot menus").map(menu => ({ ...menu,
    id: required(menu.id, "pilot menu ID"), venueId: required(menu.venueId, "pilot venue ID"),
    branchIds: [required(menu.venueId, "pilot venue ID")], sourceIds: [required(menu.sourceId, "pilot menu source")],
    items: dishes.filter(dish => dish.menuId === menu.id) }));
  const branches = objects(value.venues, "pilot venues").map(venue => ({ ...venue,
    name: [venue.name, venue.branch].filter(Boolean).join(" — "),
    menuIds: menus.filter(menu => menu.venueId === venue.id).map(menu => menu.id) }));
  return rawPacket("data/pilot/catalogue.json", { ...value, branches, menus });
}
async function collect(file: string, visited: Set<string>): Promise<Packet[]> {
  const absolute = resolve(root, file);
  const local = relative(root, absolute);
  if (local.startsWith("..") || isAbsolute(local) || !local.endsWith(".json")) throw new Error("Research shard outside inventory");
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const value = await readResearchJson(absolute);
  if (!isRecord(value)) throw new Error("Invalid research file " + file);
  const packets = Array.isArray(value.branches) && Array.isArray(value.menus)
    ? [rawPacket(relative(resolve(), absolute).replace(/\\/g, "/"), value)] : [];
  if (value.shards !== undefined) for (const shard of strings(value.shards, "shards"))
    packets.push(...await collect(relative(root, resolve(dirname(absolute), shard)), visited));
  return packets;
}
function packetRows(packet: Packet, pilot: Packet): Row[] {
  const localSources = new Map(packet.sources.map(source => [source.id, source.url]));
  const pilotSources = new Map(pilot.sources.map(source => [source.id, source.url]));
  const menus = new Map(packet.menus.map(menu => [menu.id, menu]));
  for (const menu of packet.menus) for (const id of [...menu.sourceIds, ...menu.items.flatMap(item => item.sourceIds)])
    if (!localSources.has(id) && !pilotSources.has(id)) throw new Error(packet.file + ": unknown source " + id);
  return packet.branches.map(branch => {
    const selected = branch.menuIds.map(id => {
      const menu = menus.get(id) ?? pilot.menus.find(item => item.id === id);
      if (!menu) throw new Error(packet.file + ": unresolved menu " + id);
      if (!menu.branchIds.includes(branch.id)) throw new Error(packet.file + ": menu belongs to a different branch " + id);
      return menu;
    });
    const foodRows = selected.reduce((sum, menu) => sum + menu.items.length, 0);
    const sourceIds = [...new Set([...branch.sourceIds, ...selected.flatMap(menu => [...menu.sourceIds, ...menu.items.flatMap(item => item.sourceIds)])])];
    const sourceUrls = sourceIds.map(id => {
      const url = localSources.get(id) ?? pilotSources.get(id);
      if (!url) throw new Error(packet.file + ": unknown branch source " + id);
      return url;
    });
    const coverage = selected.length && selected.every(menu => held(menu.coverage) || held(menu.publicationStatus)) ? "held"
      : selected.length && selected.every(menu => menu.coverage === "source-covered" && !held(menu.publicationStatus)) ? "source-covered"
      : foodRows ? "partial" : selected.length ? "menu-unavailable" : "menu-pending";
    const menuPublication = selected.map(publicationDetails).filter((note): note is string => !!note);
    return { dataset: packet.file, branchId: branch.id, name: branch.name, address: branch.address,
      checkedAt: packet.checkedAt, coverage, foodRows, menuIds: branch.menuIds,
      menuCoverage: selected.map(menu => menu.id + ": " + menu.coverage), menuPublication, sourceUrls: [...new Set(sourceUrls)],
      gaps: [...branch.gaps, ...selected.map(menu => menu.notice).filter((note): note is string => !!note), ...menuPublication] };
  });
}
async function main() {
  const pilot = pilotPacket(await readResearchJson(resolve("data/pilot/catalogue.json")));
  const packets = [pilot];
  const visited = new Set<string>();
  for (const file of (await readdir(root)).filter(name => name.endsWith(".json")).sort()) packets.push(...await collect(file, visited));
  const records = packets.flatMap(packet => packetRows(packet, pilot));
  const menuCount = packets.reduce((sum, packet) => sum + packet.menus.length, 0);
  const sourceFoodRows = packets.reduce((sum, packet) => sum + packet.menus.reduce((count, menu) => count + menu.items.length, 0), 0);
  const counts = Object.fromEntries([...new Set(records.map(row => row.coverage))].map(status => [status, records.filter(row => row.coverage === status).length]));
  const metadata = { version: 1, generatedAt: new Date().toISOString(), complete: false, directoryCount: 2322,
    datasetCount: packets.length, datasets: packets.map(packet => packet.file),
    branchRecords: records.length, sourceMenus: menuCount, sourceFoodRows, counts,
    note: "Research only. Branch records, menu sources and food rows can overlap; these are not unique-location or unique-dish counts. Source-covered means all foods visible in that source, not complete current venue stock. Google ID identity review and publication remain separate." };
  await writeResearchFile(resolve(root, "menu-collection-index.json"), formatResearchRows(metadata, "records", records));
  const keys: (keyof Row)[] = ["dataset", "branchId", "name", "address", "coverage", "foodRows", "menuIds", "menuCoverage", "menuPublication", "checkedAt", "sourceUrls", "gaps"];
  await writeResearchFile(resolve("docs/research/menu-collection-index.csv"), keys.join(",") + "\n" + records.map(row => keys.map(key => researchCsvCell(row[key])).join(",")).join("\n") + "\n");
  const { datasets: _datasets, ...summary } = metadata;
  process.stdout.write(JSON.stringify(summary) + "\n");
}
main().catch(error => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Research index stopped.\n"); process.exitCode = 1; });
