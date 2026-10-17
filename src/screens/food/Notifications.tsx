import { usePristineDraft } from "../../hooks/usePristineDraft";
import { useState } from "react";
import { Screen } from "../../components/Screen";
import { Row } from "../../components/PreferenceControls";
import { Card, Divider, Field, T, common } from "../../components/ui";
import { AutosaveStatus } from "../../components/AutosaveStatus";
import { InfoBox } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { TimerAlertControl } from "../../components/food/TimerAlertControl";

export function NotificationChoicesScreen() {
  const { doc, update, readable, saving } = useFood(), { theme } = usePreferences();
  const [draft, setDraft] = usePristineDraft(doc.notifications), [error, setError] = useState("");
  const change = (next: Partial<typeof draft>) => {
    setDraft({ ...draft, ...next });
    if (!readable) return;
    void update(current => ({ ...current, notifications: { ...current.notifications, ...next } }));
  };
  const time = (key: "quietStart" | "quietEnd", value: string) => {
    setDraft({ ...draft, [key]: value });
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) { setError(""); change({ [key]: value }); }
  };
  return <Screen title="Notifications" >
    <AutosaveStatus saving={saving} />
    <TimerAlertControl />
    <InfoBox title="Online Updates" text="The choices below are saved for future delivery. Case, Saved and marketing notifications are not connected." />
    <Card>
      <Row label="Case Updates" icon="file-tray-outline" value={draft.cases} disabled={!readable} onToggle={cases => change({ cases })} /><Divider />
      <Row label="Saved Item Updates" icon="bookmark-outline" value={draft.saved} disabled={!readable} onToggle={saved => change({ saved })} />
    </Card>
    <Card style={common.stack}><T variant="subtitle" accessibilityRole="header">Quiet Hours</T>
      <Field label="Start (24-Hour Time)" placeholder="22:00" maxLength={5} editable={readable} value={draft.quietStart} onChangeText={value => time("quietStart", value)} onBlur={() => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietStart)) setError("Enter a valid start time, such as 22:00."); }} />
      <Field label="End (24-Hour Time)" placeholder="08:00" maxLength={5} editable={readable} value={draft.quietEnd} onChangeText={value => time("quietEnd", value)} onBlur={() => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietEnd)) setError("Enter a valid end time, such as 08:00."); }} />
      <T variant="small" muted>Stored for future delivery. These hours do not pause cooking timers.</T></Card>
    <Card><Row label="Marketing Suggestions" icon="megaphone-outline" value={draft.marketing} disabled={!readable} onToggle={marketing => change({ marketing })} /></Card>
    {!!error && <T color={theme.error}>{error}</T>}
  </Screen>;
}
