import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { hash, requireValue, validHash, validId, validateSources, validateRecipe, validateEvent, validateVenue } from './validation.mjs';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const references = JSON.parse(readFileSync(path.resolve('server-assets/editorial-references.json'), 'utf8')).entries;
const menus = JSON.parse(readFileSync(path.resolve('server-assets/editorial-menu-baseline.json'), 'utf8'));

export const emptySnapshot = () => ({ version: 1, revision: '0'.repeat(64), records: {} });
export const moderationKey = (kind, data) => kind + ':' + (kind === 'recipe' ? data.name : [data.title, data.organiser, data.startsAt?.slice(0, 10)].join('|')).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}|]+/gu, '');
export const suppressed = (snapshot, kind, id, data) => Object.values(snapshot.removals ?? {}).some(r => r.kind === kind && (r.id === id || r.identity === moderationKey(kind, data)));
const snapshots = new Map();
export async function readSnapshot(root) {
  try {
    const file = path.join(root, 'active.json'), stat = await fs.stat(file), marker = [stat.ino, stat.mtimeMs, stat.size].join(':');
    const cached = snapshots.get(root); if (cached?.marker === marker) return cached.data;
    requireValue(stat.size <= 8 * 1024 * 1024, 'Snapshot exceeds limit');
    const raw = await fs.readFile(file); requireValue(raw.length <= 8 * 1024 * 1024, 'Snapshot exceeds limit'); const data = JSON.parse(raw.toString('utf8'));
    snapshots.set(root, { marker, data }); while (snapshots.size > 4) snapshots.delete(snapshots.keys().next().value);
    return data;
  }
  catch (error) { if (error.code === 'ENOENT') return emptySnapshot(); throw error; }
}
const staleLockMs = 10 * 60000;
/** Takes the publication lock. A lock older than any real publication was left by a crashed process and is reclaimed. */
async function acquire(lock) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try { await fs.mkdir(lock); return; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    const age = await fs.stat(lock).then(info => Date.now() - info.mtimeMs, e => { if (e.code === 'ENOENT') return Infinity; throw e; });
    if (age < staleLockMs) break;
    await fs.rm(lock, { recursive: true, force: true });
  }
  throw Object.assign(new Error('Publication busy; retry later'), { status: 409 });
}
async function atomic(file, value) {
  const temp = file + '.' + process.pid + '.tmp';
  const handle = await fs.open(temp, 'w', 0o600);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(temp, file);
  if (process.platform !== 'win32') { const dir = await fs.open(path.dirname(file)); try { await dir.sync(); } finally { await dir.close(); } }
}
export function recordState(snapshot, baseline, kind, id) {
  const entry = snapshot.records[kind + ':' + id];
  const base = kind === 'venue' ? baseline.venues.find(v => v.id === id) : null;
  // Overlays are tied to the exact packaged branch, so a later app release cannot silently inherit an obsolete edit.
  const active = entry && (kind !== 'venue' || entry.baseHash === hash(base));
  const data = kind === 'venue' ? (base ? { ...base, ...(active ? entry.data : {}) } : null) : entry?.data ?? null;
  return { data, hash: data ? hash(data) : null };
}
function jpegDimensions(bytes) {
  requireValue(bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217, 'Asset must be JPEG');
  let p = 2;
  while (p + 8 < bytes.length) {
    requireValue(bytes[p++] === 255, 'Invalid JPEG marker');
    while (bytes[p] === 255) p++;
    const marker = bytes[p++];
    if (marker === 0xda || marker === 0xd9) break;
    const length = bytes.readUInt16BE(p); requireValue(length >= 2 && p + length <= bytes.length, 'Invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { height: bytes.readUInt16BE(p + 3), width: bytes.readUInt16BE(p + 5) };
    p += length;
  }
  throw Object.assign(new Error('JPEG dimensions missing'), { status: 422 });
}
export async function publish(root, baseline, batch) {
  requireValue(batch && batch.version === 1 && validId(batch.id) && validHash(batch.parent) && Array.isArray(batch.records) && batch.records.length >= 1 && batch.records.length <= 12 && Array.isArray(batch.assets) && batch.assets.length <= 2, 'Invalid publication batch');
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const lock = path.join(root, 'publish.lock');
  await acquire(lock);
  try {
    await fs.mkdir(path.join(root, 'revisions'), { recursive: true, mode: 0o700 });
    await fs.mkdir(path.join(root, 'receipts'), { recursive: true, mode: 0o700 });
    await fs.mkdir(path.join(root, 'assets'), { recursive: true, mode: 0o700 });
    const receiptPath = path.join(root, 'receipts', batch.id + '.json'), batchHash = hash(batch);
    try {
      const prior = JSON.parse(await fs.readFile(receiptPath, 'utf8'));
      requireValue(prior.batchHash === batchHash, 'Batch ID was already used for different content');
      return { ...prior, replayed: true };
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const current = await readSnapshot(root);
    // Recovery after an acknowledged disk switch but before the receipt write.
    if (current.batchId === batch.id && current.batchHash === batchHash) {
      const receipt = { id: batch.id, batchHash, revision: current.revision, parent: current.parent, publishedAt: current.publishedAt, records: batch.records.map(r => r.kind + ':' + r.id), changes: batch.records.map(r => current.records[r.kind + ':' + r.id]?.change).filter(Boolean) };
      await atomic(receiptPath, receipt); return { ...receipt, replayed: true };
    }
    // Unrelated owner actions must not invalidate an exact, reviewed venue patch.
    // Check every affected effective record under the same lock as the write.
    if (current.revision !== batch.parent && !batch.records.every(r => r.kind === 'venue' && validHash(r.expectedHash) && r.expectedHash === recordState(current, baseline, r.kind, r.id).hash)) {
      throw Object.assign(new Error('Publication baseline changed'), { status: 409 });
    }
    requireValue((await fs.statfs(root)).bavail * (await fs.statfs(root)).bsize >= 2 * 1024 ** 3, 'Insufficient publication disk reserve');
    const assets = new Map();
    for (const a of batch.assets) {
      requireValue(validHash(a.sha256) && typeof a.base64 === 'string' && a.base64.length <= 700000 && /^[A-Za-z0-9+/]*={0,2}$/.test(a.base64), 'Invalid image payload');
      const bytes = Buffer.from(a.base64, 'base64'), dimensions = jpegDimensions(bytes);
      requireValue(bytes.length <= 512 * 1024 && hash(bytes) === a.sha256 && dimensions.width >= 320 && dimensions.width <= 1600 && dimensions.height >= 240 && dimensions.height <= 1600, 'Invalid image hash/size');
      try { await sharp(bytes, { limitInputPixels: 1600 * 1600, failOn: 'warning' }).raw().toBuffer(); }
      catch { requireValue(false, 'Image cannot be fully decoded'); }
      requireValue(a.review?.decision === 'approved' && a.review.sha256 === a.sha256 && a.review.reviewedBy === 'QT Manager' && ['original-generated-recipe-illustration', 'approved-reference-enhancement'].includes(a.provenance?.kind), 'Image requires hash-bound visual review');
      if (a.provenance.kind === 'approved-reference-enhancement') requireValue(references.some(r => r.status === 'approved' && r.venueId === a.provenance.venueId && r.sha256 === a.provenance.referenceSha256 && r.rightsApprovalId === a.provenance.rightsApprovalId), 'Approved exact-branch reference required');
      assets.set(a.sha256, { bytes, dimensions, provenance: a.provenance, review: a.review });
    }
    const next = structuredClone(current), seen = new Set();
    for (const r of batch.records) {
      requireValue(['venue', 'recipe', 'event'].includes(r.kind) && validId(r.id) && r.data?.id === r.id && !seen.has(r.kind + ':' + r.id), 'Invalid or repeated record'); seen.add(r.kind + ':' + r.id);
      requireValue(r.review?.decision === 'approved' && r.review.reviewedBy === 'QT Manager' && r.review.dataHash === hash(r.data) && typeof r.review.reason === 'string' && r.review.reason.length >= 10 && r.review.reason.length <= 1800, 'Manager approval must match the exact data');
      validateSources(r.sources);
      requireValue(r.kind === 'venue' || !suppressed(current, r.kind, r.id, r.data), 'Owner removed this content; automatic republication is blocked');
      requireValue(!Object.values(current.reverts ?? {}).some(x => x.kind === r.kind && x.id === r.id && (x.dataHash === hash(r.data) || (r.proposalHash && x.proposalHash === r.proposalHash))), 'Owner reverted this proposal; automatic republication is blocked');
      const capturedUrls = new Set(r.sources.map(s => s.url));
      const previousData = recordState(current, baseline, r.kind, r.id).data;
      const retainedUrls = new Set(r.kind === 'venue' ? [...(previousData?.sourceUrls ?? []), previousData?.hours?.sourceUrl, previousData?.photo?.sourceUrl, ...(menus.find(m => m.id === r.id)?.sections ?? []).map(s => s.sourceUrl)] : []);
      // A retained reference is not a newly verified claim. New references and
      // every factual hours/price change still require a fresh attached capture.
      const citedUrls = r.kind === 'recipe' ? r.data.provenance?.sources ?? [] : r.kind === 'event' ? r.data.sources ?? [] : [...(r.data.sourceUrls ?? []).filter(url => !retainedUrls.has(url)), ...(r.data.hours ? [r.data.hours.sourceUrl] : []), ...(r.data.menuPrices ?? []).map(p => p.sourceUrl)];
      requireValue(citedUrls.every(url => capturedUrls.has(url)), 'Published source lacks a capture');
      requireValue(r.expectedHash === recordState(current, baseline, r.kind, r.id).hash, 'Record changed since review');
      const base = baseline.venues.find(v => v.id === r.id);
      if (r.kind === 'venue') validateVenue(r.data, base, menus.find(m => m.id === r.id));
      if (r.kind === 'recipe') {
        validateRecipe(r.data);
        const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
        requireValue(!baseline.recipes.some(x => x.id === r.id || norm(x.name) === norm(r.data.name)) && !Object.values(current.records).some(x => x.kind === 'recipe' && x.id !== r.id && norm(x.data.name) === norm(r.data.name)), 'Existing recipe identity');
        const prior = current.records['recipe:' + r.id];
        requireValue(!prior || r.data.revision > prior.data.revision, 'Recipe revision must advance');
      }
      if (r.kind === 'event') validateEvent(r.data);
      const image = r.data.image ?? r.data.photo;
      if (image) {
        const sha = image.path.match(/([a-f0-9]{64})\.jpg$/)?.[1], asset = assets.get(sha);
        let stored;
        if (!asset) try { stored = JSON.parse(await fs.readFile(path.join(root, 'assets', sha + '.json'), 'utf8')); } catch { /* Fail closed. */ }
        const metadata = asset ?? stored;
        requireValue(metadata && metadata.dimensions.width === image.width && metadata.dimensions.height === image.height, 'Reviewed image is missing or dimensions differ');
        if (r.kind === 'venue') {
          requireValue(metadata.provenance.kind === 'approved-reference-enhancement' && metadata.provenance.venueId === r.id, 'Image belongs to another venue');
          const reference = references.find(ref => ref.sha256 === metadata.provenance.referenceSha256 && ref.venueId === r.id);
          requireValue(reference && ['author', 'sourceUrl', 'license', 'licenseUrl', 'capturedAt'].every(key => image[key] === reference.photo[key]), 'Original photo attribution/licence must be retained');
        }
        if (r.kind === 'recipe') requireValue(metadata.provenance.kind === 'original-generated-recipe-illustration' && metadata.provenance.recipeId === r.id, 'Image belongs to another recipe');
      }
      const existing = current.records[r.kind + ':' + r.id];
      let data = r.data;
      if (r.kind === 'venue') {
        const prior = existing?.baseHash === hash(base) ? existing.data : {};
        data = { ...prior, ...r.data };
        if (r.data.menuPrices) { const prices = new Map((prior.menuPrices ?? []).map(p => [p.sectionId + ':' + p.itemId, p])); for (const p of r.data.menuPrices) prices.set(p.sectionId + ':' + p.itemId, p); requireValue(prices.size <= 500, 'Price-update capacity reached'); data.menuPrices = [...prices.values()]; }
      }
      next.records[r.kind + ':' + r.id] = { kind: r.kind, id: r.id, data, sources: r.sources, review: r.review, baseHash: r.kind === 'venue' ? hash(base) : null, checkedAt: new Date().toISOString() };
      const before = recordState(current, baseline, r.kind, r.id), after = recordState(next, baseline, r.kind, r.id);
      const fields = Object.keys(r.data).filter(k => k !== 'id' && hash(before.data?.[k] ?? null) !== hash(after.data?.[k] ?? null));
      next.records[r.kind + ':' + r.id].change = {
        changeId: hash({ batchHash, kind: r.kind, id: r.id }), kind: r.kind, id: r.id,
        name: (after.data.name ?? after.data.title ?? r.id) + (r.kind === 'venue' && after.data.branch ? ' — ' + after.data.branch : ''), parent: current.revision,
        reviewedParent: batch.parent, beforeHash: before.hash, afterHash: after.hash,
        dataHash: hash(r.data), proposalHash: r.proposalHash ?? null, fields,
        retainedSourceUrls: (r.data.sourceUrls ?? []).filter(url => retainedUrls.has(url) && !capturedUrls.has(url)),
        before: Object.fromEntries(fields.map(k => [k, before.data?.[k] ?? null])),
        after: Object.fromEntries(fields.map(k => [k, after.data?.[k] ?? null])),
      };
    }
    next.parent = current.revision; next.batchId = batch.id; next.batchHash = batchHash; next.publishedAt = new Date().toISOString();
    next.revision = hash({ parent: next.parent, batchHash });
    requireValue(Buffer.byteLength(JSON.stringify(next)) <= 8 * 1024 * 1024 && Object.keys(next.records).length <= 2000, 'Content capacity reached; operator review required');
    requireValue((await fs.readdir(path.join(root, 'revisions'))).length < 400, 'Revision archive capacity reached; archive before continuing');
    for (const [sha, a] of assets) {
      // Immutable: an asset is written once, before the atomic content switch.
      try {
        const file = await fs.open(path.join(root, 'assets', sha + '.jpg'), 'wx', 0o600);
        try { await file.writeFile(a.bytes); await file.sync(); } finally { await file.close(); }
      } catch (e) { if (e.code !== 'EEXIST') throw e; }
      await atomic(path.join(root, 'assets', sha + '.json'), { dimensions: a.dimensions, provenance: a.provenance, review: a.review });
    }
    await atomic(path.join(root, 'revisions', current.revision + '.json'), current);
    await atomic(path.join(root, 'revisions', next.revision + '.json'), next);
    await atomic(path.join(root, 'active.json'), next);
    const receipt = { id: batch.id, batchHash, revision: next.revision, parent: current.revision, publishedAt: next.publishedAt, records: [...seen], changes: [...seen].map(key => next.records[key].change) };
    await atomic(receiptPath, receipt);
    return receipt;
  } finally { await fs.rmdir(lock); }
}
export async function rollback(root, expected, target) {
  requireValue(validHash(expected) && validHash(target), 'Invalid revision');
  const lock = path.join(root, 'publish.lock');
  await acquire(lock);
  try {
    const current = await readSnapshot(root);
    if (current.revision !== expected) throw Object.assign(new Error('Publication baseline changed'), { status: 409 });
    const previous = JSON.parse(await fs.readFile(path.join(root, 'revisions', target + '.json'), 'utf8'));
    requireValue(previous.revision === target, 'Invalid archived revision');
    requireValue(JSON.stringify(previous.removals ?? {}) === JSON.stringify(current.removals ?? {}), 'Rollback would undo owner removals; operator reconciliation required');
    requireValue(JSON.stringify(previous.reverts ?? {}) === JSON.stringify(current.reverts ?? {}), 'Rollback would undo owner reverts; operator reconciliation required');
    await atomic(path.join(root, 'active.json'), previous);
    await fs.appendFile(path.join(root, 'rollback.jsonl'), JSON.stringify({ at: new Date().toISOString(), from: expected, to: target }) + '\n', { mode: 0o600 });
    return { revision: target, rolledBackFrom: expected };
  } finally { await fs.rmdir(lock); }
}

export async function revertRecord(root, baseline, request) {
  requireValue(request && validId(request.actionId) && ['venue', 'recipe', 'event'].includes(request.kind) && validId(request.id) && validHash(request.expectedHash) && validHash(request.changeId) && request.actor === 'telegram-owner', 'Invalid revert request');
  const lock = path.join(root, 'publish.lock');
  await acquire(lock);
  try {
    const current = await readSnapshot(root), key = request.kind + ':' + request.id, actionHash = hash(request);
    const prior = current.reverts?.[request.actionId];
    if (prior) { requireValue(prior.actionHash === actionHash, 'Revert action was already used'); return { ...prior, revision: current.revision, replayed: true }; }
    const change = current.records[key]?.change;
    requireValue(change && change.changeId === request.changeId && change.afterHash === request.expectedHash && recordState(current, baseline, request.kind, request.id).hash === request.expectedHash, 'Record changed since this report; a newer change cannot be reverted by an old button');
    const archived = JSON.parse(await fs.readFile(path.join(root, 'revisions', change.parent + '.json'), 'utf8'));
    requireValue(archived.revision === change.parent && recordState(archived, baseline, request.kind, request.id).hash === change.beforeHash, 'Original baseline changed; operator review required');
    // A new recipe/event uses removal, so owner identity suppression is retained.
    requireValue(request.kind === 'venue' || archived.records[key], 'New items must use Delete');
    const next = structuredClone(current), restored = archived.records[key];
    if (restored) next.records[key] = structuredClone(restored); else delete next.records[key];
    const revertedAt = new Date().toISOString();
    const receipt = { ...request, actionHash, dataHash: change.dataHash, proposalHash: change.proposalHash, name: change.name, restoredHash: change.beforeHash, revertedAt };
    next.reverts = { ...(next.reverts ?? {}), [request.actionId]: receipt };
    next.parent = current.revision; next.batchId = request.actionId; next.batchHash = actionHash; next.publishedAt = revertedAt;
    next.revision = hash({ parent: current.revision, revert: receipt });
    requireValue(Buffer.byteLength(JSON.stringify(next)) <= 8 * 1024 * 1024 && Object.keys(next.reverts).length <= 2000, 'Moderation capacity reached');
    requireValue((await fs.readdir(path.join(root, 'revisions'))).length < 400, 'Revision archive capacity reached; archive before continuing');
    await atomic(path.join(root, 'revisions', current.revision + '.json'), current);
    await atomic(path.join(root, 'revisions', next.revision + '.json'), next);
    await atomic(path.join(root, 'active.json'), next);
    return { ...receipt, revision: next.revision, replayed: false };
  } finally { await fs.rmdir(lock); }
}

export async function removeRecord(root, request) {
  requireValue(request && validId(request.actionId) && ['recipe', 'event'].includes(request.kind) && validId(request.id) && validHash(request.expectedHash) && request.actor === 'telegram-owner', 'Invalid removal request');
  const lock = path.join(root, 'publish.lock');
  await acquire(lock);
  try {
    const current = await readSnapshot(root), key = request.kind + ':' + request.id;
    const actionHash = hash(request), prior = current.removals?.[key];
    if (prior?.actionId === request.actionId) {
      requireValue(prior.actionHash === actionHash, 'Removal action was already used');
      return { ...prior, replayed: true, revision: current.revision };
    }
    requireValue(!Object.values(current.removals ?? {}).some(r => r.actionId === request.actionId), 'Removal action was already used');
    const row = current.records[key];
    requireValue(row && hash(row.data) === request.expectedHash, 'Record changed or was already removed; select it again');
    const next = structuredClone(current), removedAt = new Date().toISOString();
    const removal = { kind: request.kind, id: request.id, name: row.data.name ?? row.data.title, identity: moderationKey(request.kind, row.data), actionId: request.actionId, actionHash, expectedHash: request.expectedHash, actor: request.actor, removedAt };
    next.removals = { ...(next.removals ?? {}), [key]: removal };
    delete next.records[key];
    next.parent = current.revision; next.batchId = request.actionId; next.batchHash = actionHash; next.publishedAt = removedAt;
    next.revision = hash({ parent: current.revision, removal });
    requireValue(Buffer.byteLength(JSON.stringify(next)) <= 8 * 1024 * 1024 && Object.keys(next.removals).length <= 2000, 'Moderation capacity reached');
    await fs.mkdir(path.join(root, 'revisions'), { recursive: true, mode: 0o700 });
    requireValue((await fs.readdir(path.join(root, 'revisions'))).length < 400, 'Revision archive capacity reached; archive before continuing');
    await atomic(path.join(root, 'revisions', current.revision + '.json'), current);
    await atomic(path.join(root, 'revisions', next.revision + '.json'), next);
    await atomic(path.join(root, 'active.json'), next);
    return { ...removal, revision: next.revision, replayed: false };
  } finally { await fs.rmdir(lock); }
}
