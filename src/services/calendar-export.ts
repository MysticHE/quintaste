import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { translate } from "../i18n";
import { calendarFile, calendarFileName, type CalendarEvent } from "../utils/calendar";
import { savedLanguage } from "./saved-language";

/** Writes the plan to a cache file and opens the share sheet, so the user chooses a calendar app. */
export async function exportCalendarEvent(event: CalendarEvent) {
  const language = await savedLanguage();
  if (!(await Sharing.isAvailableAsync())) throw new Error(translate(language, "social", "sharingUnavailableDevice"));
  const file = new File(Paths.cache, calendarFileName(event.title));
  file.create({ overwrite: true });
  file.write(calendarFile(event));
  await Sharing.shareAsync(file.uri, { mimeType: "text/calendar", UTI: "public.calendar-event", dialogTitle: translate(language, "social", "calendarDialogTitle") });
}
