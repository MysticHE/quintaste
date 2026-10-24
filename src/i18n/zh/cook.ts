import type en from "../en/cook";
import parts from "./cook-parts";
import screens from "./cook-screens";
import vocab from "./cook-vocab";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...screens, ...parts, ...vocab };
export default zh;
