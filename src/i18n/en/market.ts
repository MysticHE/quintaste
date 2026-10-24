import type { Vars } from "..";
import buy from "./market-buy";
import sell from "./market-sell";

/** English messages for this area, in two parts. Add a key to a part here and the same key to the matching ../zh part. */
const en = { ...buy, ...sell } satisfies Record<string, string | ((vars: Vars) => string)>;
export type MarketKey = Extract<keyof typeof en, string>;
/** `useT("market")`, for Market helpers that run outside React. */
export type MarketText = (key: MarketKey, vars?: Vars) => string;
export default en;
