/** Device-level presentation state only. This never grants account access. */
export const walkInKey = '@quintaste/walk-in-complete-v1';
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> };

export function createWalkInState(storage: Storage) {
  let complete = false;
  let reachedSignIn = false;
  // Whether the flag is known to be on the device already, so it is never written twice.
  let stored = false;
  let saving: Promise<unknown> | undefined;
  async function shouldShow() {
    if (complete || reachedSignIn) return false;
    // Unavailable storage must never prevent someone signing in.
    const saved = await storage.getItem(walkInKey).catch(() => null);
    stored ||= saved === '1';
    complete ||= stored;
    return !complete && !reachedSignIn;
  }
  async function finish() {
    // Set memory first: a pending initial read or failed write cannot restore the gallery.
    complete = true;
    reachedSignIn = true;
    if (stored) return;
    saving = (saving ?? Promise.resolve()).catch(() => {}).then(() => storage.setItem(walkInKey, '1')).then(() => { stored = true; });
    await saving;
  }
  return {
    shouldShow,
    reachedSignIn() { reachedSignIn = true; },
    complete: finish,
    /** A signed-in account. A session restored on a later launch finds the flag already saved and writes nothing. */
    async signedIn() { await shouldShow(); await finish(); },
  };
}
