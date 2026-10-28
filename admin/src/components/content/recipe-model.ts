import { optionalNumber } from '../client';
import type { Audit, Staff } from './Parts';
import type { RecipePhoto } from './RecipePhotoEditor';
export const categories = ['Breakfast', 'Noodles', 'Rice meals', 'With rice', 'Soups', 'Snacks & kueh', 'Desserts & drinks'];
export const exclusions = ['Garlic', 'Onion', 'Leeks', 'Chives', 'Scallions', 'Shallots', 'Asafoetida', 'Eggs', 'Dairy', 'Honey', 'Peanuts', 'Tree nuts', 'Gluten', 'Mushrooms', 'Root vegetables'];
export type Step = { key: string; title: string; instruction: string; ingredientIds: string[]; timerLabel: string; timerMinutes: string; photo?: string; image?: 'frame' | 'illustration'; at?: number };
export type Ingredient = { id: string; name: string; amount: string; unit: string };
export type Recipe = { name: string; description: string; cuisine: string; minutes: number; servings: number; categories: string[]; onePot?: boolean;
  dietary: { diet: string; contains: string[] }; ingredients: { id: string; name: string; amount: number | null; unit: string }[];
  steps: { title: string; instruction: string; ingredientIds: string[]; timer?: { label: string; seconds: number }; photo?: string; image?: 'frame' | 'illustration'; at?: number }[];
  photo?: string; image?: RecipePhoto; provenance?: { sources: string[] }; withdrawal?: string };
export type Detail = { id: string; app: string | null; source: 'bundled' | 'bot' | 'staff'; base: Recipe | null; staff: Staff | null; newer: boolean; history: Audit[] };
export type Form = { name: string; description: string; cuisine: string; minutes: string; servings: string; categories: string[]; onePot: boolean;
  diet: string; contains: string[]; image: RecipePhoto | null; photo?: string; removeCover: boolean; sources: string; ingredients: Ingredient[]; steps: Step[] };
export const fresh = () => 'n' + crypto.randomUUID().replaceAll('-', '').slice(0, 16);
export function initial(detail: Detail | null): Form {
  const start = (detail?.staff && Object.keys(detail.staff.data).length > 1 ? detail.staff.data : detail?.base) as Recipe | null;
  return { name: start?.name ?? '', description: start?.description ?? '', cuisine: start?.cuisine ?? 'Local', minutes: String(start?.minutes ?? 30), servings: String(start?.servings ?? 2),
    categories: start?.categories ?? ['Rice meals'], onePot: !!start?.onePot, diet: start?.dietary.diet ?? 'Vegan', contains: start?.dietary.contains ?? [],
    image: start?.image ?? null, photo: start?.photo, removeCover: false, sources: start?.provenance?.sources.join('\n') ?? '',
    ingredients: start?.ingredients.map(i => ({ ...i, amount: i.amount === null ? '' : String(i.amount) })) ?? [{ id: fresh(), name: '', amount: '', unit: '' }],
    steps: start?.steps.map(s => ({ ...s, key: fresh(), timerLabel: s.timer?.label ?? '', timerMinutes: s.timer ? String(s.timer.seconds / 60) : '' })) ?? [emptyStep()] };
}
export const emptyStep = (): Step => ({ key: fresh(), title: '', instruction: '', ingredientIds: [], timerLabel: '', timerMinutes: '' });
export const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
export function move<T>(values: T[], at: number, by: number) { const next = [...values]; const [item] = next.splice(at, 1); next.splice(Math.max(0, Math.min(next.length, at + by)), 0, item); return next; }
export function fields(r: Form) {
  return { ...r, minutes: Number(r.minutes), servings: Number(r.servings), sources: r.sources.split('\n').map(s => s.trim()).filter(Boolean),
    ingredients: r.ingredients.map(i => ({ ...i, amount: optionalNumber(i.amount, 'the amount of ' + i.name) })),
    steps: r.steps.map(s => ({ title: s.title, instruction: s.instruction, ingredientIds: s.ingredientIds, photo: s.photo ?? null,
      ...(s.image ? { image: s.image } : {}), ...(s.at !== undefined ? { at: s.at } : {}),
      ...(s.timerMinutes.trim() ? { timer: { label: s.timerLabel.trim() || s.title, seconds: Math.round(optionalNumber(s.timerMinutes, 'the timer of ' + s.title)! * 60) } } : {}) })) };
}
