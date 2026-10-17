import { communityRequest as call } from "./community-api";
import type { AreaLayer, AreaSnapshot, MyAreas } from "../types/areas";

export const areaSnapshot = (signal: AbortSignal) => call<AreaSnapshot>("/api/areas", { signal });
export const myAreas = (signal: AbortSignal) => call<MyAreas>("/api/areas/me", { signal });
export const joinArea = (layer: AreaLayer, area: string) => call<MyAreas>("/api/areas/me/" + layer, { method: "PUT", body: { area, confirmed: true } });
export const leaveArea = (layer: AreaLayer) => call<MyAreas>("/api/areas/me/" + layer, { method: "DELETE" });
