import { Screen } from "../../components/Screen";
import { TimerAlertControl } from "../../components/food/TimerAlertControl";

/**
 * Only alerts QuinTaste actually delivers: cooking timers on this phone. Case, saved-item and marketing channels
 * (and quiet hours) stay stored in `doc.notifications` but are not shown until something sends them.
 */
export function NotificationChoicesScreen() {
  return <Screen title="Notifications">
    <TimerAlertControl />
  </Screen>;
}
