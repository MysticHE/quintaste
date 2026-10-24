import type en from "../en/social";
import parts from "./social-parts";
import screens from "./social-screens";
import vocab from "./social-vocab";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...vocab, ...screens, ...parts };
export default zh;
