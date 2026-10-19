/**
 * Estimates per-serving nutrition for Cook recipes from their ingredient lines (docs/NUTRITION_HEALTH_PLAN.md, Phase A).
 * Each line is matched to a reviewed key in scripts/nutrition/ingredient-table.json, turned into grams, and multiplied
 * by USDA SR Legacy per-100 g figures (scripts/nutrition/usda-subset.json, public domain). Nothing is invented: a recipe
 * gets figures only when matched ingredients cover at least 90% of the nutritive weight and every measured line has a
 * weight; "to taste" lines are skipped and the app says so. Water, pandan, tea leaves and curry leaves count as matched
 * with no nutrients. Cooking losses are not modelled: totals of the raw inputs per serving, as recipe sites report.
 * Usage:
 *   npx tsx scripts/recipe-nutrition.ts --usda <path to usda-sr-legacy.json>   rebuild the USDA subset for the table
 *   npx tsx scripts/recipe-nutrition.ts                                          bundled recipes -> src/data/recipe-library/nutrition.ts
 *   npx tsx scripts/recipe-nutrition.ts --live [--base https://host]            published recipes -> .local/nutrition/live-recipes.json
 *   npx tsx scripts/recipe-nutrition.ts --check                                  report only, exit 1 when a bundled recipe lost coverage
 *   npx tsx scripts/recipe-nutrition.ts --bot <out.json>                         write the QT bot's nutrition_sg.json (v2) from the same table
 * The bot file carries the reviewed foods with their USDA rows and unit weights, plus the bot's legacy whole-word keys
 * (scripts/nutrition/bot-legacy-items.json) for ingredients the table lacks; the bot's nutrition.py reads only that file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bundledRecipes } from "../src/data/recipes";
import type { Recipe } from "../src/types/food";

type Figures = NonNullable<Recipe["nutrition"]>["perServing"];
type Food = { name: string; usda?: string; gPerMl?: number; each?: number; per?: Record<string, number>; match: string[]; analogue?: string; negligible?: boolean };
type Table = { version: string; units: Record<string, number>; foods: Record<string, Food> };
type Per100 = Partial<Record<keyof Figures, number | null>> & { name: string };
type Line = { id: string; name: string; amount: number | null; unit: string };
type LineResult = { line: Line; key?: string; grams?: number; status: "matched" | "negligible" | "to-taste" | "unmatched" | "unweighed"; analogue?: string };
export type Estimate = { id: string; name: string; servings: number; coverage: number; lines: LineResult[]; perServing?: Figures; omitted: string[] };

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const table: Table = JSON.parse(readFileSync(join(here, "nutrition", "ingredient-table.json"), "utf8"));
const subsetPath = join(here, "nutrition", "usda-subset.json");
const nutrients: (keyof Figures)[] = ["kcal", "protein", "fat", "carbs", "fibre", "sugar", "sodium"];
// A nutrient is left out when more than 10% of the nutritive weight comes from USDA rows that lack it (SR Legacy has no
// sugar value for tempeh, fermented tofu, millet and some spices).
const MIN_COVERAGE = 0.9, MAX_MISSING_SHARE = 0.1;
const countUnits = new Set(["", "each", "whole", "piece", "pieces", "egg", "eggs", "leaves", "leaf", "cloves", "clove", "slices", "slice", "cubes", "cube", "sprig", "sprigs", "inch", "handful", "handfuls", "pods", "pod", "sticks", "stick"]);

function normaliseUnit(unit: string) {
  const u = unit.trim().toLowerCase().replace(/\s+/g, " ");
  if (u === "inch piece" || u === "inch pieces" || u === "inches") return "inch";
  if (u === "whole" || u === "piece" || u === "pieces" || u === "") return "each";
  return u;
}

function matchFood(name: string): { key: string; food: Food } | undefined {
  let best: { key: string; food: Food; length: number } | undefined;
  for (const [key, food] of Object.entries(table.foods)) for (const pattern of food.match) {
    const hit = new RegExp(pattern, "i").exec(name);
    if (hit && (!best || hit[0].length > best.length)) best = { key, food, length: hit[0].length };
  }
  return best && { key: best.key, food: best.food };
}

function gramsFor(line: Line, food: Food): number | undefined {
  const unit = normaliseUnit(line.unit), amount = line.amount ?? 0;
  if (unit === "g" || unit === "gram" || unit === "grams") return amount;
  if (unit === "kg") return amount * 1000;
  const ml = table.units[unit];
  if (ml !== undefined) return amount * ml * (food.gPerMl ?? 1);
  if (countUnits.has(unit)) {
    const per = food.per?.[unit] ?? (unit === "each" || unit === "egg" || unit === "eggs" ? food.each : undefined) ?? (food.per ? undefined : food.each);
    return per === undefined ? undefined : amount * per;
  }
  return undefined;
}

export function estimate(recipe: Pick<Recipe, "id" | "name" | "servings" | "ingredients">, per100: Record<string, Per100>): Estimate {
  const lines: LineResult[] = recipe.ingredients.map(line => {
    if (line.amount === null) return { line, status: "to-taste" };
    const hit = matchFood(line.name);
    if (!hit) return { line, status: "unmatched" };
    if (hit.food.negligible) return { line, key: hit.key, grams: 0, status: "negligible" };
    const grams = gramsFor(line, hit.food);
    if (grams === undefined) return { line, key: hit.key, status: "unweighed", analogue: hit.food.analogue };
    return { line, key: hit.key, grams, status: "matched", analogue: hit.food.analogue };
  });
  const matched = lines.filter(l => l.status === "matched");
  const nutritiveGrams = matched.reduce((sum, l) => sum + (l.grams ?? 0), 0);
  const unresolved = lines.some(l => l.status === "unmatched" || l.status === "unweighed");
  const totals: Record<string, number> = {}, missing: Record<string, number> = {};
  for (const l of matched) {
    const food = table.foods[l.key!], row = food.usda ? per100[food.usda] : undefined;
    if (!row) throw new Error(`USDA row ${food.usda} for ${l.key} is not in the subset; run with --usda`);
    for (const n of nutrients) {
      const value = row[n];
      if (typeof value === "number") totals[n] = (totals[n] ?? 0) + (value * (l.grams ?? 0)) / 100;
      else missing[n] = (missing[n] ?? 0) + (l.grams ?? 0);
    }
  }
  // Coverage is by nutritive weight: an unresolved line makes the estimate unusable because its weight is unknown.
  const coverage = unresolved ? 0 : matched.length ? 1 : 0;
  const omitted = nutrients.filter(n => nutritiveGrams > 0 && (missing[n] ?? 0) / nutritiveGrams > MAX_MISSING_SHARE);
  if (coverage < MIN_COVERAGE || omitted.includes("kcal") || !(totals.kcal > 0)) return { id: recipe.id, name: recipe.name, servings: recipe.servings, coverage, lines, omitted };
  const perServing = { kcal: Math.round(totals.kcal / recipe.servings) } as Figures;
  for (const n of nutrients) if (n !== "kcal" && !omitted.includes(n)) perServing[n] = Math.round((totals[n] / recipe.servings) * 10) / 10;
  return { id: recipe.id, name: recipe.name, servings: recipe.servings, coverage, lines, perServing, omitted };
}

function buildSubset(fullPath: string) {
  const full: Record<string, Per100> = JSON.parse(readFileSync(fullPath, "utf8"));
  const subset: Record<string, Per100> = {};
  for (const food of Object.values(table.foods)) if (food.usda) {
    const row = full[food.usda];
    if (!row) throw new Error(`fdcId ${food.usda} (${food.name}) is missing from ${fullPath}`);
    subset[food.usda] = row;
  }
  writeFileSync(subsetPath, JSON.stringify({ source: "USDA FoodData Central, SR Legacy (April 2018), per 100 g; public domain", built: new Date().toISOString().slice(0, 10), foods: subset }, null, 1) + "\n");
  console.log(`USDA subset: ${Object.keys(subset).length} foods -> ${subsetPath}`);
}

function writeBotTable(out: string, per100: Record<string, Per100>) {
  const legacy: { items: Record<string, { fdcId: number; usda: string; per100g: Record<string, number> }> } = JSON.parse(readFileSync(join(here, "nutrition", "bot-legacy-items.json"), "utf8"));
  const foods: Record<string, unknown> = {};
  for (const [key, food] of Object.entries(table.foods)) {
    const row = food.usda ? per100[food.usda] : undefined;
    const { usda, ...rest } = food;
    foods[key] = { ...rest, fdcId: usda ? Number(usda) : undefined, usda: row?.name, per100g: row ? Object.fromEntries(nutrients.map(n => [n, row[n] ?? null])) : undefined };
  }
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [key, item] of Object.entries(legacy.items)) {
    const slug = "legacy_" + key.replace(/[^a-z0-9]+/g, "_");
    if (Object.values(table.foods).some(food => food.match.some(pattern => new RegExp(pattern, "i").test(key)))) continue;
    foods[slug] = { name: item.usda, fdcId: item.fdcId, usda: item.usda, per100g: item.per100g, match: [`(?<![a-z])${escape(key)}(?![a-z])`], legacy: true };
  }
  writeFileSync(out, JSON.stringify({ version: 2, built: new Date().toISOString().slice(0, 10), table: table.version,
    source: "USDA FoodData Central, SR Legacy (April 2018), public domain. Values per 100 g; sodium in mg, others in g. Generated by scripts/recipe-nutrition.ts --bot in the app repo; edit scripts/nutrition/ingredient-table.json there.",
    units: table.units, foods }, null, 1) + "\n");
  console.log(`bot table: ${Object.keys(foods).length} foods -> ${out}`);
}

function report(results: Estimate[]) {
  for (const r of results) {
    const p = r.perServing;
    console.log(`${p ? "OK  " : "NONE"} ${r.id.padEnd(36)} ${p ? `${p.kcal} kcal · P ${p.protein} · F ${p.fat} · C ${p.carbs} · fibre ${p.fibre} · sugar ${p.sugar} · Na ${p.sodium} mg` : "no figures"}`);
    for (const l of r.lines) if (l.status === "unmatched" || l.status === "unweighed") console.log(`       ${l.status}: ${l.line.name} | ${l.line.amount} ${l.line.unit}`);
    const analogues = r.lines.filter(l => l.analogue).map(l => `${l.line.name} → ${l.analogue}`);
    if (analogues.length) console.log(`       analogues: ${analogues.join("; ")}`);
    if (r.omitted.length) console.log(`       omitted (USDA gap): ${r.omitted.join(", ")}`);
  }
  console.log(`${results.filter(r => r.perServing).length}/${results.length} recipes have figures`);
}

async function main() {
  const args = process.argv.slice(2), flag = (name: string) => args.includes(name), value = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (value("--usda")) buildSubset(value("--usda")!);
  const per100: Record<string, Per100> = JSON.parse(readFileSync(subsetPath, "utf8")).foods;
  const today = new Date().toISOString().slice(0, 10);
  if (value("--bot")) { writeBotTable(value("--bot")!, per100); return; }
  if (flag("--live")) {
    const base = value("--base") ?? "https://quintaste.srv1902914.hstgr.cloud";
    const list = (await (await fetch(`${base}/api/editorial/recipes`)).json()) as { items: { id: string }[] };
    const results: Estimate[] = [];
    for (const item of list.items) {
      const detail = (await (await fetch(`${base}/api/editorial/recipes/${item.id}`)).json()) as Recipe | { recipe: Recipe };
      results.push(estimate("recipe" in detail ? detail.recipe : detail, per100));
    }
    report(results);
    const out = join(root, ".local", "nutrition"); mkdirSync(out, { recursive: true });
    const file = join(out, "live-recipes.json");
    writeFileSync(file, JSON.stringify({ checkedAt: today, base, recipes: results.filter(r => r.perServing).map(r => ({ id: r.id, nutrition: { basis: "estimate", coverage: r.coverage, checkedAt: today, perServing: r.perServing } })), withoutFigures: results.filter(r => !r.perServing).map(r => r.id) }, null, 1) + "\n");
    console.log(`wrote ${file}`);
    return;
  }
  const results = bundledRecipes(true).map(recipe => estimate(recipe, per100));
  report(results);
  const target = join(root, "src", "data", "recipe-library", "nutrition.ts");
  if (flag("--check")) {
    const current = readFileSync(target, "utf8");
    const lost = results.filter(r => r.perServing && !current.includes(`"${r.id}"`));
    if (lost.length) { console.error(`Recipes with figures not in nutrition.ts: ${lost.map(r => r.id).join(", ")}; rerun without --check`); process.exit(1); }
    return;
  }
  const entries = results.filter(r => r.perServing).map(r => `  "${r.id}": { basis: "estimate", coverage: ${r.coverage}, checkedAt: "${today}", perServing: ${JSON.stringify(r.perServing)} },`);
  writeFileSync(target, `// Generated by scripts/recipe-nutrition.ts (${table.version} ingredient table, USDA SR Legacy); do not edit by hand.\n// Per-serving estimates from the raw ingredients; recipes without an entry show "Unavailable".\nimport type { Recipe } from "../../types/food";\n\nexport const bundledNutrition: Record<string, NonNullable<Recipe["nutrition"]>> = {\n${entries.join("\n")}\n};\n`);
  console.log(`wrote ${target}`);
}

main().catch(error => { console.error(error); process.exit(1); });
