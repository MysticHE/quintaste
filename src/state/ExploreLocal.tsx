import { createContext, useCallback, useContext, useState, type PropsWithChildren } from "react";
import { useNetworkState } from "expo-network";
import { useFood } from "./Food";
import { useExploreCases } from "../hooks/useExploreCases";
import { eraseLocalExplore, completeLocalExploreErase } from "../utils/local-explore-api";

function useLocalServices() {
  const { owner, doc } = useFood(), network = useNetworkState(), [paused, setPaused] = useState(false);
  // Offline only when the phone has no connection at all. Android's "internet reachable" needs its own connectivity check to pass,
  // which fails behind some VPNs, Private DNS settings and Wi-Fi networks that work fine, and it then blocked every load.
  const offline = network.isConnected === false;
  const cases = useExploreCases(offline || paused);
  const { cancel: cancelCases } = cases;
  const eraseServer = useCallback(async () => {
    setPaused(true); cancelCases();
    try {
      const data = doc.exploreLocal;
      const hasServerRecords = data.receipts.length > 0 || data.participation !== null
        || data.pendingWithdrawals.length > 0 || data.drafts.some(draft => draft.delivery === "queued");
      if (__DEV__ || hasServerRecords) await eraseLocalExplore(owner, hasServerRecords);
      return true;
    }
    catch { setPaused(false); return false; }
  }, [owner, doc.exploreLocal, cancelCases]);
  return { offline, cases, eraseServer, completeErase: () => completeLocalExploreErase(owner), resume: () => setPaused(false) };
}
const Context = createContext<ReturnType<typeof useLocalServices> | null>(null);
function LocalScope({ children }: PropsWithChildren) {
  return <Context.Provider value={useLocalServices()}>{children}</Context.Provider>;
}
export function ExploreLocalProvider({ children }: PropsWithChildren) {
  const { owner } = useFood(); return <LocalScope key={owner}>{children}</LocalScope>;
}
export function useExploreLocal() {
  const value = useContext(Context); if (!value) throw new Error("ExploreLocalProvider is required"); return value;
}
