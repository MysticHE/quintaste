import { createContext, useContext, type PropsWithChildren } from "react";
import { typeScale } from "../theme/tokens";
// Every route shares the same mobile control density, including root-stack screens.
const Density = createContext(true);
export function CompactUI({ children }: PropsWithChildren) { return <Density.Provider value>{children}</Density.Provider>; }
export function useCompactUI() { return useContext(Density); }
export const compactType = typeScale;
