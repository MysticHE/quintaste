import type { Vars } from "..";
import parts from "./social-parts";
import screens from "./social-screens";
import vocab from "./social-vocab";

/** English messages for this area, split by screens, building blocks and shared vocabulary. Add a key in the part file and its ../zh twin. */
const en = { ...vocab, ...screens, ...parts } satisfies Record<string, string | ((vars: Vars) => string)>;
export default en;
