import { useState } from "react";
import { Button, Field, T, common } from "../ui";
import { View } from "react-native";
import { useFood } from "../../state/Food";
import { useExploreCollection } from "../../hooks/useExploreCollection";
import { usePreferences } from "../../state/Preferences";
import { useT } from "../../i18n";

export function SavedPlaceLabel({ id }: { id: string }) {
  const { owner } = useFood(); return <SavedPlaceLabelContent key={owner + id} id={id} />;
}
function SavedPlaceLabelContent({ id }: { id: string }) {
  const { doc, readable } = useFood(), { commit } = useExploreCollection(), { theme } = usePreferences(), t = useT("explore");
  const [label, setLabel] = useState(doc.exploreLocal.labels[id] ?? ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const save = async () => {
    if (label.trim() && !doc.exploreLocal.labels[id] && Object.keys(doc.exploreLocal.labels).length >= 500) { setError(t("labelLimit")); return; }
    setBusy(true); setError("");
    try {
      if (!await commit(value => {
        const labels = { ...value.labels }; if (label.trim()) labels[id] = label.trim(); else delete labels[id];
        return { ...value, labels };
      })) setError(t("labelFailed"));
    } finally { setBusy(false); }
  };
  return <View style={common.stack}>
    <Field label={t("privateLabel")} placeholder={t("privateLabelPlaceholder")} value={label} onChangeText={setLabel} maxLength={80} style={{ minHeight: 48 }} />
    <Button label={t("savePrivateLabel")} variant="secondary" loading={busy} disabled={!readable} onPress={() => void save()} />
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </View>;
}
