import logic from "./explore-logic";
import parts from "./explore-parts";
import screens from "./explore-screens";

/** English messages for Explore, places, menus, Saved and Location. Add a key to one part and the same key in ../zh. */
const en = { ...logic, ...parts, ...screens };
export default en;
