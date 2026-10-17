import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "../utils/api-url";
import { readCaseReceipt } from "../utils/explore-local-schema";
import type { CaseReceipt, CaseStatus } from "../types/explore-local";

class ReviewError extends Error {}
export function useLocalReviewQueue() {
  const [unlocked, setUnlocked] = useState(false), [items, setItems] = useState<CaseReceipt[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const token = useRef(""), active = useRef<AbortController | null>(null), alive = useRef(true), generation = useRef(0);
  const lock = useCallback(() => {
    generation.current++; active.current?.abort(); active.current = null; token.current = "";
    setItems([]); setUnlocked(false); setBusy(false); setError("");
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; active.current?.abort(); active.current = null; token.current = ""; };
  }, []);
  const request = useCallback(async (method = "GET", value?: unknown, id?: string, endpoint: "review" | "catalogue" = "review") => {
    if (active.current) throw new ReviewError("Review is busy.");
    const controller = new AbortController(), attempt = generation.current;
    const valid = () => alive.current && attempt === generation.current && !controller.signal.aborted;
    active.current = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    setBusy(true); setError("");
    try {
      const response = await fetch(apiUrl("/api/local-explore/" + endpoint + (id ? "?id=" + encodeURIComponent(id) : "")), {
        method, signal: controller.signal, cache: "no-store",
        headers: { "Content-Type": "application/json", "X-QuinTaste-Client": "explore", Authorization: "Bearer " + token.current },
        ...(value ? { body: JSON.stringify(value) } : {}),
      });
      if (!response.ok) throw new ReviewError(response.status === 409 ? (endpoint === "catalogue" ? "Catalogue entry changed. Refresh before reviewing." : "Case changed. Refresh before reviewing.")
        : "Review unavailable. Check the key or connection.");
      const body = await response.json();
      if (!valid()) throw new ReviewError("Review cancelled.");
      return { body, valid };
    } catch (problem) {
      if (alive.current && attempt === generation.current && active.current === controller)
        setError(problem instanceof ReviewError ? problem.message : "Review unavailable. Retry.");
      throw problem;
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; if (alive.current) setBusy(false); }
    }
  }, []);
  const refresh = useCallback(async () => {
    try {
      const { body, valid } = await request();
      const found = Array.isArray(body.cases) ? body.cases.map(readCaseReceipt) : null;
      if (!found || found.some((item: CaseReceipt | null) => !item)) {
        if (valid()) setError("Review response unavailable. Retry."); return false;
      }
      if (valid()) { setItems(found); setUnlocked(true); return true; }
    } catch { /* The request owns the controlled error state. */ }
    return false;
  }, [request]);
  const unlock = async (value: string) => {
    if (!/^[a-f0-9]{64}$/.test(value) || active.current) return false;
    token.current = value; return refresh();
  };
  const update = async (item: CaseReceipt, status: CaseStatus, reason: string) => {
    try {
      const { body, valid } = await request("PATCH", { caseId: item.caseId, revision: item.revision, status, reason });
      const receipt = readCaseReceipt(body.case);
      if (!receipt) { if (valid()) setError("Review response unavailable. Refresh."); return false; }
      if (valid()) { setItems(current => current.map(value => value.caseId === receipt.caseId ? receipt : value)); return true; }
    } catch { /* Keep the review form and its reason intact for retry. */ }
    return false;
  };
  const photo = async (id: string) => {
    try {
      const { body, valid } = await request("GET", undefined, id);
      return valid() && typeof body.case?.photoUri === "string" ? body.case.photoUri : undefined;
    } catch { return undefined; }
  };
  return { items, unlocked, busy, error, lock, refresh, unlock, update, photo, request, clearError: () => setError("") };
}
