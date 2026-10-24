import type en from "../en/market";
import buy from "./market-buy";
import sell from "./market-sell";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...buy, ...sell };
export default zh;
