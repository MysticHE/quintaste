export type AreaLayer = "home" | "work";
export type AreaBand = "10+" | "20+" | "50+" | "100+";
export type AreaCount = { area: string; band: AreaBand };
/** Latest weekly snapshot; areas under 10 eligible accounts are absent (not disclosed), never zero. */
export type AreaSnapshot = { week: string | null; publishedAt: string | null; home: AreaCount[]; work: AreaCount[] };
export type MyArea = { area: string; joinedAt: string } | null;
export type MyAreas = { home: MyArea; work: MyArea };
