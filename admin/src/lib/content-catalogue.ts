import 'server-only';
import { query } from './db';
import { authorize, type Session } from './session';
import { choice, HttpError, text } from './http';
import { closedPlaces, packagedMenu, packagedPlaces, type Menu, type MenuItem, type Place } from './content-base';
import { action, contentId, expectedVersion, history, newerBelow, newId, staffRow, staffRows, staffState, visibility, writeItem, type StaffRow } from './content-store';
import { asRecord, checkOptionsMenu, hours, menuItem, menuTotal, photo, point, url } from './content-validate';
import { samePlace } from './place-identity';

// null clears the veg options kitchen or the full-menu count set by an earlier staff edit.
type Patch = Omit<Partial<Place>, 'kitchen' | 'menuTotal'> & { kitchen?: 'options' | null; menuTotal?: number | null; sourceUrl?: string; base?: string };
type MenuData = { items?: Record<string, { name?: string; category?: string; price?: MenuItem['price']; diet?: MenuItem['diet']; hidden?: boolean }>; added?: MenuItem[]; sourceUrl?: string; base?: string };
/** The labels on every dish members see: packaged dishes after staff edits and hides, then added dishes. */
const visibleDiets = (menu: Menu | null | undefined, data: MenuData) => [...(menu?.sections ?? []).flatMap(section => section.items.flatMap(item => {
  const change = data.items?.[section.id + '/' + item.id];
  return change?.hidden ? [] : [change?.diet ?? item.diet];
})), ...(data.added ?? []).map(dish => dish.diet)];
/** Deep equality that ignores object key order, so an untouched packaged field never reads as a staff edit. */
const sorted = (_key: string, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value;
const same = (a: unknown, b: unknown) => JSON.stringify(a, sorted) === JSON.stringify(b, sorted);
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
      kitchen: (patch.kitchen !== undefined ? patch.kitchen : fields.kitchen) === 'options' ? 'mixed' : 'veg',
      hidden: !!s?.hidden, edited: s?.origin !== 'staff' && (!!m || Object.keys(patch).some(key => key !== 'base')), reports: reported.get(id) ?? 0,
      updatedAt: [s?.updated_at, m?.updated_at].filter(Boolean).sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime()).at(-1) ?? null, ...extra };
  };
  return [...rows.filter(r => r.origin === 'staff').map(r => row(r.id, {}, { origin: 'staff', dishes: ((menu.get(r.id)?.data as MenuData)?.added ?? []).length })),
    ...base.map(({ source, hash, data }) => row(data.id, data, { origin: source === 'bot' ? 'explorer' : 'packaged', dishes: data.itemCount, newer: newerBelow(staff.get(data.id) ?? null, hash) }))];
}
export async function placeDetail(member: Session, raw: string) {
  authorize(member, 'content');
  const id = contentId(raw, 'place');
  const [places, place, menuRow, menu, trail, menuTrail, decisions, reports] = await Promise.all([packagedPlaces(), staffRow('place', id), staffRow('menu', id), packagedMenu(id),
    history('place', id), history('menu', id),
    // Decisions recorded by the earlier Editorial review page stay visible in the place history.
    query(`SELECT d.created_at AS occurred_at, 'editorial.' || d.decision AS action, d.reason, m.email AS actor FROM ops.content_decision d
      LEFT JOIN staff.member m ON m.id=d.reviewer_id WHERE d.content_id=$1 ORDER BY d.created_at DESC LIMIT 20`, [id]),
    query(`SELECT id,title,status,created_at FROM ops.case_record WHERE kind='report' AND split_part(subject_id,'|',1)=$1 ORDER BY created_at DESC LIMIT 20`, ['place:catalogue:' + id])]);
  const base = places.find(p => p.data.id === id) ?? null;
  if (!base && place?.origin !== 'staff') throw new HttpError(404, 'Place not found.');
  return { id, app: process.env.CUSTOMER_APP_URL ?? null, origin: base?.source === 'bot' ? 'explorer' : base ? 'packaged' : 'staff', base: base?.data ?? null, staff: place && { ...staffState(place), data: place.data }, newer: newerBelow(place, base?.hash),
    menu: { base: menu?.data ?? null, staff: menuRow && { ...staffState(menuRow), data: menuRow.data }, newer: newerBelow(menuRow, menu?.hash) },
    history: [...trail, ...menuTrail, ...decisions.rows].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()).slice(0, 30), reports: reports.rows };
}

async function placeFields(input: Record<string, unknown>, base: Place | null) {
  const f = asRecord(input.fields, 'place details');
  const postalCode = text(f.postalCode, 'postal code', 6, 6);
  if (!/^\d{6}$/.test(postalCode)) throw new HttpError(400, 'Enter a six-digit postal code.');
  const pictured = f.photo === undefined ? undefined : photo(f.photo);
  const kitchen = f.kitchen === undefined || f.kitchen === null || f.kitchen === '' ? null : choice(f.kitchen, ['options'] as const, 'place type');
  if (kitchen && f.alliumFreeClaim === true) throw new HttpError(400, 'A Mixed Kitchen place cannot claim allium-free food.');
  if (pictured && pictured.path !== base?.photo?.path
    && !(await query('SELECT 1 FROM content.asset WHERE sha256=$1', [pictured.path.split('/').pop()!.slice(0, 64)])).rowCount) throw new HttpError(400, 'Upload the photo again.');
  return { name: text(f.name, 'name', 300), branch: text(f.branch, 'branch', 300), address: text(f.address, 'address', 500), postalCode,
    aliases: String(f.aliases ?? '').split(',').map(a => a.trim()).filter(Boolean).slice(0, 10).map(a => text(a, 'other name', 300)),
    point: f.point === undefined ? base?.point ?? null : point(f.point), venueDiet: f.venueDiet === 'Vegan' ? 'Vegan' as const : 'Vegetarian' as const,
    alliumFreeClaim: f.alliumFreeClaim === true, kitchen, menuTotal: menuTotal(f.menuTotal), ...(f.hours !== undefined ? { hours: hours(f.hours) } : {}), ...(pictured !== undefined ? { photo: pictured } : {}) };
}
/** Owner, 24 Oct 2026: a new place that Explore already lists (samePlace: same postal code and unit, or same name) is refused
 * unless staff confirm it is a different place, so the same branch is not listed twice under a staff id. Hidden and closed places
 * are not listed, matching the bots (live_places in ops/qt-team/veg_options.py). */
async function refuseListed(fields: { name: string; address: string; postalCode: string }) {
  const [base, closed, rows] = await Promise.all([packagedPlaces(), closedPlaces(), staffRows('place')]);
  const staff = new Map(rows.map(row => [row.id, row]));
  const listed = [...base.flatMap(({ data }) => {
    const row = staff.get(data.id), patch = (row?.data ?? {}) as Patch;
    return row?.hidden || closed.has(data.id) ? [] : [{ id: data.id, name: patch.name ?? data.name, address: patch.address ?? data.address, postalCode: patch.postalCode ?? data.postalCode }];
  }), ...rows.filter(row => row.origin === 'staff' && !row.hidden).map(row => {
    const data = row.data as Patch;
    return { id: row.id, name: data.name ?? '', address: data.address ?? '', postalCode: data.postalCode ?? '' };
  })];
  for (const place of listed) {
    const why = samePlace(fields, place);
    if (why) throw new HttpError(409, `${place.name} (${place.address}) is already listed with the ${why === 'same unit' ? 'same unit' : 'same name'} at this postal code. `
      + 'Edit that place instead, or tick "Different place at this address" to add this one.');
  }
}
/** Save keeps only the fields that differ from the packaged place, so bot updates to untouched fields still reach members. */
export async function placeAction(member: Session, input: Record<string, unknown>, reason: string) {
  const act = action(input.action, ['create', 'save', 'hide', 'restore', 'clear', 'delete'] as const), expected = expectedVersion(input.version);
  authorize(member, 'content');
  if (act === 'create') {
    const fields = await placeFields(input, null), id = newId(fields.name + ' ' + fields.branch);
    if (input.allowDuplicate !== true) await refuseListed(fields);
    const sourceUrl = url(asRecord(input.fields, 'place details').sourceUrl, 'the place source');
    await writeItem(member, 'place', id, 0, act, reason, () => ({ origin: 'staff', hidden: false, data: { ...fields, sourceUrl } }));
    return { saved: true, id, note: 'Place created. Add at least one dish so it appears in Explore.' };
  }
  const id = contentId(input.id, 'place');
  const base = (await packagedPlaces()).find(p => p.data.id === id) ?? null;
  if (act !== 'save') {
    if (!base && !(await staffRow('place', id))) throw new HttpError(404, 'Place not found.');
    // Reverting to the original place must not expose unlabelled dishes at a veg-options venue.
    if (act === 'clear' && base) {
      const [menu, menuRow] = await Promise.all([packagedMenu(id), staffRow('menu', id)]);
      checkOptionsMenu(base.data.kitchen, base.data.venueDiet, visibleDiets(menu?.data, (menuRow?.data ?? {}) as MenuData));
    }
    return visibility(member, 'place', id, expected, act, reason);
  }
  const [menu, menuRow] = await Promise.all([packagedMenu(id), staffRow('menu', id)]);
  const fields = await placeFields(input, base?.data ?? null);
  checkOptionsMenu(fields.kitchen, fields.venueDiet, visibleDiets(menu?.data, (menuRow?.data ?? {}) as MenuData));
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
  authorize(member, 'content');
  const [base, place, places] = await Promise.all([packagedMenu(id), staffRow('place', id), packagedPlaces()]);
  const placeData = (place?.data ?? {}) as Patch, basePlace = places.find(p => p.data.id === id)?.data;
  const kitchen = placeData.kitchen !== undefined ? placeData.kitchen : basePlace?.kitchen;
  if (!base && place?.origin !== 'staff') throw new HttpError(404, 'Menu not found.');
  if (act === 'clear') {
    checkOptionsMenu(kitchen, placeData.venueDiet ?? basePlace?.venueDiet, visibleDiets(base?.data, {}));
    return visibility(member, 'menu', id, expected, 'clear', reason);
  }
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
      if (next.diet && next.diet !== original!.diet) change.diet = next.diet;
      if (Object.keys(change).length) items[key] = change; else delete items[key];
    } else if (act === 'hide' || act === 'restore') {
      const rest = { ...items[key] };
      delete rest.hidden;
      if (act === 'hide') items[key] = { ...rest, hidden: true }; else if (Object.keys(rest).length) items[key] = rest; else delete items[key];
    } else if (act === 'add') {
      if (added.length >= 2000) throw new HttpError(409, 'A place can have up to 2000 added dishes.');
      if (!base && !(place?.data as Patch)?.sourceUrl) throw new HttpError(409, 'Add a source link to the place first.');
      added.push(menuItem(input.item, 'staff-' + crypto.randomUUID().slice(0, 12)));
    } else {
      const dish = text(input.dishId, 'dish', 40), index = added.findIndex(d => d.id === dish);
      if (index < 0) throw new HttpError(404, 'Dish not found. Refresh the menu.');
      if (act === 'remove-added') added.splice(index, 1); else added[index] = menuItem(input.item, dish);
    }
    // Explore lists a place only while it has a dish, so the last dish cannot be hidden or removed here.
    const visible = (base?.data.sections ?? []).reduce((n, s) => n + s.items.filter(item => !items[s.id + '/' + item.id]?.hidden).length, 0) + added.length;
    if (!visible && act !== 'restore') throw new HttpError(409, 'This is the last dish. Hide the place instead, or add another dish first.');
    const next = { ...data, items, added, ...(base ? { base: base.hash } : {}) };
    checkOptionsMenu(kitchen, placeData.venueDiet ?? basePlace?.venueDiet, visibleDiets(base?.data, next));
    return Object.keys(items).length || added.length || row?.hidden ? { origin: 'edit', hidden: !!row?.hidden, data: next } : null;
  }, { dish: key || input.dishId || null });
}
