import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { Screen } from "../../components/Screen";
import { Button, Card, T, common } from "../../components/ui";
import { CaseFormFields } from "../../components/discovery/CaseFormFields";
import { useFood, localId } from "../../state/Food";
import { useExploreLocal } from "../../state/ExploreLocal";
import { usePreferences } from "../../state/Preferences";
import { caseTopics } from "../../config/explore-local";
import type { CaseDraft, CaseKind } from "../../types/explore-local";
import { caseContentProblem, emptyMenuChange } from "../../utils/menu-correction";
import { MenuCorrectionSummary } from "../../components/discovery/MenuCorrectionSummary";

export function ExploreContributionScreen({ placeId, target, kind, draftId, menuId, topic }: {
  placeId: string; target: string; kind: CaseKind; draftId?: string; menuId?: string; topic?: string;
}) {
  const { doc, readable } = useFood(), { cases, offline } = useExploreLocal(), { theme } = usePreferences();
  const stored = doc.exploreLocal.drafts.find(item => item.id === draftId);
  const [draft, setDraft] = useState<CaseDraft>(() => stored ?? ({ id: localId("explore"), placeId, target, kind,
    category: topic && caseTopics(kind).some(value => value === topic) ? topic : caseTopics(kind)[0],
    menuChange: kind === "correction" && (!topic || topic === "Menu") ? emptyMenuChange(menuId) : undefined,
    menuVenueId: kind === "correction" ? menuId : undefined,
    details: "", source: "", observedOn: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10), createdAt: Date.now(), updatedAt: Date.now(), delivery: "draft" }));
  const [preview, setPreview] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const pending = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const change = (patch: Partial<CaseDraft>) => { setError(""); setDraft(current => ({ ...current,
    menuVenueId: current.menuVenueId || current.menuChange?.venueId || undefined, ...patch, updatedAt: Date.now() })); };
  const validate = () => {
    const problem = caseContentProblem(draft); if (problem) return problem;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.observedOn) || !Number.isFinite(Date.parse(draft.observedOn))
      || new Date(draft.observedOn).toISOString().slice(0, 10) !== draft.observedOn
      || draft.observedOn > new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)) return "Enter a valid observation date.";
    return "";
  };
  const save = async (send: boolean) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try {
      const okay = send ? await cases.enqueue(draft) : await cases.saveDraft({ ...draft, delivery: "draft" });
      if (!alive.current) return;
      if (okay) router.replace("/cases"); else setError("Draft could not be saved. Retry.");
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  const review = async () => {
    if (pending.current) return;
    const problem = validate(); if (problem) { setError(problem); return; }
    pending.current = true; setBusy(true);
    try {
      if (await cases.saveDraft({ ...draft, delivery: "draft" })) { if (alive.current) setPreview(true); }
      else if (alive.current) setError("Your place drafts are full or could not be saved. Remove a draft or retry.");
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  };
  if (draftId && (!stored || stored.delivery === "queued")) return <Screen title="Place Submission">
    <T muted>{stored ? "Submission queued" : "This draft is no longer available"}</T>
    <Button label="My Cases" onPress={() => router.replace("/cases")} />
  </Screen>;
  return <Screen title={preview ? "Review Submission" : kind === "report" ? "Report A Concern" : "Suggest A Correction"}>
    <View style={common.stack}><T variant="subtitle">{draft.target}</T><T variant="caption" muted>Local review</T></View>
    {preview ? <>
      <Card style={common.stack}><T style={common.bold}>{draft.category}</T><MenuCorrectionSummary change={draft.menuChange} />
        {!!draft.details && <T selectable>{draft.details}</T>}
        {!!draft.source && <T variant="small" muted>{draft.source}</T>}<T variant="small" muted>{draft.observedOn}</T>
        {!!draft.photoUri && <Image source={{ uri: draft.photoUri }} accessibilityLabel="Evidence to submit" style={{ width: "100%", height: 190, borderRadius: 16 }} resizeMode="contain" />}
      </Card>
      <T variant="small" muted>Local review. Public details stay unchanged.</T>
      <Button label={offline ? "Queue Submission" : "Submit"} icon="send-outline" loading={busy} disabled={!readable || !__DEV__} onPress={() => void save(true)} />
      <Button label="Edit Submission" variant="secondary" disabled={busy} onPress={() => setPreview(false)} />
    </> : <>
      <CaseFormFields draft={draft} change={change} error={setError} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={common.flex}><Button label="Save Draft" variant="secondary" disabled={!readable} loading={busy} onPress={() => void save(false)} /></View>
        <View style={common.flex}><Button label="Review" disabled={!readable || busy} onPress={() => void review()} /></View>
      </View>
    </>}
    {!!error && <T variant="small" color={theme.error} accessibilityLiveRegion="polite">{error}</T>}
  </Screen>;
}
