import type en from "../en/game";
import cafe from "./game-cafe";
import lotus from "./game-lotus";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...cafe, ...lotus };
export default zh;
