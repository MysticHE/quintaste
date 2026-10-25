import assert from 'node:assert/strict';
import { createWalkInState, walkInKey } from '../src/services/walk-in-state';

async function run() {
  const saved = new Map<string, string>();
  const storage = { getItem: async (key: string) => saved.get(key) ?? null, setItem: async (key: string, value: string) => { saved.set(key, value); } };
  const fresh = createWalkInState(storage);
  assert.equal(await fresh.shouldShow(), true);
  fresh.reachedSignIn();
  assert.equal(await fresh.shouldShow(), false);
  assert.equal(saved.has(walkInKey), false, 'swiping is not successful authentication');
  assert.equal(await createWalkInState(storage).shouldShow(), true, 'an unsigned fresh launch still introduces the app');
  await fresh.complete();
  assert.equal(await createWalkInState(storage).shouldShow(), false, 'completion survives a new process and sign-out');

  let finishRead!: (value: string | null) => void;
  const race = createWalkInState({ ...storage, getItem: () => new Promise(resolve => { finishRead = resolve; }) });
  const initialRead = race.shouldShow();
  await race.complete();
  finishRead(null);
  assert.equal(await initialRead, false, 'a stale read cannot overwrite successful sign-in');

  let writes = 0;
  const unavailable = createWalkInState({ getItem: async () => { throw new Error('unavailable'); }, setItem: async () => { if (++writes === 1) throw new Error('full'); } });
  assert.equal(await unavailable.shouldShow(), true, 'storage failure must not block the flow');
  await assert.rejects(unavailable.complete());
  assert.equal(await unavailable.shouldShow(), false, 'failed persistence still dismisses the current session');
  await unavailable.complete();
  assert.equal(writes, 2, 'a later verified session retries persistence');
  console.log('Walk-in state: first visit, swipe-only, restart, successful sign-in, read race and storage recovery passed.');
}
void run();
