import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { hash, held, normalizeSection, rows, strings, text, type Raw } from "./menu-publication/normalize";
import { readMenuCatalogue } from "../src/utils/menu-catalogue";
import { writeResearchFile } from "./menu-research-files";
import { reviewedMenuPlaceIds, type ReviewedMenuIdentity } from "./menu-identity-reviews";

const root = resolve(), manifestPath = resolve("data/menus/research-publication.json");
const read = async (path: string): Promise<Raw> => JSON.parse(await readFile(path, "utf8"));

async function packetFor(dataset: string) {
  const file = resolve(dataset), allowed = resolve("data/menu-research") + sep;
  if (!file.startsWith(allowed) || !file.endsWith(".json")) throw new Error("Research dataset outside approved directory");
  const packet = await read(file);
  if (!Array.isArray(packet.branches) || !Array.isArray(packet.menus) || !Array.isArray(packet.sources))
    throw new Error("Manifest must reference an exact research shard: " + dataset);
  return packet;
}

async function compileEntry(entry: Raw, packets: Map<string, Raw>, approve: boolean,
  identities: ReadonlyMap<string, ReviewedMenuIdentity>) {
  const dataset = text(entry.dataset), branchId = text(entry.branchId);
  const packet = packets.get(dataset) ?? await packetFor(dataset); packets.set(dataset, packet);
  const branches = rows(packet.branches).filter(branch => branch.id === branchId);
  if (branches.length !== 1) throw new Error("Ambiguous or missing research branch: " + branchId);
  const branch = branches[0], menuIds = strings(entry.menuIds), excluded = new Set(strings(entry.excludedItemIds));
  if (!menuIds.length || new Set(menuIds).size !== menuIds.length || held(branch.status) || held(branch.publicationStatus)
    || ["mixed-menu", "supplier", "food-court", "out-of-SG"].includes(text(branch.eligibility)))
    throw new Error("Invalid or out-of-scope branch review: " + branchId);
  const menus = menuIds.map(id => {
    const menu = rows(packet.menus).find(menu => menu.id === id);
    if (!menu || !strings(branch.menuIds).includes(id) || !strings(menu.branchIds).includes(branchId)
      || held(menu.publicationStatus) || held(menu.coverage) || menu.held === true)
      throw new Error("Unapproved or held source menu: " + id);
    return menu;
  });
  const { fingerprint: _fingerprint, ...review } = entry;
  const identity = identities.get(JSON.stringify([dataset, branchId]));
  const googlePlaceId = identity?.placeId ?? null;
  if ((entry.googlePlaceId ?? null) !== googlePlaceId && !approve)
    throw new Error("Reviewed place identity changed; explicit publication review required: " + branchId);
  review.googlePlaceId = googlePlaceId;
  review.identityFingerprint = identity?.fingerprint ?? null;
  const fingerprint = hash({ packet, review });
  if (!approve && entry.fingerprint !== fingerprint) throw new Error("Source changed; explicit review required: " + branchId);
  const sections = menus.map(menu => normalizeSection(menu, rows(packet.sources), excluded, text(packet.checkedAt)))
    .filter(section => section.items.length);
  const parts = text(branch.name).split(/\s*(?:[—–]|@)\s*/);
  const menu = { id: "research-" + branchId, name: text(entry.name) || parts[0], branch: parts.slice(1).join(" · ") || text(branch.address),
    address: text(branch.address), postalCode: text(branch.postalCode) || text(branch.address).match(/\b\d{6}\b/)?.[0] || "",
    aliases: strings(entry.aliases), googlePlaceId, sections };
  let validated;
  try { validated = readMenuCatalogue({ version: 1, generatedAt: Date.now(), venues: [menu] }).venues[0]; }
  catch (error) { throw new Error(branchId + ": " + (error instanceof Error ? error.message : "invalid menu")); }
  if (Buffer.byteLength(JSON.stringify(validated)) > 1_900_000) throw new Error("Branch needs source pagination: " + branchId);
  return { review: { ...review, fingerprint }, compiled: { dataset, branchId, fingerprint, menu: validated } };
}

async function main() {
  const action = process.argv[2];
  if (!["--approve-reviewed", "--check"].includes(action)) throw new Error("Use --check or explicit --approve-reviewed after source review");
  const manifest = await read(manifestPath), entries = rows(manifest.entries), packets = new Map<string, Raw>();
  if (manifest.version !== 1 || !Number.isFinite(Date.parse(text(manifest.reviewedAt)))) throw new Error("Review metadata missing");
  const built = [];
  const identities = await reviewedMenuPlaceIds(resolve("data/menu-research"));
  for (const entry of entries) built.push(await compileEntry(entry, packets, action === "--approve-reviewed", identities));
  const ids = built.map(row => row.compiled.menu.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate branch publication");
  const compiled = { version: 1, entries: built.map(row => row.compiled) };
  const dataPath = resolve("data/menus/published-research.json");
  const datasets = [...packets.keys()];
  const registry = datasets.map((dataset, index) => "import packet" + index + " from "
    + JSON.stringify("../../" + dataset.replace(/\\/g, "/")) + ";").join("\n")
    + "\n\nexport const researchMenuPackets: Record<string, unknown> = {\n"
    + datasets.map((dataset, index) => "  " + JSON.stringify(dataset) + ": packet" + index + ",").join("\n") + "\n};\n";
  if (action === "--approve-reviewed") {
    await mkdir(dirname(dataPath), { recursive: true });
    await writeResearchFile(manifestPath, JSON.stringify({ ...manifest, entries: built.map(row => row.review) }, null, 2) + "\n");
    await writeResearchFile(dataPath, '{"version":1,"entries":[\n' + compiled.entries.map(row => JSON.stringify(row)).join(",\n") + "\n]}\n");
    await writeFile(resolve("src/server/research-menu-packets.ts"), registry, "utf8");
  } else {
    if (JSON.stringify(await read(dataPath)) !== JSON.stringify(compiled)
      || await readFile(resolve("src/server/research-menu-packets.ts"), "utf8") !== registry)
      throw new Error("Published research needs regeneration after explicit review");
  }
  process.stdout.write(JSON.stringify({ action, branches: built.length,
    sourceMenus: built.reduce((n, row) => n + row.compiled.menu.sections.length, 0),
    foodRows: built.reduce((n, row) => n + row.compiled.menu.sections.reduce((n, section) => n + section.items.length, 0), 0),
    bytes: Buffer.byteLength(JSON.stringify(compiled)), output: relative(root, dataPath) }) + "\n");
}
main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Menu sync failed") + "\n"); process.exitCode = 1; });
