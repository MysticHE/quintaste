import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Button, T } from "../../components/ui";
import { Chip } from "../../components/food/Controls";
import { useFood } from "../../state/Food";
import { usePreferences } from "../../state/Preferences";
import { foodDocumentByteLimit, removeCollectionPhotos, utf8Bytes } from "../../state/food-capacity";
import { readFoodDocument } from "../../state/food-schema";
import { useScopedValue } from "../../hooks/useScopedValue";

export function StorageCleanupScreen() {
  const { doc, owner, update, readable, saving } = useFood(), { setNotice } = usePreferences();
  const [selected, setSelected] = useScopedValue<string[]>(owner, []), [busy, setBusy] = useState(false);
  const rows = [
    ...doc.recipes.drafts.filter(d => d.photo || d.steps.some(s => s.photo)).map(d => ({ key: "recipe:" + d.id, label: d.title || "Untitled recipe", kind: "Recipe" })),
    ...doc.market.listings.filter(d => Object.values(d.photos).some(Boolean)).map(d => ({ key: "market:" + d.id, label: d.name || "Untitled listing", kind: "Listing" })),
  ];
  const next = useMemo(() => readFoodDocument(removeCollectionPhotos(doc, selected)), [doc, selected]);
  const bytes = utf8Bytes(JSON.stringify(next)), withinLimit = bytes <= foodDocumentByteLimit;
  const chosen = rows.filter(row => selected.includes(row.key)).length;
  const remove = async () => {
    if (!readable || saving || busy || !chosen || !withinLimit) return;
    setBusy(true);
    try {
      if (await update(current => removeCollectionPhotos(current, selected))) {
        setSelected([]); setNotice({ text: "Selected photos removed. Recipes and listing details kept." });
      }
    } finally { setBusy(false); }
  };
  return <Screen title="Storage" backTo="/account">
    <T variant="small" muted>Select photos to remove. Recipes and text stay; selected listings return to drafts.</T>
    {rows.map(row => <Chip key={row.key} label={row.label + " · " + row.kind} role="checkbox" selected={selected.includes(row.key)} icon={selected.includes(row.key) ? "checkmark-circle-outline" : "ellipse-outline"}
      disabled={!readable || busy || saving} onPress={() => setSelected(selected.includes(row.key) ? selected.filter(key => key !== row.key) : [...selected, row.key])} />)}
    <T variant="small" accessibilityLiveRegion="polite">{Math.ceil(bytes / 1000)} / {foodDocumentByteLimit / 1000} KB{withinLimit ? "" : " · Select more photos"}</T>
    {chosen === rows.length && !withinLimit && <>
      <T>Photos alone cannot free enough space. Manage or delete this collection in Privacy.</T>
      <Button label="Privacy" variant="link" onPress={() => router.push("/privacy")} />
    </>}
    <Button label="Remove Selected Photos" variant="secondary" disabled={!readable || saving || busy || !chosen || !withinLimit} onPress={() => void remove()} />
  </Screen>;
}
