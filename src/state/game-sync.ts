/**
 * Rush Hour account sync (GAME_PLAN Phase B). Members' progress lives on the server; FoodDocument.game is the device's
 * copy of it plus any runs still pending. This module keeps the per-account offline queue, the café-change marker,
 * the staff on/off switch and a request bus for the background sync (components/game/GameSync).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import { applyResult, type GameProgress } from "../game/progress";
import type { Action, Result } from "../game/sim/engine";
import type { RunStart } from "../game/sim/replay";
import { applyRun } from "../game/special";
import { fetchGameStatus, type ServerProgress } from "../services/game-api";

/** A run that started online and finished, waiting for the server to replay and settle it. */
export type PendingRun = { id: string; setup: RunStart; actions: Action[]; result: Result; finishedAt: number };
export type SyncQueue = { imported: boolean; cafeDirty: boolean; runs: PendingRun[] };
const MAX_PENDING = 50;
const queueKey = (userId: string) => "@quintaste/game-sync-v1/" + userId;
const emptyQueue = (): SyncQueue => ({ imported: false, cafeDirty: false, runs: [] });

function readQueueValue(value: unknown): SyncQueue {
  const v = value && typeof value === "object" ? value as Partial<SyncQueue> : {};
  const runs = Array.isArray(v.runs) ? v.runs.filter((r): r is PendingRun => !!r && typeof r.id === "string" && !!r.setup && Array.isArray(r.actions) && !!r.result) : [];
  return { imported: v.imported === true, cafeDirty: v.cafeDirty === true, runs: runs.slice(-MAX_PENDING) };
}
export async function readQueue(userId: string) {
  try { const raw = await AsyncStorage.getItem(queueKey(userId)); return raw ? readQueueValue(JSON.parse(raw)) : emptyQueue(); }
  catch { return emptyQueue(); }
}
let writes: Promise<unknown> = Promise.resolve();
/** Serialised read-change-write of one account's queue. Rejects when the device could not save it. */
export function editQueue(userId: string, change: (queue: SyncQueue) => SyncQueue): Promise<SyncQueue> {
  const next = writes.catch(() => {}).then(async () => {
    const value = readQueueValue(change(await readQueue(userId)));
    await AsyncStorage.setItem(queueKey(userId), JSON.stringify(value));
    return value;
  });
  writes = next;
  return next;
}

// ---------- café changes ----------
let cafeRevision = 0;
/** Counts local café changes so a save that raced a newer change leaves the marker set. */
export const cafeRev = () => cafeRevision;
export function markCafeChanged(userId: string) {
  cafeRevision++;
  void editQueue(userId, q => q.imported ? { ...q, cafeDirty: true } : q).then(() => requestGameSync()).catch(() => {});
}
const CAFE_KEYS = ["pet", "equip", "decor", "skin", "cafeName", "menu", "mode", "signature", "introSeen", "seen"] as const;
export const cafeOf = (g: GameProgress) => Object.fromEntries(CAFE_KEYS.map(k => [k, g[k]])) as Partial<GameProgress>;

/**
 * The device copy: the server's progress, the device's own café look while a change is unsaved, and every pending run
 * applied on top so the next level opens offline. A lotus tier is kept only where the device may preview one.
 */
export function reconcile(server: GameProgress, local: GameProgress, pending: PendingRun[], keepLocalCafe: boolean): GameProgress {
  let game: GameProgress = { ...server, ...(keepLocalCafe ? cafeOf(local) : {}), tier: local.tier };
  for (const run of pending) game = applyRun(game, run.setup, run.result).game;
  return game;
}
type GameUpdate = (change: (game: GameProgress) => GameProgress) => Promise<boolean>;
let lastServer: { userId: string; game: GameProgress } | null = null;
/** Writes server progress into the device document through the given updater. */
export async function applyServer(userId: string, server: ServerProgress, update: GameUpdate) {
  lastServer = { userId, game: server.game };
  const queue = await readQueue(userId);
  return update(local => reconcile(server.game, local, queue.runs, queue.cafeDirty));
}
/**
 * Shows a just-queued run on the device straight away (the next level opens offline) and returns the reward it should
 * earn once settled. The run must already be in the queue, so a crash after this never loses it.
 */
export async function applyPending(userId: string, run: PendingRun, update: GameUpdate) {
  const queue = await readQueue(userId);
  let reward: ReturnType<typeof applyResult>["reward"] | null = null;
  const ok = await update(local => {
    const others = queue.runs.filter(r => r.id !== run.id), base = lastServer?.userId === userId ? reconcile(lastServer.game, local, others, queue.cafeDirty) : local;
    const next = applyRun(base, run.setup, run.result);
    reward = next.reward;
    return next.game;
  });
  return ok ? reward : null;
}

// ---------- background sync requests ----------
let requester: (() => void) | null = null;
export function setSyncRequester(run: (() => void) | null) { requester = run; }
export function requestGameSync() { requester?.(); }

// ---------- staff switch ----------
const statusKey = "@quintaste/game-status-v1";
let enabled = true, loaded = false;
const listeners = new Set<() => void>();
function setEnabled(on: boolean) { if (on === enabled) return; enabled = on; listeners.forEach(l => l()); }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
/** Reads the `games` control. Offline, the last known answer stands (on by default, as the game is live). */
export async function refreshGameStatus() {
  if (!loaded) { loaded = true; try { const saved = await AsyncStorage.getItem(statusKey); if (saved === "off") setEnabled(false); } catch { /* default stays */ } }
  const on = await fetchGameStatus();
  if (on === null) return enabled;
  setEnabled(on);
  try { await AsyncStorage.setItem(statusKey, on ? "on" : "off"); } catch { /* next read retries */ }
  return on;
}
/** True unless staff have switched the game off. Refreshes on mount. */
export function useGameSwitch() {
  const on = useSyncExternalStore(subscribe, () => enabled, () => enabled);
  useEffect(() => { void refreshGameStatus(); }, []);
  return on;
}
