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
import { useT } from "../../i18n";

export function StorageCleanupScreen() {
  const { doc, owner, update, readable, saving } = useFood(), { setNotice } = usePreferences(), t = useT("me");
  const [selected, setSelected] = useScopedValue<string[]>(owner, []), [busy, setBusy] = useState(false);
  const rows = [
    ...doc.recipes.drafts.filter(d => d.photo || d.steps.some(s => s.photo)).map(d => ({ key: "recipe:" + d.id, label: d.title || t("untitledRecipe"), kind: t("kindRecipe") })),
    ...doc.market.listings.filter(d => Object.values(d.photos).some(Boolean)).map(d => ({ key: "market:" + d.id, label: d.name || t("untitledListing"), kind: t("kindListing") })),
  ];
  const next = useMemo(() => readFoodDocument(removeCollectionPhotos(doc, selected)), [doc, selected]);
  const bytes = utf8Bytes(JSON.stringify(next)), withinLimit = bytes <= foodDocumentByteLimit;
  const chosen = rows.filter(row => selected.includes(row.key)).length;
  const remove = async () => {
    if (!readable || saving || busy || !chosen || !withinLimit) return;
    setBusy(true);
    try {
      if (await update(current => removeCollectionPhotos(current, selected))) {
        setSelected([]); setNotice({ text: t("photosRemoved") });
      }
    } finally { setBusy(false); }
  };
  return <Screen title={t("storage")} backTo="/account">
    <T variant="small" muted>{t("storageNote")}</T>
    {rows.map(row => <Chip key={row.key} label={row.label + " · " + row.kind} role="checkbox" selected={selected.includes(row.key)} icon={selected.includes(row.key) ? "checkmark-circle-outline" : "ellipse-outline"}
      disabled={!readable || busy || saving} onPress={() => setSelected(selected.includes(row.key) ? selected.filter(key => key !== row.key) : [...selected, row.key])} />)}
    <T variant="small" accessibilityLiveRegion="polite">{t("storageUsage", { used: Math.ceil(bytes / 1000), limit: foodDocumentByteLimit / 1000 })}{withinLimit ? "" : t("selectMorePhotos")}</T>
    {chosen === rows.length && !withinLimit && <>
      <T>{t("photosNotEnough")}</T>
      <Button label={t("privacy")} variant="link" onPress={() => router.push("/privacy")} />
    </>}
    <Button label={t("removeSelectedPhotos")} variant="secondary" disabled={!readable || saving || busy || !chosen || !withinLimit} onPress={() => void remove()} />
  </Screen>;
}
