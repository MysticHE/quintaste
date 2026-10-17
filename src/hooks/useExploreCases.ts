import { useCallback } from "react";
import type { CaseDraft, CaseReceipt, CaseDetail } from "../types/explore-local";
import { useExploreCollection } from "./useExploreCollection";
import { useLocalExploreTask } from "./useLocalExploreTask";
import { useExploreSync } from "./useExploreSync";
import { localExploreRequest, LocalApiError } from "../utils/local-explore-api";
import { readCaseReceipt } from "../utils/explore-local-schema";

function receipts(value: unknown): CaseReceipt[] {
  const body = value as { cases?: unknown };
  if (!body || !Array.isArray(body.cases) || body.cases.length > 100) throw new Error("Invalid cases");
  const result = body.cases.map(readCaseReceipt);
  if (result.some(item => !item)) throw new Error("Invalid cases");
  return result as CaseReceipt[];
}
export function useExploreCases(offline: boolean) {
  const { owner, current, collection, commit, ready, readable, dirty, saving } = useExploreCollection();
  const { run, cancel, busy, error } = useLocalExploreTask(owner);
  const refresh = useCallback(() => run(async (signal, valid) => {
    const received = receipts(await localExploreRequest(owner, "cases", { signal }));
    if (!valid()) return;
    await commit(doc => ({ ...doc, receipts: received,
      drafts: doc.drafts.filter(draft => draft.delivery !== "queued" || !received.some(item => item.id === draft.id)) }));
    const queued = current.current.drafts.filter(item => item.delivery === "queued").slice(0, 10);
    for (const draft of queued) {
      if (!valid()) return;
      try {
        const body = await localExploreRequest(owner, "cases", { method: "POST", body: JSON.stringify(draft), signal });
        const receipt = readCaseReceipt(body?.case); if (!receipt) throw new Error("Invalid receipt");
        if (!valid()) return;
        await commit(doc => ({ ...doc, receipts: [receipt, ...doc.receipts.filter(item => item.caseId !== receipt.caseId)].slice(0, 100),
          drafts: doc.drafts.filter(item => item.id !== draft.id || item.delivery !== "queued") }));
      } catch (problem) {
        if (valid() && problem instanceof LocalApiError && [400, 409, 413].includes(problem.status))
          await commit(doc => ({ ...doc, drafts: doc.drafts.map(item => item.id === draft.id ? { ...item, delivery: "draft" } : item) }));
        throw problem;
      }
    }
  }), [owner, run, commit, current]);
  const wake = !dirty && !saving ? collection.drafts.filter(item => item.delivery === "queued").map(item => item.id).join("|") : "";
  useExploreSync(__DEV__ && ready && readable && !offline, wake, refresh, cancel);
  const saveDraft = useCallback(async (draft: CaseDraft) => {
    let accepted = true;
    const saved = await commit(doc => {
      accepted = (doc.drafts.length < 100 || doc.drafts.some(item => item.id === draft.id))
        && !doc.receipts.some(item => item.id === draft.id)
        && !doc.drafts.some(item => item.id === draft.id && item.delivery === "queued" && draft.delivery !== "queued");
      return accepted ? { ...doc, drafts: [draft, ...doc.drafts.filter(item => item.id !== draft.id)] } : doc;
    });
    return saved && accepted;
  }, [commit]);
  const enqueue = useCallback(async (draft: CaseDraft) => {
    if (current.current.drafts.length >= 100 && !current.current.drafts.some(item => item.id === draft.id)) return false;
    const saved = await saveDraft({ ...draft, delivery: "queued", updatedAt: Date.now() });
    if (saved && !offline) void refresh(); return saved;
  }, [current, saveDraft, offline, refresh]);
  const removeDraft = useCallback((id: string) => {
    cancel(); return commit(doc => ({ ...doc, drafts: doc.drafts.filter(item => item.id !== id) }));
  }, [cancel, commit]);
  const reply = useCallback((receipt: CaseReceipt, details: string) => run(async (signal, valid) => {
    const body = await localExploreRequest(owner, "case/" + receipt.caseId, { method: "PATCH", signal,
      body: JSON.stringify({ details, revision: receipt.revision }) });
    const updated = readCaseReceipt(body?.case); if (!updated) throw new Error("Invalid receipt");
    if (valid()) await commit(doc => ({ ...doc, receipts: doc.receipts.map(item => item.caseId === updated.caseId ? updated : item) }));
  }), [owner, run, commit]);
  const details = useCallback(async (caseId: string, signal: AbortSignal): Promise<CaseDetail> => {
    const body = await localExploreRequest(owner, "case/" + caseId, { signal }), receipt = readCaseReceipt(body?.case);
    if (!receipt) throw new Error("Case unavailable");
    return { ...receipt, photoUri: typeof body.case.photoUri === "string" ? body.case.photoUri : undefined };
  }, [owner]);
  return { refresh, cancel, busy, error, saveDraft, enqueue, removeDraft, reply, details };
}
