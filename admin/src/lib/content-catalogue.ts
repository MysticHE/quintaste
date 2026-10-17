import 'server-only';
import { query } from './db';
import { authorize, type Session } from './session';
import { HttpError, text } from './http';
import { packagedMenu, packagedPlaces, type MenuItem, type Place } from './content-base';
import { action, contentId, expectedVersion, history, newerBelow, newId, staffRow, staffRows, staffState, visibility, writeItem, type StaffRow } from './content-store';
import { asRecord, hours, menuItem, photo, point, url } from './content-validate';

type Patch = Partial<Place> & { sourceUrl?: string; base?: string };
type MenuData = { items?: Record<string, { name?: string; category?: string; price?: MenuItem['price']; hidden?: boolean }>; added?: MenuItem[]; sourceUrl?: string; base?: string };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const openReports = `SELECT split_part(subject_id,'|',1) AS subject, count(*)::int AS reports FROM ops.case_record
  WHERE kind='report' AND status NOT IN ('resolved','dismissed') AND subject_id LIKE 'place:catalogue:%' GROUP BY 1`;

/** Every packaged and staff-created place, with what staff changed and whether newer data arrived underneath. */
export async function placeList(member: Session) {
  authorize(member, 'content');
  const [base, rows, menus, reports] = await Promise.all([packagedPlaces(), staffRows('place'), staffRows('menu'), query<{ subject: string; reports: number }>(openReports)]);
  const staff = new Map(rows.map(row => [row.id, row])), menu = new Map(menus.map(row => [row.id, row]));
  const reported = new Map(reports.rows.map(row => [row.subject.slice('place:catalogue:'.length), row.reports]));
  const row = (id: string, fields: Partial<Place>, extra: Record<string, unknown>) => {
    const s = staff.get(id), m = menu.get(id), patch = (s?.data ?? {}) as Patch;
    return { id, name: patch.name ?? fields.name, branch: patch.branch ?? fields.branch, address: patch.address ?? fields.address,
      hidden: !!s?.hidden, edited: s?.origin !== 'staff' && (!!m || Object.keys(patch).some(key => key !== 'base')), reports: reported.get(id) ?? 0,
      updatedAt: [s?.updated_at, m?.updated_at].filter(Boolean).sort().at(-1) ?? null, ...extra };
  };
  return [...rows.filter(r => r.origin === 'staff').map(r => row(r.id, {}, { origin: 'staff', dishes: ((menu.get(r.id)?.data as MenuData)?.added ?? []).length })),
    ...base.map(({ hash, data }) => row(data.id, data, { origin: 'packaged', dishes: data.itemCount, newer: newerBelow(staff.get(data.id) ?? null, hash) }))];
}
export async function placeDetail(member: Session, raw: string) {
  authorize(member, 'content');
  const id = contentId(raw, 'place');
  const [places, place, menuRow, menu, trail, reports] = await Promise.all([packagedPlaces(), staffRow('place', id), staffRow('menu', id), packagedMenu(id),
    history('place', id), query(`SELECT id,title,status,created_at FROM ops.case_record WHERE kind='report' AND split_part(subject_id,'|',1)=$1 ORDER BY created_at DESC LIMIT 20`, ['place:catalogue:' + id])]);
  const base = places.find(p => p.data.id === id) ?? null;
  if (!base && place?.origin !== 'staff') throw new HttpError(404, 'Place not found.');
  const menuTrail = await history('menu', id);
  return { id, app: process.env.CUSTOMER_APP_URL ?? null, base: base?.data ?? null, staff: place && { ...staffState(place), data: place.data }, newer: newerBelow(place, base?.hash),
    menu: { base: menu?.data ?? null, staff: menuRow && { ...staffState(menuRow), data: menuRow.data }, newer: newerBelow(menuRow, menu?.hash) },
    history: [...trail, ...menuTrail].sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at))).slice(0, 30), reports: reports.rows };
}

async function placeFields(input: Record<string, unknown>, base: Place | null) {
  const f = asRecord(input.fields, 'place details');
  const postalCode = text(f.postalCode, 'postal code', 6, 6);
  if (!/^\d{6}$/.test(postalCode)) throw new HttpError(400, 'Enter a six-digit postal code.');
  const pictured = f.photo === undefined ? undefined : photo(f.photo);
  if (pictured && pictured.path !== base?.photo?.path
    && !(await query('SELECT 1 FROM content.asset WHERE sha256=$1', [pictured.path.split('/').pop()!.slice(0, 64)])).rowCount) throw new HttpError(400, 'Upload the photo again.');
  return { name: text(f.name, 'name', 300), branch: text(f.branch, 'branch', 300), address: text(f.address, 'address', 500), postalCode,
    aliases: String(f.aliases ?? '').split(',').map(a => a.trim()).filter(Boolean).slice(0, 10).map(a => text(a, 'other name', 300)),
    point: f.point === undefined ? base?.point ?? null : point(f.point), venueDiet: f.venueDiet === 'Vegan' ? 'Vegan' as const : 'Vegetarian' as const,
    alliumFreeClaim: f.alliumFreeClaim === true, ...(f.hours !== undefined ? { hours: hours(f.hours) } : {}), ...(pictured !== undefined ? { photo: pictured } : {}) };
}
/** Save keeps only the fields that differ from the packaged place, so bot updates to untouched fields still reach members. */
export async function placeAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = action(input.action, ['create', 'save', 'hide', 'restore', 'clear', 'delete'] as const), expected = expectedVersion(input.version);
  authorize(member, 'content', true);
  if (act === 'create') {
    const fields = await placeFields(input, null), id = newId(fields.name + ' ' + fields.branch);
    const sourceUrl = url(asRecord(input.fields, 'place details').sourceUrl, 'the place source');
    await writeItem(member, 'place', id, 0, act, reason, () => ({ origin: 'staff', hidden: false, data: { ...fields, sourceUrl } }));
    return { saved: true, id, note: 'Place created. Add at least one dish so it appears in Explore.' };
  }
  const id = contentId(input.id, 'place');
  if (act !== 'save') {
    return visibility(member, 'place', id, expected, act, reason);
  }
  const base = (await packagedPlaces()).find(p => p.data.id === id) ?? null, fields = await placeFields(input, base?.data ?? null);
  return writeItem(member, 'place', id, expected, act, reason, row => {
    if (row?.origin === 'staff') return { origin: 'staff', hidden: row.hidden, data: { ...fields, sourceUrl: url(asRecord(input.fields, 'place details').sourceUrl, 'the place source') } };
    if (!base) throw new HttpError(404, 'Place not found.');
    const changed = Object.fromEntries(Object.entries(fields).filter(([key, value]) => !same(value ?? null, (base.data as Record<string, unknown>)[key] ?? null)));
    return Object.keys(changed).length || row?.hidden ? { origin: 'edit', hidden: !!row?.hidden, data: { ...changed, base: base.hash } } : null;
  });
}

/** Dish changes: edit or hide packaged dishes by "sectionId/itemId", and add, edit or remove staff dishes. */
export async function menuAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = action(input.action, ['edit', 'hide', 'restore', 'add', 'edit-added', 'remove-added', 'clear'] as const), expected = expectedVersion(input.version);
  const id = contentId(input.id, 'place');
  authorize(member, 'content', true);
  const [base, place] = await Promise.all([packagedMenu(id), staffRow('place', id)]);
  if (!base && place?.origin !== 'staff') throw new HttpError(404, 'Menu not found.');
  if (act === 'clear') return visibility(member, 'menu', id, expected, 'clear', reason);
  const key = act === 'edit' || act === 'hide' || act === 'restore' ? text(input.key, 'dish', 250) : '';
  const original = key ? base?.data.sections.flatMap(s => s.items.map(item => ({ key: s.id + '/' + item.id, item }))).find(entry => entry.key === key)?.item : undefined;
  if (key && !original) throw new HttpError(404, 'Dish not found. Refresh the menu.');
  return writeItem(member, 'menu', id, expected, act, reason, (row?: StaffRow) => {
    const data = structuredClone((row?.data ?? {}) as MenuData), items = data.items ?? {}, added = data.added ?? [];
    if (act === 'edit') {
      const next = menuItem(input.item, original!.id), change: NonNullable<MenuData['items']>[string] = { ...(items[key]?.hidden ? { hidden: true } : {}) };
      if (next.name !== original!.name) change.name = next.name;
      if ((next.category ?? '') !== (original!.category ?? '')) change.category = next.category ?? '';
      if (!same(next.price, original!.price)) change.price = next.price;
      if (Object.keys(change).length) items[key] = change; else delete items[key];
    } else if (act === 'hide' || act === 'restore') {
      const rest = { ...items[key] };
      delete rest.hidden;
      if (act === 'hide') items[key] = { ...rest, hidden: true }; else if (Object.keys(rest).length) items[key] = rest; else delete items[key];
    } else if (act === 'add') {
      if (added.length >= 200) throw new HttpError(409, 'A place can have up to 200 added dishes.');
      if (!base && !(place?.data as Patch)?.sourceUrl) throw new HttpError(409, 'Add a source link to the place first.');
      added.push(menuItem(input.item, 'staff-' + crypto.randomUUID().slice(0, 12)));
    } else {
      const dish = text(input.dishId, 'dish', 40), index = added.findIndex(d => d.id === dish);
      if (index < 0) throw new HttpError(404, 'Dish not found. Refresh the menu.');
      if (act === 'remove-added') added.splice(index, 1); else added[index] = menuItem(input.item, dish);
    }
    const next = { ...data, items, added, ...(base ? { base: base.hash } : {}) };
    return Object.keys(items).length || added.length || row?.hidden ? { origin: 'edit', hidden: !!row?.hidden, data: next } : null;
  }, { dish: key || input.dishId || null });
}
