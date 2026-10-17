import { useState } from "react";
import { Platform } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Field, T } from "../../components/ui";
import { Chip, Chips } from "../../components/food/Controls";
import { PilotCataloguePanel } from "../../components/discovery/PilotCataloguePanel";
import { LocalReviewCase } from "../../components/discovery/LocalReviewCase";
import { useLocalReviewQueue } from "../../hooks/useLocalReviewQueue";
import { usePreferences } from "../../state/Preferences";

export function LocalReviewScreen() {
  const [key, setKey] = useState(""), [filter, setFilter] = useState<"Open" | "All">("Open");
  const review = useLocalReviewQueue(), { theme } = usePreferences();
  const [section, setSection] = useState<"Cases" | "Pilot catalogue">("Cases");
  if (!__DEV__ || Platform.OS !== "web") return <Screen title="Local Review"><T muted>Available in the development browser</T></Screen>;
  const visible = review.items.filter(item => filter === "All" || item.status === "submitted" || item.status === "needs-information");
  return <Screen title="Local Review">
    <T variant="small" muted>Local development · public listings stay unchanged</T>
    {!review.unlocked ? <>
      <Field label="Local Review Key" value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={64} style={{ minHeight: 48 }} />
      <Button label="Unlock Local Review" loading={review.busy} disabled={!/^[a-f0-9]{64}$/.test(key)}
        onPress={() => { const value = key; setKey(""); void review.unlock(value); }} />
    </> : <>
      <Chips label="Local Review Section">{(["Cases", "Pilot catalogue"] as const).map(item => <Chip key={item} label={item} role="radio"
        selected={section === item} disabled={review.busy} onPress={() => { review.clearError(); setSection(item); }} />)}</Chips>
      {section === "Pilot catalogue" ? <PilotCataloguePanel request={review.request} busy={review.busy} /> : <>
      <Chips label="Review Queue"><Chip label="Open" role="radio" selected={filter === "Open"} onPress={() => setFilter("Open")} />
        <Chip label="All" role="radio" selected={filter === "All"} onPress={() => setFilter("All")} /></Chips>
      <Button label="Refresh Review Queue" variant="secondary" loading={review.busy} onPress={() => void review.refresh()} />
      {!visible.length && <T muted>No cases in this queue</T>}
      {visible.slice(0, 100).map(item => <LocalReviewCase key={item.caseId + "-" + item.revision} item={item} busy={review.busy}
        update={review.update} photo={review.photo} />)}
      {visible.length > 100 && <T variant="small" muted>Showing 100 of {visible.length} cases</T>}
      </>}
      <Button label="Lock Local Review" variant="link" onPress={() => { review.lock(); setSection("Cases"); }} />
    </>}
    {!!review.error && (!review.unlocked || section === "Cases") && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{review.error}</T>}
  </Screen>;
}
