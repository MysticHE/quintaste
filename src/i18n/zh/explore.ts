import type en from "../en/explore";
import logic from "./explore-logic";
import parts from "./explore-parts";
import screens from "./explore-screens";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...logic, ...parts, ...screens };
export default zh;
