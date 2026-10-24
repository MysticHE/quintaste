import { useEffect, useRef, useState } from "react";
import { Button, T, type IconName } from "./ui";
import { Chip } from "./food/Controls";
import { MarketModal } from "./market/MarketChrome";
import { usePreferences } from "../state/Preferences";
import { useT } from "../i18n";
/** Runs an async task with a busy flag; failures surface as a notice instead of an unhandled rejection. */
function useRun() {
  const [busy, setBusy] = useState(false), mounted = useRef(true), { setNotice } = usePreferences(), t = useT("common");
  useEffect(() => () => { mounted.current = false; }, []);
  const start = (run: () => Promise<unknown>) => { setBusy(true); void run().catch(error => setNotice({ text: error instanceof Error ? error.message : t("actionFailed"), error: true })).finally(() => { if (mounted.current) setBusy(false); }); };
  return { busy, start };
}
export function Action({ label, run, secondary = false, disabled = false, icon }: { label: string; run: () => Promise<unknown>; secondary?: boolean; disabled?: boolean; icon?: IconName }) {
  const { busy, start } = useRun();
  return <Button label={label} icon={icon} variant={secondary ? "secondary" : "primary"} disabled={disabled} loading={busy} onPress={() => start(run)} />;
}
/** Compact secondary action for a row of plan tools. */
export function ActionChip({ label, icon, run, disabled = false }: { label: string; icon: IconName; run: () => Promise<unknown>; disabled?: boolean }) {
  const { busy, start } = useRun();
  return <Chip label={label} icon={icon} compact disabled={disabled || busy} onPress={() => start(run)} />;
}
export function Confirm({ label, text, action, run, link = false }: { label: string; text: string; action: string; run: () => Promise<unknown>; link?: boolean }) {
  const [show, setShow] = useState(false), t = useT("common");
  return <><Button label={label} variant={link ? "link" : "secondary"} onPress={() => setShow(true)} /><MarketModal visible={show} onClose={() => setShow(false)} label={label}>
    <T>{text}</T><Action label={action} run={async () => { const okay = await run(); if (okay) setShow(false); }} />
    <Button label={t("keep")} variant="link" onPress={() => setShow(false)} /></MarketModal></>;
}
