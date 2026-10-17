import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { hash, held, publicId, rows, strings, text, type Raw } from "./menu-publication/normalize";
import { isRecord, readResearchJson, validSourceUrl, writeResearchFile } from "./menu-research-files";
import { publishedMenuDetail, publishedMenuIndex } from "../src/server/menu-delivery";

const pilotFile = "data/pilot/catalogue.json";
const output = "data/menu-research/menu-item-source-register.json";
const key = (dataset: string, menuId: unknown, itemId: unknown) =>
  JSON.stringify([dataset, publicId(menuId), publicId(itemId)]);

function publicReferences(compiled: Raw, pilot: Raw) {
  const datasets = new Map(rows(compiled.entries).map(entry => {
    if (!isRecord(entry.menu)) throw new Error("Invalid compiled menu identity");
    return [text(entry.menu.id), text(entry.dataset)];
  }));
  for (const venue of rows(pilot.venues)) datasets.set(text(venue.id), pilotFile);
  const published = new Map<string, Set<string>>();
  for (const summary of publishedMenuIndex().venues) {
    const dataset = datasets.get(summary.id), detail = publishedMenuDetail(summary.id);
    if (!dataset || !detail) throw new Error("Published menu is missing its source dataset");
    for (const section of detail.venues[0].sections) for (const item of section.items) {
      const itemKey = key(dataset, section.id, item.id);
      const branches = published.get(itemKey) ?? new Set<string>();
      branches.add(summary.id);
      published.set(itemKey, branches);
    }
  }
  return published;
}

async function packet(dataset: string): Promise<Raw> {
  const absolute = resolve(dataset), researchRoot = resolve("data/menu-research") + sep;
  if (dataset !== pilotFile && (!absolute.startsWith(researchRoot) || !absolute.endsWith(".json")))
    throw new Error("Item source dataset outside the research inventory");
  const value = await readResearchJson(absolute);
  if (!isRecord(value)) throw new Error("Invalid source packet: " + dataset);
  return value;
}

function currentPriceState(item: Raw) {
  if (item.quoteRequired === true || item.individualPricePublished === false
    || item.sourceTitlePriceConflict === true || item.sourceCodeConflict)
    return "unconfirmed-or-requote";
  if (isRecord(item.historicalPrice) && (!isRecord(item.price) || typeof item.price.amount !== "number"))
    return "historical-amount-only-current-price-unknown";
  if (isRecord(item.price) && typeof item.price.amount === "number") return "source-observation";
  return rows(item.priceVariants ?? []).some(variant => typeof variant.amount === "number")
    ? "source-variants-observed" : "current-price-unconfirmed";
}

function sourceCheckDate(source: Raw) {
  const checkedAt = text(source.checkedAt), retrievedAt = text(source.retrievedAt);
  for (const value of [checkedAt, retrievedAt])
    if (value && !Number.isFinite(Date.parse(value))) throw new Error("Invalid source check date: " + source.id);
  return { checkedAt: checkedAt || retrievedAt || null,
    dateBasis: checkedAt ? "checkedAt" : retrievedAt ? "retrievedAt" : "undated" };
}

function sourceReferences(dataset: string, ids: string[], local: Map<string, Raw>, pilot: Map<string, Raw>,
  sources: Map<string, Raw>) {
  return [...new Set(ids)].map(id => {
    const source = local.get(id) ?? pilot.get(id), sourceDataset = local.has(id) ? dataset : pilotFile;
    if (!source || !validSourceUrl(source.url)) throw new Error("Missing item source: " + dataset + " / " + id);
    const sourceRef = hash([sourceDataset, id]).slice(0, 24);
    const sourceRow = { sourceRef, dataset: sourceDataset, sourceId: id, url: source.url,
      publisher: text(source.publisher) || null, title: text(source.title) || null,
      ...sourceCheckDate(source),
      publishedAt: text(source.publishedAt) || null,
      accessStatus: text(source.status) || null, kind: text(source.kind) || null };
    const previous = sources.get(sourceRef);
    if (previous && JSON.stringify(previous) !== JSON.stringify(sourceRow))
      throw new Error("Conflicting item source key");
    sources.set(sourceRef, sourceRow);
    return sourceRef;
  });
}

function collectItems(dataset: string, data: Raw, pilotSources: Map<string, Raw>,
  sources: Map<string, Raw>, published: Map<string, Set<string>>) {
  const local = new Map(rows(data.sources).map(source => [text(source.id), source]));
  if (local.size !== rows(data.sources).length || local.has(""))
    throw new Error("Source IDs must be present and unique: " + dataset);
  const menus = rows(data.menus), pilotDishes = dataset === pilotFile ? rows(data.dishes) : [];
  const branches = dataset === pilotFile ? rows(data.venues) : rows(data.branches);
  const normalizedMenus = new Set<string>(), normalizedItems = new Set<string>();
  return menus.flatMap(menu => {
    const publicMenuId = publicId(menu.id);
    if (normalizedMenus.has(publicMenuId)) throw new Error("Normalized menu ID collision: " + dataset);
    normalizedMenus.add(publicMenuId);
    const menuId = text(menu.id), branchIds = dataset === pilotFile ? [text(menu.venueId)] : strings(menu.branchIds);
    const items = dataset === pilotFile ? pilotDishes.filter(item => item.menuId === menu.id) : rows(menu.items);
    const menuSources = [...strings(menu.sourceIds), ...(text(menu.sourceId) ? [text(menu.sourceId)] : [])];
    const selectedBranches = branches.filter(branch => branchIds.includes(text(branch.id)));
    const branchSources = selectedBranches.flatMap(branch => strings(branch.sourceIds));
    const menuSourceRefs = sourceReferences(dataset, menuSources, local, pilotSources, sources);
    const branchSourceRefs = sourceReferences(dataset, branchSources, local, pilotSources, sources);
    const branchHeld = selectedBranches.length > 0 && selectedBranches.every(branch =>
      held(branch.status) || held(branch.publicationStatus)
      || ["mixed-menu", "supplier", "food-court", "out-of-SG"].includes(text(branch.eligibility)));
    return items.map(item => {
      const itemId = text(item.id), itemSources = strings(item.sourceIds);
      if (!menuId || !itemId) throw new Error("Item source register requires stable menu and food IDs");
      const basis = itemSources.length ? "item" : menuSources.length ? "menu" : "branch-only";
      const ids = itemSources.length ? itemSources : menuSources.length ? menuSources : branchSources;
      const refs = sourceReferences(dataset, ids, local, pilotSources, sources);
      if (!refs.length) throw new Error("Food lacks a traceable source: " + dataset + " / " + itemId);
      const itemKey = key(dataset, menu.id, item.id), publicMenus = [...published.get(itemKey) ?? []].sort();
      if (normalizedItems.has(itemKey)) throw new Error("Normalized food ID collision: " + dataset + " / " + itemId);
      normalizedItems.add(itemKey);
      published.delete(itemKey);
      const reviewHeld = branchHeld || menu.held === true || held(menu.coverage) || held(menu.publicationStatus)
        || held(item.publicationStatus) || held(item.status)
        || typeof item.sourceStatusCode === "number" && item.sourceStatusCode !== 0
        || typeof item.sourceCategoryStatusCode === "number" && item.sourceCategoryStatusCode !== 0;
      return { dataset, menuId, foodId: itemId, name: text(item.name) || null, branchIds,
        state: publicMenus.length ? "published" : reviewHeld ? "held" : "research-only",
        publicFoodId: publicMenus.length ? publicId(item.id) : null,
        publicSectionId: publicMenus.length ? publicId(menu.id) : null,
        publishedMenuIds: publicMenus, sourceBasis: basis, sourceRefs: refs,
        menuSourceRefs, branchSourceRefs,
        priceState: currentPriceState(item), itemReview: text(item.publicationStatus) || null,
        menuReview: text(menu.publicationStatus) || null };
    });
  });
}

async function main() {
  const check = process.argv.slice(2);
  if (check.length > 1 || check.length === 1 && check[0] !== "--check")
    throw new Error("Use no argument to build, or --check to verify the source register");
  const index = await readResearchJson(resolve("data/menu-research/menu-collection-index.json"));
  const compiled = await readResearchJson(resolve("data/menus/published-research.json"));
  const pilot = await packet(pilotFile);
  if (!isRecord(index) || !isRecord(compiled)) throw new Error("Menu inventory and publication are required");
  const files = [...new Set(strings(index.datasets))].sort();
  if (!files.length || files.length !== index.datasetCount)
    throw new Error("Menu inventory needs exact dataset paths; rebuild the menu research index first");
  const pilotSources = new Map(rows(pilot.sources).map(source => [text(source.id), source]));
  const published = publicReferences(compiled, pilot), sources = new Map<string, Raw>();
  const datasets: Raw[] = [], records: Raw[] = [];
  for (const dataset of files) {
    const data = dataset === pilotFile ? pilot : await packet(dataset);
    datasets.push({ dataset, fingerprint: hash(data), checkedAt: text(data.checkedAt) || null });
    records.push(...collectItems(dataset, data, pilotSources, sources, published));
  }
  if (published.size) throw new Error("Published foods lack exact research rows: "
    + JSON.stringify([...published.keys()].slice(0, 5)));
  if (records.length !== index.sourceFoodRows)
    throw new Error("Source inventory changed (" + records.length + " foods versus " + index.sourceFoodRows
      + "); rebuild the menu research index first");
  const counts = { foodRecords: records.length, sourceDocuments: sources.size,
    uniqueSourceUrls: new Set([...sources.values()].map(source => source.url)).size,
    undatedSourceDocuments: [...sources.values()].filter(source => !source.checkedAt).length,
    publishedRecords: records.filter(record => record.state === "published").length,
    publishedFoodOccurrences: records.reduce((sum, record) => sum + strings(record.publishedMenuIds).length, 0),
    heldRecords: records.filter(record => record.state === "held").length,
    branchOnlySources: records.filter(record => record.sourceBasis === "branch-only").length };
  const value = { version: 1, notice: "Source traceability only. Published means approved menu-source facts, not independently certified ingredients, live stock or future prices. Exact quotes, option evidence and unresolved conflicts remain in each referenced dataset/menu/food record.",
    counts, datasets, sources: [...sources.values()], records };
  if (check.length) {
    const existing = JSON.parse(await readFile(resolve(output), "utf8"));
    const { generatedAt: _generatedAt, ...saved } = existing;
    if (JSON.stringify(saved) !== JSON.stringify(value)) throw new Error("Menu item source register needs regeneration");
  } else await writeResearchFile(resolve(output), JSON.stringify({ generatedAt: new Date().toISOString(), ...value }) + "\n");
  process.stdout.write(JSON.stringify({ action: check.length ? "check" : "build", ...counts, output }) + "\n");
}

main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Source register failed") + "\n"); process.exitCode = 1; });
