import type en from "../en/me";
import account from "./me-account";
import settings from "./me-settings";
import walkin from "./me-walkin";

/** 简体中文 messages; the type keeps every English key covered. */
const zh: typeof en = { ...account, ...settings, ...walkin };
export default zh;
