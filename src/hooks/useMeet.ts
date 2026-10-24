import { useLanguage, useT } from "../i18n";
import { useFood } from "../state/Food";
import { usePreferences } from "../state/Preferences";
import { reduceMeet, type MeetAction } from "../state/meet-actions";
/** Social settings kept on this device: browse filters, the observance chip and plan reminders. */
export function useMeet() {
  const food = useFood(), { setNotice } = usePreferences(), t = useT("social"), language = useLanguage();
  const commit = async (action: MeetAction) => {
    if (!food.readable) { setNotice({ text: t("collectionLoading"), error: true }); return false; }
    try { return await food.update(doc => ({ ...doc, social: { ...doc.social, network: reduceMeet(doc.social.network, action, language) } })); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : t("changeNotSaved"), error: true }); return false; }
  };
  return { network: food.doc.social.network, commit, ready: food.ready && food.readable };
}
