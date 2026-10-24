import type { Vars } from "..";
import parts from "./cook-parts";
import screens from "./cook-screens";
import vocab from "./cook-vocab";

/** English messages for Cook, split by screens, building blocks and vocabulary. Add each key to the matching ../zh/cook-*.ts. */
const en = { ...screens, ...parts, ...vocab } satisfies Record<string, string | ((vars: Vars) => string)>;
export type CookKey = Extract<keyof typeof en, string>;
export default en;
