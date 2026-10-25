import account from "./me-account";
import settings from "./me-settings";
import walkin from "./me-walkin";

/** English messages for this area, split by surface. Add a key to the matching file and the same key in ../zh/. */
const en = { ...account, ...settings, ...walkin };
export default en;
