import { loadIntroSettings } from "../components/splash/settings";
import { resolveLanguage, translate, type Language, type Vars } from "../i18n";
import type { Namespace } from "../i18n/messages";

/** The interface language for text written outside React (notifications, service errors): this device's copy of Me > Language. */
export async function savedLanguage(): Promise<Language> {
  return resolveLanguage((await loadIntroSettings()).language);
}
/** One message in the saved language. */
export async function savedText<N extends Namespace>(namespace: N, key: Parameters<typeof translate<N>>[2], vars?: Vars) {
  return translate(await savedLanguage(), namespace, key, vars);
}
