import 'server-only';
import { authorize, type Session } from './session';
import { HttpError } from './http';
import { packagedEvents, packagedRecipes, type Packaged, type Recipe, type Event } from './content-base';
import { action, contentId, expectedVersion, history, newerBelow, newId, staffRow, staffRows, staffState, visibility, writeItem, type Kind, type StaffRow } from './content-store';
import { event, recipeFields, today } from './content-validate';

type Source = 'bundled' | 'bot' | 'staff';
const titleOf = (data: Record<string, unknown>) => String(data.name ?? data.title ?? '');
const startsOf = (data: Record<string, unknown>) => typeof data.startsAt === 'string' ? data.startsAt : null;
/** Packaged (bundled with the app) and bot recipes or events, plus staff-created ones, with what staff changed. */
async function listOf(kind: 'recipe' | 'event', base: Packaged<Recipe | Event>[]) {
  const rows = await staffRows(kind), staff = new Map(rows.map(row => [row.id, row]));
  const item = (id: string, data: Record<string, unknown>, source: Source, hash?: string) => {
    const s = staff.get(id), shown = s && s.origin === 'staff' || s && Object.keys(s.data).length > 1 ? s.data : data;
    return { id, title: titleOf(shown), source, startsAt: startsOf(shown), status: typeof shown.status === 'string' ? shown.status : null,
      categories: Array.isArray(shown.categories) ? shown.categories : [], hidden: !!s?.hidden, edited: s?.origin === 'edit' && Object.keys(s.data).length > 1,
      newer: newerBelow(s ?? null, hash), updatedAt: s?.updated_at ?? null, withdrawn: typeof data.withdrawal === 'string' };
  };
  return [...rows.filter(r => r.origin === 'staff').map(r => item(r.id, r.data, 'staff')), ...base.map(b => item(b.data.id, b.data, b.source ?? 'bot', b.hash))];
}
export async function recipeList(member: Session) { authorize(member, 'content'); return listOf('recipe', await packagedRecipes()); }
export async function eventList(member: Session) { authorize(member, 'content'); return listOf('event', await packagedEvents()); }

async function detailOf(kind: 'recipe' | 'event', raw: string, base: Packaged<Recipe | Event>[]) {
  const id = contentId(raw, kind), [row, trail] = await Promise.all([staffRow(kind, id), history(kind, id)]);
  const packaged = base.find(b => b.data.id === id) ?? null;
  if (!packaged && row?.origin !== 'staff') throw new HttpError(404, kind === 'recipe' ? 'Recipe not found.' : 'Event not found.');
  return { id, app: process.env.CUSTOMER_APP_URL ?? null, source: packaged?.source ?? 'staff', base: packaged?.data ?? null, staff: row && { ...staffState(row), data: row.data }, newer: newerBelow(row, packaged?.hash), history: trail };
}
export async function recipeDetail(member: Session, id: string) { authorize(member, 'content'); return detailOf('recipe', id, await packagedRecipes()); }
export async function eventDetail(member: Session, id: string) { authorize(member, 'content'); return detailOf('event', id, await packagedEvents()); }

/** A complete recipe: staff fields over the packaged or bot recipe, keeping its photo key, links and provenance. */
function recipe(id: string, input: unknown, base: Recipe | null, version: number) {
  const { sources, image, dietary, ...fields } = recipeFields(input), now = today();
  const prior = (base ?? {}) as Record<string, unknown>, provenance = prior.provenance as Record<string, unknown> | undefined;
  const evidence = (prior.dietary as Record<string, unknown> | undefined)?.evidence ?? { kind: 'editorial', source: 'QuinTaste team', checkedAt: now };
  const rest = { ...prior };
  delete rest.image;
  return { ...rest, ...fields, id, dietary: { ...dietary, evidence }, ...(image ? { image } : {}),
    author: prior.author ?? 'QuinTaste team', language: prior.language ?? 'English', revision: Number(prior.revision ?? 0) + version + 1, updatedAt: now,
    ...(provenance ? { provenance: { ...provenance, ...(sources.length ? { sources } : {}) } }
      : base ? {} : { provenance: { sources, checkedAt: now, kitchenTested: false, reviewedBy: 'QuinTaste team' } }) };
}
async function save(member: Session, kind: 'recipe' | 'event', input: Record<string, unknown>, reason: string, base: Packaged<Recipe | Event>[]) {
  const act = action(input.action, ['create', 'save', 'hide', 'restore', 'clear', 'delete'] as const), expected = expectedVersion(input.version);
  authorize(member, 'content');
  const build = (id: string, packaged: Packaged<Recipe | Event> | null, row?: StaffRow) =>
    kind === 'recipe' ? recipe(id, input.fields, (packaged?.data as Recipe) ?? null, row?.version ?? 0) : event(input.fields, id);
  if (act === 'create') {
    const draft = build('staff-draft', null) as Record<string, unknown>, id = newId(titleOf(draft));
    await writeItem(member, kind as Kind, id, 0, act, reason, () => ({ origin: 'staff', hidden: false, data: { ...build(id, null), id } }));
    return { saved: true, id };
  }
  const id = contentId(input.id, kind);
  // Hiding an unknown id would leave an orphan row that silently hides a later bot item with that id.
  if (act !== 'save' && !base.some(b => b.data.id === id) && !(await staffRow(kind, id))) throw new HttpError(404, 'Not found. Refresh the list.');
  if (act !== 'save') return visibility(member, kind, id, expected, act, reason);
  const packaged = base.find(b => b.data.id === id) ?? null;
  return writeItem(member, kind, id, expected, act, reason, row => {
    if (!packaged && row?.origin !== 'staff') throw new HttpError(404, 'Not found. Refresh the list.');
    const data = build(id, packaged, row);
    return row?.origin === 'staff' ? { origin: 'staff', hidden: row.hidden, data } : { origin: 'edit', hidden: !!row?.hidden, data: { ...data, base: packaged!.hash } };
  });
}
export async function recipeAction(member: Session, input: Record<string, unknown>, reason: string) { return save(member, 'recipe', input, reason, await packagedRecipes()); }
export async function eventAction(member: Session, input: Record<string, unknown>, reason: string) { return save(member, 'event', input, reason, await packagedEvents()); }
