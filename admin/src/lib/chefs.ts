import 'server-only';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { audit } from './audit';
import { lockPermission, type Session } from './session';
import { can } from './permissions';
import { choice, HttpError, pageSize, text, uuid } from './http';
import { settings } from './config';
import { CHEFS, HANDOFF, LANES, controlKey, modeOf, type Lane, type Mode, type Why } from './chef-lanes';

/**
 * Chef decisions (docs/ADMIN_CHEFS_PLAN.md §2 and §6). A chef proposes, Kaya reviews on the bot side, and this decides what
 * happens: Watch only records; On carries the decision out unless Kaya disagreed, the chef was unsure or the lane says to ask,
 * and then the owner answers on Telegram or here. Every outcome is kept, and a carried-out decision can be undone.
 */
type Row = { id: string; chef: string; lane: string; target: string; action: string; input: Record<string, unknown>; reason: string;
  evidence: Record<string, unknown>; confidence: number | null; review: string; why_ask: Why | null; mode: Mode; outcome: string;
  result: { undo?: Record<string, unknown> | null }; note: string; created_at: Date; decided_at: Date | null; decided_by: string | null };

function json(value: unknown, name: string, max: number) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > max) throw new HttpError(400, `Check ${name}.`);
  return value as Record<string, unknown>;
}
async function laneMode(db: PoolClient, lane: string): Promise<Mode> {
  return modeOf((await db.query<{ enabled: boolean; notice: string }>('SELECT enabled, notice FROM ops.control WHERE key=$1', [controlKey(lane)])).rows[0]);
}
function laneOf(chef: string, value: unknown): [string, Lane] {
  const lane = typeof value === 'string' && Object.hasOwn(LANES, value) ? LANES[value] : null;
  if (!lane || lane.chef !== chef) throw new HttpError(403, 'Not this chef\'s lane.');
  return [value as string, lane];
}
const short = (value: string) => value.slice(0, 300);

/**
 * A chef's work: its lane's mode and, unless the lane is off, what waits for a decision. A paged lane gives the next page after
 * `after` and says whether more follow. Each item carries `round`, how many decisions it already has: the chef puts it in its
 * idempotency key, so an item offered again (the lane turned On after watching it, or 7 days after a turned-down, failed or undone
 * decision) gets a new decision instead of the old answer.
 */
export async function chefLane(chef: string, value: unknown, after: string | null = null) {
  const [name, lane] = laneOf(chef, value);
  if (after !== null && (!lane.paged || !/^[0-9a-f-]{36}$/.test(after))) throw new HttpError(400, 'Check after.');
  const mode = modeOf((await query<{ enabled: boolean; notice: string }>('SELECT enabled, notice FROM ops.control WHERE key=$1', [controlKey(name)])).rows[0]);
  let items: Record<string, unknown>[] = [], handoff: Record<string, unknown>[] | undefined;
  try {
    if (mode !== 'off') items = await withRounds(name, await lane.queue(mode, after));
    if (lane.handoff) handoff = await lane.handoff();
  } catch (error) {
    if (!['42P01', '3F000'].includes((error as { code?: string })?.code ?? '')) throw error;
    return { lane: name, mode, installed: false, items: [] };
  }
  return { lane: name, mode, floor: lane.floor, actions: Object.keys(lane.actions), items, ...(lane.paged ? { more: items.length >= lane.paged } : {}),
    ...(handoff ? { handoff, handoffComplete: handoff.length < HANDOFF } : {}) };
}
async function withRounds(lane: string, items: Record<string, unknown>[]) {
  if (!items.length) return items;
  const counts = new Map((await query<{ target: string; n: number }>(`SELECT target, count(*)::int AS n FROM ops.chef_decision
    WHERE lane = $1 AND target = ANY($2) GROUP BY target`, [lane, items.map(i => String(i.id))])).rows.map(r => [r.target, r.n]));
  return items.map(i => ({ ...i, round: counts.get(String(i.id)) ?? 0 }));
}

/** Records one decision and carries it out when the lane is On and nothing makes it unclear. Repeating an idem returns the first answer. */
export async function chefDecide(chef: string, input: Record<string, unknown>) {
  const [name, lane] = laneOf(chef, input.lane);
  const action = choice(input.action, Object.keys(lane.actions), 'action'), step = lane.actions[action];
  const target = text(input.target, 'target', 200), reason = text(input.reason, 'reason', 500), idem = text(input.idem, 'idempotency key', 120, 8);
  const review = choice(input.review, ['agree', 'disagree'] as const, 'review');
  const confidence = input.confidence === undefined || input.confidence === null ? null : Number(input.confidence);
  if (confidence !== null && !(confidence >= 0 && confidence <= 1)) throw new HttpError(400, 'Check confidence.');
  const details = json(input.input, 'input', 8000), evidence = json(input.evidence, 'evidence', 16000);
  return transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['chef:' + chef + ':' + idem]);
    const prior = (await db.query<Row>('SELECT id, outcome, note, why_ask FROM ops.chef_decision WHERE chef=$1 AND idem=$2', [chef, idem])).rows[0];
    if (prior) return { id: prior.id, outcome: prior.outcome, note: prior.note, why: prior.why_ask, repeated: true };
    const mode = await laneMode(db, name);
    if (mode === 'off') throw new HttpError(409, 'This lane is off.');
    const asks = step.ask ?? (step.askWhen ? await step.askWhen(db, target, details) : null);
    const why: Why | null = review === 'disagree' ? 'disagree' : asks ?? (confidence === null || confidence < lane.floor ? 'weak' : null);
    let outcome = mode === 'watch' ? 'watched' : why ? 'asked' : 'done', note = '', result = {};
    if (outcome === 'done') {
      await db.query('SAVEPOINT chef_apply');
      try {
        const done = await step.run(db, { id: null, bot: chef }, target, details, reason);
        note = done.note ?? ''; result = { undo: done.undo ?? null };
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        await db.query('ROLLBACK TO SAVEPOINT chef_apply'); outcome = 'failed'; note = error.message;
      }
    }
    const row = (await db.query<{ id: string }>(`INSERT INTO ops.chef_decision(chef,lane,target,action,input,reason,evidence,confidence,review,
      why_ask,mode,outcome,result,note,idem) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`, [chef, name, target, action,
      JSON.stringify(details), reason, JSON.stringify(evidence), confidence, review, why, mode, outcome, JSON.stringify(result), short(note), idem])).rows[0];
    return { id: row.id, outcome, note, why };
  });
}

async function locked(db: PoolClient, id: string) {
  const row = (await db.query<Row>('SELECT * FROM ops.chef_decision WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row) throw new HttpError(404, 'Decision not found.');
  return row;
}
/** Carries out or turns down a decision a chef asked about; a decision already answered is left as it is. */
async function answer(db: PoolClient, row: Row, by: { id: string; email: string }, yes: boolean, via: 'telegram' | 'admin') {
  const actorId = by.id;
  if (row.outcome !== 'asked') return { id: row.id, outcome: row.outcome, note: 'Already answered.', handled: true };
  const step = LANES[row.lane]?.actions[row.action];
  let outcome = yes ? 'failed' : 'rejected', note = yes && !step ? 'This action no longer exists.' : '', result = {};
  if (yes && step) {
    await db.query('SAVEPOINT chef_answer');
    try {
      const done = await step.run(db, { id: actorId, email: by.email, proposedBy: row.chef }, row.target, row.input, short(CHEFS[row.chef] + ': ' + row.reason));
      outcome = 'approved'; note = done.note ?? ''; result = { undo: done.undo ?? null };
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      await db.query('ROLLBACK TO SAVEPOINT chef_answer'); outcome = 'failed'; note = error.message;
    }
  }
  await db.query('UPDATE ops.chef_decision SET outcome=$2, note=$3, result=$4, decided_at=now(), decided_by=$5 WHERE id=$1',
    [row.id, outcome, short(note), JSON.stringify(result), actorId]);
  await audit(db, actorId, 'chef.' + outcome, row.lane + ':' + row.target, (yes ? 'Approved ' : 'Turned down ') + CHEFS[row.chef] + '\'s ' + row.action,
    { decision: row.id, chef: row.chef, via });
  return { id: row.id, outcome, note };
}

/** The owner's tap on a Telegram ask card, brought by Kaya's reporter (the paired chat was checked there). */
export async function ownerAnswer(input: Record<string, unknown>) {
  const id = uuid(input.id, 'decision'), yes = choice(input.answer, ['approve', 'reject'] as const, 'answer') === 'approve';
  return transaction(async db => {
    // The paired Telegram chat is the owner's (ADMIN_OWNER_EMAIL), so the answer is recorded as that staff member.
    const owner = (await db.query<{ id: string; email: string }>("SELECT id, email FROM staff.member WHERE lower(email)=$1 AND role='owner' AND active",
      [settings().ownerEmail])).rows[0];
    if (!owner) throw new HttpError(409, 'The owner account is not active.');
    return answer(db, await locked(db, id), owner, yes, 'telegram');
  });
}

/** Staff answer an ask, or undo what a chef (or an approved ask) did, from the Chef decisions page. */
export async function staffChefAction(member: Session, input: Record<string, unknown>, reason: string) {
  const id = uuid(input.id, 'decision'), act = choice(input.action, ['approve', 'reject', 'undo'] as const, 'action');
  return transaction(async db => {
    const row = await locked(db, id), lane = LANES[row.lane];
    if (!lane) throw new HttpError(409, 'This lane no longer exists.');
    await lockPermission(db, member, lane.capability);
    if (act !== 'undo') return answer(db, row, member, act === 'approve', 'admin');
    const step = lane.actions[row.action];
    if (!['done', 'approved'].includes(row.outcome) || !step?.undo || !row.result.undo) throw new HttpError(409, 'This decision cannot be undone.');
    await step.undo(db, { id: member.id, email: member.email }, row.target, row.result.undo, reason);
    await db.query("UPDATE ops.chef_decision SET outcome='undone', decided_at=now(), decided_by=$2 WHERE id=$1", [id, member.id]);
    await audit(db, member.id, 'chef.undone', row.lane + ':' + row.target, reason, { decision: id, chef: row.chef });
    return { id, outcome: 'undone', note: 'Undone.' };
  });
}

const VIEWS = { asked: "d.outcome='asked'", done: "d.outcome IN ('done','approved','rejected','undone','failed')", watched: "d.outcome='watched'", all: 'true' };
/** The lanes this staff member can act on (each lane needs its own capability: content, cases or sellers). */
const lanesFor = (member: Session) => Object.entries(LANES).filter(([, lane]) => can(member.role, lane.capability)).map(([name]) => name);
/** Decisions in the lanes this staff member can act on, newest first. */
export async function chefDecisions(member: Session, view: string, skip = 0) {
  const lanes = lanesFor(member);
  if (!lanes.length) throw new HttpError(403, 'You do not have access.');
  const where = VIEWS[choice(view || 'asked', Object.keys(VIEWS) as (keyof typeof VIEWS)[], 'view')];
  const rows = (await query<Row & { decided_email: string | null }>(`SELECT d.*, m.email AS decided_email FROM ops.chef_decision d
    LEFT JOIN staff.member m ON m.id = d.decided_by WHERE ${where} AND d.lane = ANY($1) ORDER BY d.created_at DESC LIMIT ${pageSize} OFFSET $2`,
    [lanes, skip])).rows;
  const names = await labelsFor(rows, () => true);
  return rows.map(r => ({ id: r.id, chef: CHEFS[r.chef] ?? r.chef, lane: LANES[r.lane]?.title ?? r.lane, item: names[r.lane + '|' + r.target] ?? r.target,
    action: r.action, reason: r.reason, evidence: r.evidence, confidence: r.confidence, review: r.review, why: r.why_ask, mode: r.mode, outcome: r.outcome,
    note: r.note, created_at: r.created_at, decided_at: r.decided_at, decided_by: r.decided_email,
    undoable: ['done', 'approved'].includes(r.outcome) && !!r.result?.undo && !!LANES[r.lane]?.actions[r.action]?.undo }));
}

/** Item names keyed "lane|target", one query per lane, for the lanes `which` allows. */
async function labelsFor(rows: { lane: string; target: string }[], which: (lane: Lane) => boolean) {
  const byLane = new Map<string, string[]>();
  for (const r of rows) if (LANES[r.lane] && which(LANES[r.lane])) byLane.set(r.lane, [...(byLane.get(r.lane) ?? []), r.target]);
  const out: Record<string, string> = {};
  await Promise.all([...byLane].map(async ([lane, targets]) => {
    for (const [target, name] of Object.entries(await LANES[lane].labels(targets))) out[lane + '|' + target] = name;
  }));
  return out;
}

/**
 * Asks waiting for the owner made after `after` (the `at` of the last ask the reporter carded), oldest first, for Telegram
 * cards: a backlog of unanswered asks never hides new ones. No item name or reason from lanes about members' own content.
 */
export async function chefAsks(after: string | null) {
  // The cursor is microseconds since 1970 as digits, so it needs no URL encoding (the signature covers the query as sent).
  if (after !== null && !/^\d{1,18}$/.test(after)) throw new HttpError(400, 'Check after.');
  const at = "(extract(epoch FROM created_at) * 1000000)::bigint";
  const rows = (await query<Row & { at: string }>(`SELECT *, ${at}::text AS at FROM ops.chef_decision WHERE outcome='asked'
    AND ($1::bigint IS NULL OR ${at} > $1::bigint) ORDER BY created_at LIMIT 20`, [after])).rows;
  const names = await labelsFor(rows, lane => !lane.member);
  return rows.map(r => {
    const lane = LANES[r.lane];
    return { id: r.id, at: r.at, chef: CHEFS[r.chef] ?? r.chef, lane: lane?.title ?? r.lane, action: r.action, why: r.why_ask, confidence: r.confidence,
      item: lane && !lane.member ? names[r.lane + '|' + r.target] ?? r.target : lane?.privateLabel ?? null, reason: lane && !lane.member ? r.reason.slice(0, 200) : null };
  });
}

/** The last 24 hours per lane (and every ask still waiting), for the daily summary; a "keep" changed nothing, so it is left out.
 * Null before admin/db/chefs.sql is installed. */
export async function chefSummary() {
  try {
    const rows = (await query<{ lane: string; outcome: string; count: number }>(`SELECT lane, outcome, count(*)::int AS count FROM ops.chef_decision
      WHERE (outcome='asked' OR created_at > now() - interval '24 hours') AND action <> 'keep' GROUP BY lane, outcome`)).rows;
    const out: Record<string, { handled: number; asked: number; watched: number; failed: number }> = {};
    for (const r of rows) {
      const lane = out[LANES[r.lane]?.title ?? r.lane] ??= { handled: 0, asked: 0, watched: 0, failed: 0 };
      if (r.outcome === 'done' || r.outcome === 'approved') lane.handled += r.count;
      else if (r.outcome === 'asked') lane.asked += r.count;
      else if (r.outcome === 'watched') lane.watched += r.count;
      else if (r.outcome === 'failed') lane.failed += r.count;
    }
    return out;
  } catch (error) { if ((error as { code?: string })?.code === '42P01') return null; throw error; }
}

/** Asks this staff member can answer, for the console's sidebar count; null without such lanes or before admin/db/chefs.sql. */
export async function chefWaiting(member: Session) {
  const lanes = lanesFor(member);
  if (!lanes.length) return null;
  try { return (await query<{ count: number }>("SELECT count(*)::int AS count FROM ops.chef_decision WHERE outcome='asked' AND lane = ANY($1)", [lanes])).rows[0].count; }
  catch (error) { if ((error as { code?: string })?.code === '42P01') return null; throw error; }
}
