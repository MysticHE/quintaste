import { useState } from "react";
import { Button, T } from "../ui";
import { Action } from "../Actions";
import { MarketModal } from "../market/MarketChrome";
import { ListGroup, ListItem, RowIcon, ThemedSwitch } from "../GroupedList";
import { ensureMember, useMember } from "../CommunityGate";
import { invalidate, useRemote } from "../../hooks/useRemote";
import { usePreferences } from "../../state/Preferences";
import { joinArea, leaveArea, myAreas } from "../../services/areas-api";
import { ApiError } from "../../services/community-api";
import { planningAreaByCode, planningAreaFor } from "../../utils/planning-area";
import type { AreaLayer } from "../../types/areas";
import type { SearchPoint } from "../../types/location-search";

/**
 * "Count me in" for a saved Home or Work place. The planning area is worked out on the device;
 * only its code is sent. Joining needs one confirmation; leaving applies from the next weekly update.
 */
export function AreaParticipationRow({ layer, point }: { layer: AreaLayer; point?: SearchPoint }) {
  const member = useMember(), { setNotice } = usePreferences();
  const remote = useRemote(member.member ? "/api/areas/me" : null, myAreas);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false);
  const computed = point ? planningAreaFor(point.latitude, point.longitude) : undefined;
  const current = remote.data?.[layer], joined = current ? planningAreaByCode.get(current.area) : undefined, shown = joined ?? computed;
  if (!member.enabled || !shown || remote.error?.code === "SERVICE_PAUSED") return null;
  const run = async (task: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await task(); invalidate("/api/areas"); setNotice({ text: done }); return true; }
    catch (error) { setNotice({ text: error instanceof ApiError ? error.message : "That did not save. Try again.", error: true }); return false; }
    finally { setBusy(false); }
  };
  const toggle = (on: boolean) => {
    if (!ensureMember(member, "/private-places")) return;
    if (on) setConfirm(true); else void run(() => leaveArea(layer), "Removed from the next weekly update");
  };
  return <>
    <ListGroup>
      <ListItem title="Count Me In" subtitle={shown.name} leading={<RowIcon name="people-outline" />}
        trailing={<ThemedSwitch label={"Count me in for " + shown.name} value={!!current} disabled={busy || member.member && remote.data === undefined} onChange={toggle} />} />
      {joined && computed && joined.code !== computed.code && <ListItem title={"Update To " + computed.name} leading={<RowIcon name="swap-horizontal-outline" tone="muted" />}
        onPress={() => { if (!busy) void run(() => joinArea(layer, computed.code), "Area updated to " + computed.name); }} />}
    </ListGroup>
    {computed && <MarketModal visible={confirm} onClose={() => setConfirm(false)} label={"Count Me In For " + computed.name + "?"}>
      <T>Only the planning area is shared, never your address. Areas with 10 or more members get their menus checked first and gathering suggestions. Turn it off anytime.</T>
      <Action label="Count Me In" run={async () => { const okay = await run(() => joinArea(layer, computed.code), "You're counted in " + computed.name); if (okay) setConfirm(false); return okay; }} />
      <Button label="Not Now" variant="link" onPress={() => setConfirm(false)} />
    </MarketModal>}
  </>;
}
