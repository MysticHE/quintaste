import { createContext, useContext, type PropsWithChildren } from "react";
import { useFood } from "./Food";
import { useAuth } from "./Auth";
import { useCatalogueDiscovery } from "../hooks/useCatalogueDiscovery";

const Context = createContext<ReturnType<typeof useCatalogueDiscovery> | null>(null);
function DiscoveryScope({ children }: PropsWithChildren) {
  return <Context.Provider value={useCatalogueDiscovery()}>{children}</Context.Provider>;
}
export function DiscoveryProvider({ children }: PropsWithChildren) {
  const { owner } = useFood(), { user } = useAuth();
  return <DiscoveryScope key={owner + ":" + (user?.id ?? "anonymous")}>{children}</DiscoveryScope>;
}
export function useDiscovery() {
  const value = useContext(Context);
  if (!value) throw new Error("DiscoveryProvider is required");
  return value;
}
