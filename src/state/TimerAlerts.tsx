import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { useFood } from "./Food";
import { timerAlerts, type AlertPermission } from "../services/timer-alerts";
import { createTimerAlertCoordinator, timerOwnerKey } from "../services/timer-alert-coordinator";
import type { CookingTimer } from "../types/food";
import type { PlanReminder } from "../types/meet";
import { planAlertsFor } from "../services/timer-alert-sync";
import { canScheduleTimerAlerts } from "../services/timer-alert-policy";
import { useAuth } from './Auth';
import { loadOrderReminders, orderAlertsFor, saveOrderReminders, type OrderReminder } from "../services/market-reminders";

const coordinator = createTimerAlertCoordinator(timerAlerts);

function useTimerAlertState() {
  const { doc, owner, ready, readable, dirty, update } = useFood();
  const { user } = useAuth();
  const scope = timerOwnerKey(owner, user?.id);
  const [permission, setPermission] = useState<AlertPermission>("undetermined");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0);
  const lease = useRef<ReturnType<typeof coordinator.claim> | null>(null);
  const timerKey = JSON.stringify(doc.timers), planKey = JSON.stringify(doc.social.network.reminders);
  // Market collection reminders belong to the signed-in account; null until the device copy has loaded, so nothing is cancelled early.
  const userId = user?.id ?? null, [orders, setOrders] = useState<{ userId: string | null; list: OrderReminder[] } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void loadOrderReminders(userId).then(list => { if (active) setOrders({ userId, list }); });
    return () => { active = false; };
  }, [userId]);
  const setOrderReminders = useCallback((list: OrderReminder[]) => {
    if (!userId) return;
    setOrders(current => current?.userId === userId && JSON.stringify(current.list) === JSON.stringify(list) ? current : { userId, list });
    void saveOrderReminders(userId, list).catch(() => {});
  }, [userId]);
  const orderList = !userId ? [] : orders?.userId === userId ? orders.list : null, orderKey = orderList ? JSON.stringify(orderList) : null;
  useLayoutEffect(() => {
    const claimed = coordinator.claim(scope);
    lease.current = claimed;
    return () => { lease.current = null; void claimed.dispose().catch(() => {}); };
  }, [scope]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => { if (state === "active") setRefresh(n => n + 1); });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (orderKey === null) return;
    let active = true;
    const claimed = lease.current;
    const plans = ready && readable ? [...planAlertsFor(scope, JSON.parse(planKey) as PlanReminder[]),
      ...(doc.notifications.cooking ? orderAlertsFor(scope, JSON.parse(orderKey) as OrderReminder[]) : [])] : [];
    void claimed?.reconcile(ready && readable ? JSON.parse(timerKey) as CookingTimer[] : null, doc.notifications.cooking, plans).then(status => {
      if (active && lease.current === claimed && status) { setPermission(status); setError(''); }
    }).catch(() => {
      if (active && lease.current === claimed) setError('Timer alerts could not be updated. Check notification permission in device settings, then retry.');
    });
    return () => { active = false; };
  }, [scope, ready, readable, timerKey, planKey, orderKey, doc.notifications.cooking, refresh]);
  const toggle = useCallback(async () => {
    if (busy || !readable || dirty) return;
    const captured = lease.current;
    setBusy(true); setError("");
    // Each step names its own fix: allowing notifications happens in phone settings, a failed save just needs another try.
    let step: "permission" | "save" = "permission";
    try {
      const status = doc.notifications.cooking ? permission : await timerAlerts.permission(true);
      if (!captured || lease.current !== captured) return;
      setPermission(status);
      if (!doc.notifications.cooking && !canScheduleTimerAlerts(status)) {
        // Blocked needs phone settings; a prompt that was closed (or couldn't show) can simply be tried again.
        setError(status === "denied" ? "Allow notifications for QuinTaste in phone settings, then turn this on."
          : "Notifications weren't turned on. Try again, or allow them in phone settings.");
        return;
      }
      step = "save";
      await update(current => ({ ...current, notifications: { ...current.notifications, cooking: !current.notifications.cooking } }));
      if (lease.current === captured) setRefresh(n => n + 1);
    } catch {
      if (lease.current === captured) setError(step === "permission" ? "Notifications weren't turned on. Try again, or allow them in phone settings." : "Your choice didn't save. Try again.");
    }
    finally { if (lease.current === captured) setBusy(false); }
  }, [busy, readable, dirty, doc.notifications.cooking, permission, update]);
  return { permission, error, busy, enabled: doc.notifications.cooking, toggle, retry: () => setRefresh(n => n + 1), setOrderReminders };
}
const Context = createContext<ReturnType<typeof useTimerAlertState> | null>(null);
export function TimerAlertsProvider({ children }: PropsWithChildren) {
  return <Context.Provider value={useTimerAlertState()}>{children}</Context.Provider>;
}
export function useTimerAlerts() { const value = useContext(Context); if (!value) throw new Error("TimerAlertsProvider is required"); return value; }
