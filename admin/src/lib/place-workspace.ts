import 'server-only';
import { query } from './db';
import { authorize, type Session } from './session';
import { HttpError, text } from './http';
import { packagedMenu, packagedPlaces, type MenuItem } from './content-base';
import { contentId, expectedVersion, newId, writePlaceWorkspace } from './content-store';
import { asList, asRecord, checkOptionsMenu, day, menuItem, photo, url } from './content-validate';
import { placeFields, refuseListed, same, visibleDiets, type MenuData } from './content-catalogue';

/** Only supplied fields change; an old client cannot accidentally erase photo metadata or dish qualifications. */
async function dishFields(raw: unknown, id: string, knownPhotos: Set<string>) {
  const value = asRecord(raw, 'dish'), dish = menuItem(value, id);
  const pictured = value.photo === undefined ? undefined : photo(value.photo);
  if (pictured && !knownPhotos.has(pictured.path) && !(await query('SELECT 1 FROM content.asset WHERE sha256=$1', [pictured.path.split('/').pop()!.slice(0,64)])).rowCount) throw new HttpError(400, 'Upload the dish photo again.');
  return { ...dish, qualifier: text(value.qualifier ?? '', 'price conditions', 4000, 0), availability: text(value.availability ?? '', 'availability', 1000, 0),
    ...(pictured !== undefined ? { photo: pictured } : {}), hidden: value.hidden === true };
}

export async function placeWorkspaceAction(member: Session, input: Record<string, unknown>, reason: string) {
  authorize(member, 'content');
  const creating = input.action === 'create-workspace';
  if (!creating && input.action !== 'save-workspace') throw new HttpError(400, 'Check action.');
  const places = await packagedPlaces(), id = creating ? newId(String(asRecord(input.fields, 'place').name)) : contentId(input.id, 'place');
  const base = creating ? null : places.find(p => p.data.id === id) ?? null, menu = creating ? null : await packagedMenu(id);
  if (!creating && (input.baseHash !== (base?.hash ?? null) || input.menuBaseHash !== (menu?.hash ?? null))) throw new HttpError(409, 'The source changed. Refresh before saving.');
  const fields = await placeFields(input, base?.data ?? null), raw = asRecord(input.fields, 'place');
  if (creating && input.allowDuplicate !== true) await refuseListed(fields);
  const sourceUrl = raw.sourceUrl ? url(raw.sourceUrl, 'place source') : undefined;
  const research = raw.research === undefined ? undefined : asRecord(raw.research, 'research');
  const proof = raw.dietProof === undefined ? undefined : raw.dietProof === null ? null : asRecord(raw.dietProof, 'kitchen evidence');
  const extra = { ...(sourceUrl ? { sourceUrl } : {}), ...(research ? { research: { sourceUrls: asList(research.sourceUrls, 'sources', 30).map(s => url(s, 'source')),
    ...(research.checkedAt ? { checkedAt: day(research.checkedAt, 'research checked date') } : {}) } } : {}),
    ...(proof !== undefined ? { dietProof: proof ? { sourceUrl: url(proof.sourceUrl, 'kitchen source'), quote: text(proof.quote, 'venue statement', 2000), checkedAt: day(proof.checkedAt, 'kitchen checked date') } : null } : {}) };
  const originals = new Map(menu?.data.sections.flatMap(s => s.items.map(item => [s.id + '/' + item.id, item] as const)) ?? []);
  const photos = new Set([...originals.values()].flatMap(d => d.photo ? [d.photo.path] : []));
  const edits = await Promise.all(asList(input.dishes ?? [], 'dish changes', 2000).map(async raw => {
    const v = asRecord(raw, 'dish change'), key = text(v.key, 'dish key', 250);
    const kind = v.kind; if (!['base','staff','new'].includes(String(kind))) throw new HttpError(400, 'Check dish type.');
    return { kind, key, remove: v.remove === true, item: v.remove === true ? null : await dishFields(v.item, kind === 'new' ? 'staff-' + crypto.randomUUID().slice(0,12) : key, photos) };
  }));
  if (new Set(edits.map(e => e.kind + ':' + e.key)).size !== edits.length) throw new HttpError(400, 'A dish was submitted twice.');
  return writePlaceWorkspace(member, id, { place: expectedVersion(input.version), menu: expectedVersion(input.menuVersion) }, reason, (row, menuRow) => {
    if (!creating && !base && row?.origin !== 'staff') throw new HttpError(404, 'Place not found.');
    if (creating && (row || menuRow)) throw new HttpError(409, 'Place already exists.');
    const data = structuredClone((menuRow?.data ?? {}) as MenuData), items = data.items ?? {}, added = data.added ?? [];
    for (const edit of edits) {
      if (edit.kind === 'base') {
        const original = originals.get(edit.key); if (!original || edit.remove) throw new HttpError(400, 'Hide a source dish instead of removing it.');
        const next = edit.item!, patch: Partial<MenuItem> = { ...items[edit.key] };
        for (const key of ['name','category','price','qualifier','availability','photo','diet','hidden'] as const) {
          if (key === 'diet' && !next.diet && original.diet) throw new HttpError(400, 'Keep the venue’s V or VG label.');
          const value = next[key]; if (key === 'photo' && value === undefined) continue;
          if (same(value ?? null, original[key] ?? (key === 'hidden' ? false : key === 'category' || key === 'availability' || key === 'qualifier' ? '' : null))) delete patch[key];
          else Object.assign(patch, { [key]: value });
        }
        if (Object.keys(patch).length) items[edit.key] = patch; else delete items[edit.key];
      } else if (edit.kind === 'new') {
        if (edit.remove) throw new HttpError(400, 'Check new dish.');
        added.push(edit.item!);
      } else {
        const at = added.findIndex(d => d.id === edit.key); if (at < 0) throw new HttpError(409, 'Dish changed. Refresh before saving.');
        if (edit.remove) added.splice(at,1); else added[at] = { ...added[at], ...edit.item!, id: added[at].id };
      }
    }
    if (added.length > 2000) throw new HttpError(400, 'A place can have up to 2000 added dishes.');
    const menuData = { ...data, items, added, ...(menu ? { base: menu.hash } : {}) };
    const diets = visibleDiets(menu?.data, menuData);
    if (!diets.length && edits.length && !row?.hidden) throw new HttpError(409, 'Keep one visible dish, or hide the place first.');
    checkOptionsMenu(fields.kitchen, fields.venueDiet, diets);
    const staff = creating || row?.origin === 'staff', complete = { ...fields, ...extra };
    if (staff && !sourceUrl) throw new HttpError(400, 'Add the place source.');
    const differences = { ...row?.data }; delete differences.base;
    for (const [key,value] of Object.entries(complete)) {
      if (same(value ?? null, (base?.data as Record<string,unknown> | undefined)?.[key] ?? null)) delete differences[key];
      else differences[key] = value;
    }
    return { place: staff ? { origin: 'staff', hidden: !!row?.hidden, data: { ...row?.data, ...complete } }
      : Object.keys(differences).length || row?.hidden ? { origin: 'edit', hidden: !!row?.hidden, data: { ...differences, base: base!.hash } } : null,
      menu: Object.keys(items).length || added.length || menuRow?.hidden ? { origin: 'edit', hidden: !!menuRow?.hidden, data: menuData } : null };
  });
}
