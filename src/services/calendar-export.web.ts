import { calendarFile, calendarFileName, type CalendarEvent } from "../utils/calendar";

/** Browsers download the .ics file; opening it adds the plan to the user's calendar app. */
export async function exportCalendarEvent(event: CalendarEvent) {
  const url = URL.createObjectURL(new Blob([calendarFile(event)], { type: "text/calendar;charset=utf-8" }));
  try {
    const link = document.createElement("a");
    link.href = url; link.download = calendarFileName(event.title);
    document.body.appendChild(link); link.click(); link.remove();
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
