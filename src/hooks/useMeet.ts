import { useFood } from "../state/Food";
import { usePreferences } from "../state/Preferences";
import { reduceMeet, type MeetAction } from "../state/meet-actions";
/** Social settings kept on this device: browse filters, the observance chip and plan reminders. */
export function useMeet() {
  const food = useFood(), { setNotice } = usePreferences();
  const commit = async (action: MeetAction) => {
    if (!food.readable) { setNotice({ text: "Wait for your collection to load or retry storage.", error: true }); return false; }
    try { return await food.update(doc => ({ ...doc, social: { ...doc.social, network: reduceMeet(doc.social.network, action) } })); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "This change could not be saved.", error: true }); return false; }
  };
  return { network: food.doc.social.network, commit, ready: food.ready && food.readable };
}
