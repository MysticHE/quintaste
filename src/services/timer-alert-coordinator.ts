import type { CookingTimer } from '../types/food';
import type { TimerAlert, TimerAlertAdapter } from './timer-alerts';
import { clearOtherTimerOwners, syncTimerAlerts, timerAlertPrefix } from './timer-alert-sync';

export const timerOwnerKey = (owner: string, accountId?: string) => accountId ? 'account-' + accountId : owner;

// Native notification operations cannot be aborted. All providers share one
// queue; an obsolete in-flight schedule is removed before its successor runs.
export function createTimerAlertCoordinator(adapter: TimerAlertAdapter) {
  let queue: Promise<unknown> = Promise.resolve();
  let active: symbol | undefined;
  const enqueue = <T,>(work: () => Promise<T>) => {
    const result = queue.catch(() => {}).then(work);
    queue = result;
    return result;
  };
  return {
    claim(owner: string) {
      const token = Symbol(owner);
      active = token;
      let revision = 0;
      return {
        reconcile(timers: CookingTimer[] | null, enabled: boolean, plans: TimerAlert[] = []) {
          const version = ++revision;
          const current = () => active === token && version === revision;
          const stale = new Error('Obsolete timer reconciliation');
          const check = () => { if (!current()) throw stale; };
          return enqueue(async () => {
            if (!current()) return;
            const guarded: TimerAlertAdapter = {
              permission: async () => { check(); const value = await adapter.permission(); check(); return value; },
              scheduled: async () => { check(); const value = await adapter.scheduled(); check(); return value; },
              presented: async () => { check(); const value = await adapter.presented(); check(); return value; },
              cancel: async id => { check(); await adapter.cancel(id); check(); },
              dismiss: async id => { check(); await adapter.dismiss(id); check(); },
              schedule: async alert => {
                check();
                try { await adapter.schedule(alert); }
                finally {
                  if (!current()) { await adapter.cancel(alert.id); await adapter.dismiss(alert.id); }
                }
                check();
              },
            };
            try {
              const status = await guarded.permission();
              if (timers) await syncTimerAlerts(guarded, owner, timers, enabled, plans);
              else await clearOtherTimerOwners(guarded, owner);
              check();
              return status;
            } catch (error) { if (error !== stale) throw error; }
          });
        },
        dispose() {
          revision++;
          if (active === token) active = undefined;
          return enqueue(async () => {
            const prefix = timerAlertPrefix + owner + '/';
            for (const id of await adapter.scheduled()) if (id.startsWith(prefix)) await adapter.cancel(id);
            for (const id of await adapter.presented()) if (id.startsWith(prefix)) await adapter.dismiss(id);
          });
        },
      };
    },
  };
}
